import os

os.environ.setdefault("RAMANI_DATABASE_URL", "sqlite://")
os.environ.setdefault("RAMANI_ENV", "test")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.infrastructure.database import SessionLocal, init_db
from app.infrastructure.repositories.geospatial import GeospatialRepository
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def setup_database() -> None:
    init_db()
    db = SessionLocal()
    try:
        geo = GeospatialRepository(db)
        geo.seed_from_json_if_empty()
        geo.seed_mathare()
        db.commit()
    finally:
        db.close()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def db() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
