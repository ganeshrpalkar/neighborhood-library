---
name: add-api-module
description: Use when adding a new REST domain module (e.g. orders, products) to this FastAPI boilerplate. Provides the exact file scaffold and layer contract so you don't re-derive structure or re-read the reference module each time.
---

# Add an API Module

Reference template: `app/api/v1/books/` (it has `schemas.py`, `models.py`, `services.py`, `router.py`). Mirror it. Full prose guide: `docs/ADDING_AN_API.md`.

## Steps (do in this order)

1. **Create the package**
   ```bash
   mkdir -p app/api/v1/<name>
   touch app/api/v1/<name>/__init__.py
   ```

2. **`schemas.py`** — Pydantic v2 models only (no logic, no `fastapi`/DB imports):
   `<Name>Create`, `<Name>Update`, `<Name>Response`, `Paginated<Name>s`. Use `ConfigDict(from_attributes=True)` on Response models.

3. **`models.py`** — SQLAlchemy 2.0 ORM model(s). Inherit from `Base`, integer PK, `Mapped[...]`/`mapped_column(...)`, declare `relationship(...)` for FKs.

4. **`services.py`** — business logic. Accepts `db: Session`, returns an ORM object/`dict`.
   - NEVER import from `fastapi`; raise only from `app.core.exceptions`.
   - Lookup: `db.get(Model, pk)` → obj|None (raise `NotFoundError` if None).
   - Lists: `db.scalars(select(Model)...).all()`; counts: `db.scalar(select(func.count())...)`.
   - Mutate: `db.add(obj)` / `db.commit()` / `db.refresh(obj)` / `db.delete(obj)`.
   - Authorization checks belong here (compare against `requester`), not in the router.

5. **`router.py`** — HTTP only. Wire `db: Session = Depends(get_session)`; path IDs are `int`. Auth via `Depends(get_current_user)`. Cache GETs with `@redis_cache_response(...)` (first arg must be `request: Request`).

6. **Register** in `app/api/v1/router.py`:
   ```python
   from app.api.v1.<name>.router import router as <name>_router
   api_router.include_router(<name>_router, prefix="/v1/<name>", tags=["<Name>"])
   ```

7. **Migration** — create the table(s) via Alembic (schema changes never go direct):
   ```bash
   make migration m="add <name> table"   # autogenerate revision
   make migrate                            # alembic upgrade head
   ```

8. **Tests** — `tests/unit/test_<name>.py` (service logic) + `tests/contract/test_<name>.py` (`@pytest.mark.contract`, use `seeded_user`).

9. **Verify imports** (cheap):
   ```bash
   uv run pytest tests/test_startup_smoke.py -q
   ```

## Layer contract (enforce)
| File | imports `fastapi`? | raises `HTTPException`? | contains business logic? |
|------|--------------------|------------------------|--------------------------|
| `schemas.py` | no | no | no |
| `models.py` | no | no | no (ORM mapping only) |
| `services.py` | **no** | **no** (use `app.core.exceptions`) | yes |
| `router.py` | yes | via handlers | no |
