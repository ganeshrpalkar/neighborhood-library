"""Business logic for the members domain — never imports from fastapi."""

from __future__ import annotations

from sqlalchemy import ColumnElement, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.v1.members.models import Member
from app.core.exceptions import ConflictError, NotFoundError


def list_members(
    db: Session, page: int = 1, page_size: int = 12, search: str | None = None
) -> tuple[list[Member], int]:
    stmt = select(Member)
    if search:
        q = search.strip()
        like = f"%{q}%"
        conds: list[ColumnElement[bool]] = [Member.name.ilike(like), Member.email.ilike(like)]
        if len(q) >= 4:
            conds += [func.word_similarity(q, Member.name) > 0.45, func.word_similarity(q, Member.email) > 0.45]
        stmt = stmt.where(or_(*conds))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(Member.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return list(rows), total


def autocomplete_members(db: Session, q: str, limit: int = 8) -> list[Member]:
    """Trigram-ranked typeahead over name / email (ILIKE filter, similarity order)."""
    q = q.strip()
    if not q:
        return []
    like = f"%{q}%"
    score = func.greatest(func.word_similarity(q, Member.name), func.word_similarity(q, Member.email))
    conds: list[ColumnElement[bool]] = [Member.name.ilike(like), Member.email.ilike(like)]
    if len(q) >= 4:
        conds += [func.word_similarity(q, Member.name) > 0.45, func.word_similarity(q, Member.email) > 0.45]
    stmt = select(Member).where(or_(*conds)).order_by(score.desc(), Member.name.asc()).limit(limit)
    return list(db.scalars(stmt).all())


def get_member(db: Session, member_id: int) -> Member:
    member = db.get(Member, member_id)
    if member is None:
        raise NotFoundError(f"Member {member_id} not found")
    return member


def create_member(db: Session, data: dict) -> Member:
    if db.scalar(select(Member).where(Member.email == data["email"])) is not None:
        raise ConflictError(f"A member with email '{data['email']}' already exists") from None
    member = Member(
        name=data["name"],
        email=data["email"],
        phone=data.get("phone"),
        address=data.get("address"),
    )
    db.add(member)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError(f"A member with email '{data['email']}' already exists") from None
    db.refresh(member)
    return member


def update_member(db: Session, member_id: int, data: dict) -> Member:
    member = get_member(db, member_id)
    new_email = data.get("email")
    if (
        new_email
        and new_email != member.email
        and db.scalar(select(Member).where(Member.email == new_email)) is not None
    ):
        raise ConflictError(f"A member with email '{new_email}' already exists") from None
    for field in ("name", "email", "phone", "address", "is_active"):
        if field in data and data[field] is not None:
            setattr(member, field, data[field])
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError(f"A member with email '{new_email}' already exists") from None
    db.refresh(member)
    return member


def delete_member(db: Session, member_id: int) -> dict:
    from app.api.v1.loans.models import Loan

    member = get_member(db, member_id)
    open_loans = db.scalar(
        select(func.count()).select_from(Loan).where(Loan.member_id == member_id, Loan.returned_at.is_(None))
    )
    if open_loans:
        raise ConflictError("Cannot delete a member who has books currently on loan")
    db.delete(member)
    db.commit()
    return {"success": True, "deleted_id": member_id}
