"""Reflect Access-Control-Request-Headers on preflight requests."""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class CorsReflectHeadersMiddleware(BaseHTTPMiddleware):
    """Reflects the requested headers back in the preflight response.

    Browsers reject preflight when the frontend sends headers outside the
    static CORS_ALLOW_HEADERS list. Reflecting them fixes the mismatch after
    CORSMiddleware has already run.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        if request.method != "OPTIONS":
            return response
        if not request.headers.get("access-control-request-method"):
            return response
        requested_headers = request.headers.get("access-control-request-headers")
        if not requested_headers:
            return response
        if not response.headers.get("access-control-allow-origin"):
            return response

        response.headers["access-control-allow-headers"] = requested_headers
        return response
