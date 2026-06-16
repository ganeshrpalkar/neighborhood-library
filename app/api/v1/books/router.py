"""HTTP routes for the books domain."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, Path, Query, Request, UploadFile, status
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session

from app.api.v1.books import services
from app.api.v1.books.schemas import (
    BookCreate,
    BookResponse,
    BookSuggestion,
    BookUpdate,
    PaginatedBooks,
)
from app.core.cache.redis_cache import redis_cache_response
from app.core.database.postgres import get_session
from app.core.security.jwt import UserContext, get_current_user

router = APIRouter()


@router.get("", response_model=PaginatedBooks)
@redis_cache_response(ttl=120, cache_key_prefix="book_list")
def list_books(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    search: str | None = Query(None, description="Search title, author, or ISBN"),
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> JSONResponse:
    # Returns a JSONResponse (not a bare model) so @redis_cache_response can
    # round-trip the body through Redis correctly on a cache hit.
    books, total = services.list_books(db, page=page, page_size=page_size, search=search)
    payload = PaginatedBooks(
        items=[BookResponse.model_validate(b) for b in books],
        total=total,
        page=page,
        page_size=page_size,
    )
    return JSONResponse(content=payload.model_dump(mode="json"))


@router.post("", response_model=BookResponse, status_code=status.HTTP_201_CREATED)
def create_book(
    body: BookCreate,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> BookResponse:
    book = services.create_book(db, body.model_dump())
    return BookResponse.model_validate(book)


@router.get("/autocomplete", response_model=list[BookSuggestion])
def autocomplete_books(
    q: str = Query("", description="Partial title, author, or ISBN"),
    limit: int = Query(8, ge=1, le=20),
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> list[BookSuggestion]:
    rows = services.autocomplete_books(db, q, limit)
    return [BookSuggestion.model_validate(b) for b in rows]


@router.get("/{book_id}", response_model=BookResponse)
def get_book(
    book_id: int = Path(..., ge=1),
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> BookResponse:
    return BookResponse.model_validate(services.get_book(db, book_id))


@router.patch("/{book_id}", response_model=BookResponse)
def update_book(
    body: BookUpdate,
    book_id: int = Path(..., ge=1),
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> BookResponse:
    book = services.update_book(db, book_id, body.model_dump(exclude_unset=True))
    return BookResponse.model_validate(book)


@router.delete("/{book_id}")
def delete_book(
    book_id: int = Path(..., ge=1),
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> dict:
    return services.delete_book(db, book_id)


@router.get("/{book_id}/cover")
def get_book_cover(
    book_id: int = Path(..., ge=1),
    db: Session = Depends(get_session),
) -> Response:
    """Stream a book's cover image stored in the database (public so <img> tags work)."""
    data, content_type = services.get_cover(db, book_id)
    return Response(
        content=data,
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.put("/{book_id}/cover", response_model=BookResponse)
async def upload_book_cover(
    book_id: int = Path(..., ge=1),
    file: UploadFile = File(...),
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> BookResponse:
    """Upload/replace a book's cover image; the bytes are stored in the database."""
    content_type = file.content_type or "application/octet-stream"
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Cover must be an image")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Cover image must be under 5 MB")
    book = services.set_cover(db, book_id, data, content_type)
    return BookResponse.model_validate(book)
