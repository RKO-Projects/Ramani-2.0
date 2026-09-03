from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings


class Base(DeclarativeBase):
    pass


def _create_engine():
    if settings.is_sqlite and (
        settings.database_url.endswith(":memory:") or settings.database_url == "sqlite://"
    ):
        url = "sqlite://"
        return create_engine(
            url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    connect_args = {"check_same_thread": False} if settings.is_sqlite else {}
    return create_engine(settings.database_url, connect_args=connect_args, pool_pre_ping=True)


engine = _create_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


if settings.is_sqlite:

    @event.listens_for(engine, "connect")
    def _sqlite_pragma(dbapi_connection, _connection_record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app.infrastructure import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    if settings.is_sqlite:
        _ensure_sqlite_columns()


def _ensure_sqlite_columns() -> None:
    """Add optional columns on existing SQLite files without rewriting old Alembic files."""
    patches = {
        "landmarks": [
            ("provenance", "VARCHAR(64) DEFAULT 'seed'"),
            ("geom_wkt", "TEXT"),
        ],
        "graph_edges": [
            ("provenance", "VARCHAR(64) DEFAULT 'seed'"),
            ("geom_wkt", "TEXT"),
        ],
        "sos_events": [
            ("phone_hash", "VARCHAR(64)"),
            ("needs_medical", "BOOLEAN DEFAULT 0"),
            ("location_hash", "VARCHAR(64)"),
        ],
        "hazard_events": [
            ("photo_path", "TEXT"),
            ("voice_path", "TEXT"),
        ],
    }
    with engine.begin() as conn:
        for table, columns in patches.items():
            existing = {
                row[1] for row in conn.exec_driver_sql(f"PRAGMA table_info({table})").fetchall()
            }
            if not existing:
                continue
            for name, ddl in columns:
                if name not in existing:
                    conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")
