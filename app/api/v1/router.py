"""API v1 router — aggregates all module routers."""

from fastapi import APIRouter

from app.api.v1.auth.router import router as auth_router
from app.api.v1.books.router import router as books_router
from app.api.v1.loans.router import router as loans_router
from app.api.v1.members.router import router as members_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/v1/auth", tags=["Auth"])
api_router.include_router(books_router, prefix="/v1/books", tags=["Books"])
api_router.include_router(members_router, prefix="/v1/members", tags=["Members"])
api_router.include_router(loans_router, prefix="/v1/loans", tags=["Loans"])
