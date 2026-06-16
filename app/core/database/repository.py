"""Optional generic SQLAlchemy CRUD repository.

Domain services may use this thin base for boilerplate CRUD, or just use the
`Session` directly (see app/api/v1/books/services.py for the direct style).
"""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database.postgres import Base


class CRUDRepository[ModelT: Base]:
    """Reusable create/read/update/delete helpers bound to one ORM model."""

    def __init__(self, model: type[ModelT]) -> None:
        self.model = model

    def get(self, db: Session, obj_id: int) -> ModelT | None:
        return db.get(self.model, obj_id)

    def list(self, db: Session, skip: int = 0, limit: int = 12) -> tuple[list[ModelT], int]:
        total = db.scalar(select(func.count()).select_from(self.model)) or 0
        rows = db.scalars(select(self.model).offset(skip).limit(limit)).all()
        return list(rows), total

    def create(self, db: Session, **fields) -> ModelT:
        obj = self.model(**fields)
        db.add(obj)
        db.flush()
        db.refresh(obj)
        return obj

    def update(self, db: Session, obj: ModelT, **fields) -> ModelT:
        for key, value in fields.items():
            setattr(obj, key, value)
        db.flush()
        db.refresh(obj)
        return obj

    def delete(self, db: Session, obj: ModelT) -> None:
        db.delete(obj)
        db.flush()
