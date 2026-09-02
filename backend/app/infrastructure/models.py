from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class SettlementORM(Base):
    __tablename__ = "settlements"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    country: Mapped[str] = mapped_column(String(64), default="Kenya")
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class LandmarkORM(Base):
    __tablename__ = "landmarks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    settlement_id: Mapped[str] = mapped_column(ForeignKey("settlements.id"), index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    zone: Mapped[str] = mapped_column(String(128), nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)
    safe_haven: Mapped[bool] = mapped_column(Boolean, default=False)
    graph_version: Mapped[int] = mapped_column(Integer, default=1)


class GraphEdgeORM(Base):
    __tablename__ = "graph_edges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    settlement_id: Mapped[str] = mapped_column(ForeignKey("settlements.id"), index=True)
    from_landmark: Mapped[str] = mapped_column(String(64), nullable=False)
    to_landmark: Mapped[str] = mapped_column(String(64), nullable=False)
    weight: Mapped[float] = mapped_column(Float, nullable=False)
    flood_prone: Mapped[bool] = mapped_column(Boolean, default=False)
    graph_version: Mapped[int] = mapped_column(Integer, default=1)


class CviObservationORM(Base):
    __tablename__ = "cvi_observations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    settlement_id: Mapped[str] = mapped_column(ForeignKey("settlements.id"), index=True)
    zone_id: Mapped[str] = mapped_column(String(64), nullable=False)
    zone_name: Mapped[str] = mapped_column(String(128), nullable=False)
    drainage_proximity: Mapped[float] = mapped_column(Float, nullable=False)
    structural_density: Mapped[float] = mapped_column(Float, nullable=False)
    elevation_slope: Mapped[float] = mapped_column(Float, nullable=False)
    ghacof_rainfall: Mapped[float] = mapped_column(Float, nullable=False)
    outlook: Mapped[str] = mapped_column(String(256), nullable=False)
    tercile: Mapped[str] = mapped_column(String(32), nullable=False)
    el_nino_mode: Mapped[bool] = mapped_column(Boolean, default=False)
    model_version: Mapped[str] = mapped_column(String(32), default="cvi-v1")
    source: Mapped[str] = mapped_column(String(64), default="seed")
    ingested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class SosEventORM(Base):
    __tablename__ = "sos_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    landmark_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    source: Mapped[str] = mapped_column(String(16), default="pwa")
    status: Mapped[str] = mapped_column(String(16), default="open", index=True)
    settlement_id: Mapped[str] = mapped_column(String(64), default="kibera", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class HazardEventORM(Base):
    __tablename__ = "hazard_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    from_landmark: Mapped[str] = mapped_column(String(64), nullable=False)
    to_landmark: Mapped[str] = mapped_column(String(64), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(16), default="pwa")
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    settlement_id: Mapped[str] = mapped_column(String(64), default="kibera", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class DamageReportORM(Base):
    __tablename__ = "damage_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    landmark_id: Mapped[str] = mapped_column(String(64), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    settlement_id: Mapped[str] = mapped_column(String(64), default="kibera", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    hazard_event_id: Mapped[str | None] = mapped_column(
        ForeignKey("hazard_events.id"), nullable=True
    )


class EdgePenaltyORM(Base):
    __tablename__ = "edge_penalties"
    __table_args__ = (
        UniqueConstraint("settlement_id", "from_landmark", "to_landmark", name="uq_edge_penalty"),
        Index("ix_edge_penalties_active", "settlement_id", "expires_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    settlement_id: Mapped[str] = mapped_column(String(64), default="kibera", index=True)
    from_landmark: Mapped[str] = mapped_column(String(64), nullable=False)
    to_landmark: Mapped[str] = mapped_column(String(64), nullable=False)
    multiplier: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    source: Mapped[str] = mapped_column(String(16), default="pwa")
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    hazard_event_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class IdempotencyKeyORM(Base):
    __tablename__ = "idempotency_keys"

    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    resource_type: Mapped[str] = mapped_column(String(32), nullable=False)
    resource_id: Mapped[str] = mapped_column(String(36), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class OutboxMessageORM(Base):
    __tablename__ = "outbox_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    channel: Mapped[str] = mapped_column(String(32), nullable=False)
    recipient: Mapped[str] = mapped_column(String(64), nullable=False)
    payload: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="pending", index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class IngestionRunORM(Base):
    __tablename__ = "ingestion_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    settlement_id: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="completed")
    records: Mapped[int] = mapped_column(Integer, default=0)
    geometry_version: Mapped[int] = mapped_column(Integer, default=1)
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class SatelliteLayerORM(Base):
    __tablename__ = "satellite_layers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    settlement_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    layer_type: Mapped[str] = mapped_column(String(64), nullable=False)
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=False)


class AuditLogORM(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    actor: Mapped[str] = mapped_column(String(64), default="system")
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(64), nullable=False)
    resource_id: Mapped[str] = mapped_column(String(64), nullable=False)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
