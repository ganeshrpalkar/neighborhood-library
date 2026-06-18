"""add pg_trgm extension and trigram indexes

Revision ID: 82feaf47d39c
Revises: ec19854a2035
Create Date: 2026-06-13 23:43:23.456260

"""
from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '82feaf47d39c'
down_revision: str | Sequence[str] | None = 'ec19854a2035'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Enable pg_trgm and add GIN trigram indexes for fast ILIKE search + autocomplete."""
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.create_index(
        "ix_books_title_trgm", "books", ["title"],
        postgresql_using="gin", postgresql_ops={"title": "gin_trgm_ops"},
    )
    op.create_index(
        "ix_books_author_trgm", "books", ["author"],
        postgresql_using="gin", postgresql_ops={"author": "gin_trgm_ops"},
    )
    op.create_index(
        "ix_members_name_trgm", "members", ["name"],
        postgresql_using="gin", postgresql_ops={"name": "gin_trgm_ops"},
    )
    op.create_index(
        "ix_members_email_trgm", "members", ["email"],
        postgresql_using="gin", postgresql_ops={"email": "gin_trgm_ops"},
    )


def downgrade() -> None:
    """Drop the trigram indexes (leave the pg_trgm extension installed)."""
    op.drop_index("ix_members_email_trgm", table_name="members")
    op.drop_index("ix_members_name_trgm", table_name="members")
    op.drop_index("ix_books_author_trgm", table_name="books")
    op.drop_index("ix_books_title_trgm", table_name="books")
