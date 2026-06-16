"""Auth endpoints — register, token, current user."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.auth import services
from app.api.v1.auth.schemas import (
    RegisterRequest,
    TokenRequest,
    TokenResponse,
    UserResponse,
)
from app.core.config import settings
from app.core.database.postgres import get_session
from app.core.security.jwt import UserContext, create_access_token, get_current_user

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_session)) -> UserResponse:
    """Register a new library staff account."""
    user = services.register_user(db, body.email, body.password, body.name)
    return UserResponse.model_validate(user)


@router.post("/token", response_model=TokenResponse)
def login(body: TokenRequest, db: Session = Depends(get_session)) -> TokenResponse:
    """Authenticate with email + password and return a JWT access token."""
    user = services.authenticate(db, body.email, body.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    token = create_access_token(user_id=str(user.id), email=user.email, roles=user.roles)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.JWT_EXPIRY_MINUTES * 60,
    )


@router.get("/me", response_model=UserResponse)
def me(current_user: UserContext = Depends(get_current_user)) -> UserResponse:
    """Return the authenticated staff user resolved from the JWT."""
    return UserResponse(
        id=int(current_user.user_id),
        email=current_user.email,
        name=None,
        roles=current_user.roles,
    )
