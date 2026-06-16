"""Permission definitions and FastAPI dependency factories."""

from __future__ import annotations

from fastapi import Depends, HTTPException, status

from app.core.security.jwt import UserContext, get_current_user

# Role constants
ROLE_ADMIN = "admin"
ROLE_USER = "user"

# Permission sets — extend these for your domain
ADMIN_ONLY = frozenset({ROLE_ADMIN})
ANY_USER = frozenset({ROLE_ADMIN, ROLE_USER})


def require_roles(*roles: str):
    """Factory: return a dependency that asserts the user has at least one of the given roles."""

    def dependency(user: UserContext = Depends(get_current_user)) -> UserContext:
        if not any(role in user.roles for role in roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return user

    return dependency


def require_admin():
    """Dependency: require the admin role."""
    return require_roles(ROLE_ADMIN)


def require_authenticated():
    """Dependency: require any authenticated user (any role)."""
    return Depends(get_current_user)
