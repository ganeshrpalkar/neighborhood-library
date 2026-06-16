"""App startup smoke tests — verify the app imports and creates cleanly."""



def test_app_can_be_imported():
    """Importing app.main should not raise."""
    import app.main

    assert app.main.app is not None


def test_create_app_returns_fastapi_instance():
    from fastapi import FastAPI

    from app.main import create_app

    application = create_app()
    assert isinstance(application, FastAPI)


def test_settings_load():
    from app.core.config import settings

    assert settings.SERVICE_NAME is not None
    assert settings.JWT_ALGORITHM == "HS256"


def test_exception_classes_importable():
    from app.core.exceptions import (
        AccessDeniedError,
        AppError,
        ConflictError,
        NotFoundError,
        ValidationError,
    )

    assert issubclass(NotFoundError, AppError)
    assert issubclass(AccessDeniedError, AppError)
    assert issubclass(ConflictError, AppError)
    assert issubclass(ValidationError, AppError)
