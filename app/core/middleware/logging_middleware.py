"""Request/response logging middleware."""

from __future__ import annotations

import json
import logging
import socket
import time
import uuid
from collections.abc import Callable
from json.decoder import JSONDecodeError

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings
from app.core.logging_setup import LoggingContext

request_logger = logging.getLogger("debug_log")


def trim_data(data, max_length: int = 300):
    if data is None:
        return None
    try:
        if isinstance(data, (dict, list)):
            data_str = json.dumps(data, separators=(",", ":"), default=str)
        else:
            data_str = str(data)
        if len(data_str) > max_length:
            return data_str[:max_length] + "..."
        return data_str
    except Exception:
        return f"[Error serializing data: {type(data).__name__}]"


class LoggingMiddleware(BaseHTTPMiddleware):
    """Structured request/response logging with correlation IDs."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request.state.start_time = time.time()
        incoming = request.headers.get("x-request-id") or request.headers.get("traceparent")
        request.state.correlation_id = (incoming or str(uuid.uuid4())).strip()
        request.state.req_body = None
        request.state.user_email_for_logging = "Anonymous"
        request.state._exception_logged = False

        if request.method in {"POST", "PUT", "PATCH"}:
            request.state.req_body = await request.body()

        try:
            LoggingContext.set_correlation_id(request.state.correlation_id)
            LoggingContext.generate_span_id()
        except Exception as exc:
            request_logger.error("Failed to initialize LoggingContext: %s", exc, exc_info=True)

        self._set_user_context(request)

        try:
            response = await call_next(request)
        except Exception as exc:
            result = self._handle_exception(request, exc)
            if result is not None:
                LoggingContext.clear_context()
                return result
            raise

        if not getattr(request.state, "_exception_logged", False):
            log_data = self.extract_request_info(request)
            log_data.update(self.extract_response_info(request, response))
            log_data["event_type"] = "http_response"
            request_logger.info("HTTP Request completed", extra=log_data)

        LoggingContext.clear_context()
        return response

    def _set_user_context(self, request: Request) -> None:
        user = getattr(request.state, "user", None)
        if user is None:
            return
        try:
            user_email = getattr(user, "email", None) or "Anonymous"
            request.state.user_email_for_logging = user_email
            LoggingContext.set_user_context(user_email)
        except Exception as exc:
            request_logger.error("Failed to set user context: %s", exc, exc_info=True)

    def extract_request_info(self, request: Request, exception=None):
        x_forwarded_for = request.headers.get("x-forwarded-for")
        remote_address = (
            x_forwarded_for.split(",")[0].strip()
            if x_forwarded_for
            else (request.client.host if request.client else "")
        )
        headers = {
            "Content-Type": request.headers.get("content-type"),
            "User-Agent": request.headers.get("user-agent"),
        }
        context_data = LoggingContext.get_context()
        log_data = {
            **context_data,
            "service": settings.SERVICE_NAME,
            "remote_address": remote_address,
            "server_hostname": socket.gethostname(),
            "request_method": request.method,
            "request_path": str(request.url),
            "run_time": round(time.time() - request.state.start_time, 2),
            "user": getattr(request.state, "user_email_for_logging", "Anonymous"),
            "headers": headers,
            "event_type": "http_request",
            "view_func": (request.scope.get("endpoint").__name__ if request.scope.get("endpoint") else None),
        }

        if request.method in {"PUT", "POST", "PATCH"}:
            try:
                if request.state.req_body:
                    req_body = json.loads(request.state.req_body.decode("utf-8"))
                    if isinstance(req_body, dict):
                        for sensitive_key in settings.SENSITIVE_KEYS:
                            req_body.pop(sensitive_key, None)
                    log_data["request_body"] = trim_data(req_body)
                else:
                    log_data["request_body"] = None
            except Exception:
                log_data["request_body"] = "Error Parsing Request Body"
        elif request.method == "GET":
            query_params = dict(request.query_params)
            log_data["query_params"] = trim_data(query_params) if query_params else None

        return log_data

    def extract_response_info(self, request: Request, response: Response | None = None):
        log_data = {
            "correlation_id": getattr(request.state, "correlation_id", LoggingContext.get_correlation_id()),
            "user": getattr(request.state, "user_email_for_logging", "Anonymous"),
        }

        if response is None:
            return log_data

        content_type = response.headers.get("content-type", "")
        log_data["status_code"] = response.status_code

        if "application/json" in content_type and settings.ENABLE_RESPONSE_BODY_LOGGING and request.method != "GET":
            try:
                body_bytes = getattr(response, "body", None)
                if body_bytes:
                    response_body = json.loads(body_bytes.decode("utf-8"))
                    if isinstance(response_body, dict) and not isinstance(response_body.get("data"), list):
                        log_data["response_body"] = trim_data(response_body)
            except (JSONDecodeError, Exception):
                log_data["response_body"] = "Error Parsing Response Body"

        return log_data

    def _handle_exception(self, request: Request, exception: Exception):
        log_data = self.extract_request_info(request)
        log_data["error"] = str(exception)
        log_data["error_type"] = type(exception).__name__
        log_data["event_type"] = "http_exception"
        log_data.update(LoggingContext.get_context())
        log_data["user"] = getattr(request.state, "user_email_for_logging", "Anonymous")
        request_logger.exception("Unhandled Exception", extra=log_data, exc_info=True)
        request.state._exception_logged = True
        return None
