"""Alembic migration environment for the Neighborhood Library Service."""

from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# Import settings and the declarative Base, then import every model module so
# that all tables are registered on Base.metadata before autogenerate runs.
from app.api.v1.auth import models as _auth_models  # noqa: F401
from app.api.v1.books import models as _book_models  # noqa: F401
from app.api.v1.loans import models as _loan_models  # noqa: F401
from app.api.v1.members import models as _member_models  # noqa: F401
from app.core.config import settings
from app.core.database.postgres import Base

config = context.config

# Inject the runtime DATABASE_URL so we never hard-code credentials in alembic.ini.
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
