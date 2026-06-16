"""Retry decorator with exponential backoff."""

from __future__ import annotations

import functools
import logging
import time
from collections.abc import Callable
from typing import ParamSpec, TypeVar

P = ParamSpec("P")
R = TypeVar("R")


def retry(
    retries: int = 3,
    delay: float = 0.5,
    backoff: float = 2.0,
    exceptions: tuple[type[Exception], ...] = (Exception,),
    logger_name: str = __name__,
) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """Retry with exponential backoff. Type-safe via ParamSpec."""

    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            log = logging.getLogger(logger_name)
            for attempt in range(1, retries + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    if attempt == retries:
                        raise
                    sleep = delay * (backoff ** (attempt - 1))
                    log.warning(
                        "Attempt %d/%d failed (%s). Retrying in %.1fs",
                        attempt,
                        retries,
                        e,
                        sleep,
                    )
                    time.sleep(sleep)
            raise RuntimeError("unreachable")

        return wrapper

    return decorator
