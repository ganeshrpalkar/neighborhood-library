"""Seed the library database with sample data (books, members, loans).

Book cover images are read from app/seed_assets/covers/<slug>.jpg and stored
directly in the database (books.cover_image). Run with:

    uv run python -m app.seed

Idempotent: skips records that already exist (by unique email / ISBN) and only
sets a cover when one isn't already stored.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import select

from app.api.v1.auth.models import User
from app.api.v1.books.models import Book
from app.api.v1.loans.models import Loan
from app.api.v1.members.models import Member
from app.core.database.postgres import get_sessionmaker
from app.core.security.jwt import hash_password

COVER_DIR = Path(__file__).resolve().parent / "seed_assets" / "covers"

STAFF_EMAIL = "staff@bookhaven.org"
STAFF_PASSWORD = "library123"

# (title, author, isbn, publisher, year, genre, copies, cover_slug)
BOOKS = [
    ("The Pragmatic Programmer", "Andrew Hunt", "9780201616224", "Addison-Wesley", 1999, "Software", 3, "pragmatic-programmer"),
    ("Clean Code", "Robert C. Martin", "9780132350884", "Prentice Hall", 2008, "Software", 2, "clean-code"),
    ("The Lord of the Rings", "J.R.R. Tolkien", "9780547928210", "Houghton Mifflin", 1954, "Fantasy", 4, "lord-of-the-rings"),
    ("Sapiens", "Yuval Noah Harari", "9780062316097", "Harper", 2011, "History", 2, "sapiens"),
    ("Dune", "Frank Herbert", "9780441013593", "Ace", 1965, "Sci-Fi", 5, "dune"),
    ("Atomic Habits", "James Clear", "9780735211292", "Avery", 2018, "Self-help", 3, "atomic-habits"),
    ("The Hobbit", "J.R.R. Tolkien", "9780547928227", "Houghton Mifflin", 1937, "Fantasy", 2, "the-hobbit"),
    ("Educated", "Tara Westover", "9780399590504", "Random House", 2018, "Memoir", 1, "educated"),
    ("Harry Potter and the Sorcerer's Stone", "J.K. Rowling", "9780590353427", "Scholastic", 1997, "Fantasy", 4, "harry-potter"),
    ("A Game of Thrones", "George R. R. Martin", "9780553593716", "Bantam", 1996, "Fantasy", 3, "game-of-thrones"),
    ("1984", "George Orwell", "9780451524935", "Signet Classics", 1949, "Dystopian", 3, "nineteen-eighty-four"),
    ("To Kill a Mockingbird", "Harper Lee", "9780061120084", "Harper Perennial", 1960, "Classic", 2, "mockingbird"),
    ("The Great Gatsby", "F. Scott Fitzgerald", "9780743273565", "Scribner", 1925, "Classic", 3, "gatsby"),
    ("Pride and Prejudice", "Jane Austen", "9780141439518", "Penguin Classics", 1813, "Romance", 2, "pride-prejudice"),
    ("The Alchemist", "Paulo Coelho", "9780061122415", "HarperOne", 1988, "Fiction", 3, "alchemist"),
    ("Brave New World", "Aldous Huxley", "9780060850524", "Harper Perennial", 1932, "Dystopian", 2, "brave-new-world"),
    ("The Name of the Wind", "Patrick Rothfuss", "9780756404741", "DAW Books", 2007, "Fantasy", 3, "name-of-the-wind"),
    ("The Catcher in the Rye", "J.D. Salinger", "9780316769488", "Little, Brown", 1951, "Classic", 2, "catcher-rye"),
]

MEMBERS = [
    ("Alice Johnson", "alice@bookhaven.org", "555-0101", "12 Maple St"),
    ("Bob Smith", "bob@bookhaven.org", "555-0102", "34 Oak Ave"),
    ("Carla Reyes", "carla@bookhaven.org", "555-0103", "56 Pine Rd"),
    ("David Lee", "david@bookhaven.org", "555-0104", "78 Birch Ln"),
    ("Emma Wilson", "emma@bookhaven.org", "555-0105", "90 Cedar Ct"),
    ("Frank Ortiz", "frank@bookhaven.org", "555-0106", "21 Elm Way"),
]


def _now() -> datetime:
    return datetime.now(UTC)


def _load_cover(slug: str) -> bytes | None:
    path = COVER_DIR / f"{slug}.jpg"
    if path.exists() and path.stat().st_size > 2000:
        return path.read_bytes()
    return None


def seed() -> None:
    session_factory = get_sessionmaker()
    covers_set = 0
    with session_factory() as db:
        # Staff user
        if db.scalar(select(User).where(User.email == STAFF_EMAIL)) is None:
            db.add(
                User(
                    email=STAFF_EMAIL,
                    name="Library Staff",
                    hashed_password=hash_password(STAFF_PASSWORD),
                    roles=["staff", "admin"],
                )
            )

        # Books (+ cover bytes stored in the DB)
        books: dict[str, Book] = {}
        for title, author, isbn, publisher, year, genre, copies, slug in BOOKS:
            book = db.scalar(select(Book).where(Book.isbn == isbn))
            if book is None:
                book = Book(
                    title=title,
                    author=author,
                    isbn=isbn,
                    publisher=publisher,
                    published_year=year,
                    genre=genre,
                    total_copies=copies,
                    available_copies=copies,
                )
                db.add(book)
            if book.cover_content_type is None:
                data = _load_cover(slug)
                if data is not None:
                    book.cover_image = data
                    book.cover_content_type = "image/jpeg"
                    covers_set += 1
            books[isbn] = book

        # Members
        members: dict[str, Member] = {}
        for name, email, phone, address in MEMBERS:
            member = db.scalar(select(Member).where(Member.email == email))
            if member is None:
                member = Member(name=name, email=email, phone=phone, address=address)
                db.add(member)
            members[email] = member

        db.flush()

        # Sample loans (only if none exist yet)
        if db.scalar(select(Loan)) is None:
            dune = books["9780441013593"]
            sapiens = books["9780062316097"]
            hp = books["9780590353427"]
            alice = members["alice@bookhaven.org"]
            bob = members["bob@bookhaven.org"]
            emma = members["emma@bookhaven.org"]

            dune.available_copies -= 1
            db.add(Loan(book_id=dune.id, member_id=alice.id, borrowed_at=_now() - timedelta(days=3),
                        due_date=_now() + timedelta(days=11), status="active", fine_amount=0))
            sapiens.available_copies -= 1
            db.add(Loan(book_id=sapiens.id, member_id=bob.id, borrowed_at=_now() - timedelta(days=30),
                        due_date=_now() - timedelta(days=16), status="active", fine_amount=0))
            hp.available_copies -= 1
            db.add(Loan(book_id=hp.id, member_id=emma.id, borrowed_at=_now() - timedelta(days=1),
                        due_date=_now() + timedelta(days=13), status="active", fine_amount=0))

        db.commit()

    print("Seed complete.")
    print(f"  Staff login: {STAFF_EMAIL} / {STAFF_PASSWORD}")
    print(f"  Books: {len(BOOKS)}  Members: {len(MEMBERS)}  Covers stored: {covers_set}")


if __name__ == "__main__":
    seed()
