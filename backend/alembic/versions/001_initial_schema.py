"""initial schema

Revision ID: 001_initial
Revises:
Create Date: 2026-09-02
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "settlements",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("country", sa.String(length=64), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "landmarks",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("settlement_id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("zone", sa.String(length=128), nullable=False),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lon", sa.Float(), nullable=False),
        sa.Column("safe_haven", sa.Boolean(), nullable=False),
        sa.Column("graph_version", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["settlement_id"], ["settlements.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_landmarks_settlement_id", "landmarks", ["settlement_id"])
    op.create_table(
        "graph_edges",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("settlement_id", sa.String(length=64), nullable=False),
        sa.Column("from_landmark", sa.String(length=64), nullable=False),
        sa.Column("to_landmark", sa.String(length=64), nullable=False),
        sa.Column("weight", sa.Float(), nullable=False),
        sa.Column("flood_prone", sa.Boolean(), nullable=False),
        sa.Column("graph_version", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["settlement_id"], ["settlements.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_graph_edges_settlement_id", "graph_edges", ["settlement_id"])
    op.create_table(
        "cvi_observations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("settlement_id", sa.String(length=64), nullable=False),
        sa.Column("zone_id", sa.String(length=64), nullable=False),
        sa.Column("zone_name", sa.String(length=128), nullable=False),
        sa.Column("drainage_proximity", sa.Float(), nullable=False),
        sa.Column("structural_density", sa.Float(), nullable=False),
        sa.Column("elevation_slope", sa.Float(), nullable=False),
        sa.Column("ghacof_rainfall", sa.Float(), nullable=False),
        sa.Column("outlook", sa.String(length=256), nullable=False),
        sa.Column("tercile", sa.String(length=32), nullable=False),
        sa.Column("el_nino_mode", sa.Boolean(), nullable=False),
        sa.Column("model_version", sa.String(length=32), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=False),
        sa.Column("ingested_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["settlement_id"], ["settlements.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_cvi_observations_settlement_id", "cvi_observations", ["settlement_id"])
    op.create_table(
        "sos_events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("landmark_id", sa.String(length=64), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("source", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("settlement_id", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_sos_events_status", "sos_events", ["status"])
    op.create_index("ix_sos_events_settlement_id", "sos_events", ["settlement_id"])
    op.create_index("ix_sos_events_created_at", "sos_events", ["created_at"])
    op.create_table(
        "hazard_events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("from_landmark", sa.String(length=64), nullable=False),
        sa.Column("to_landmark", sa.String(length=64), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("source", sa.String(length=16), nullable=False),
        sa.Column("verified", sa.Boolean(), nullable=False),
        sa.Column("settlement_id", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_hazard_events_settlement_id", "hazard_events", ["settlement_id"])
    op.create_index("ix_hazard_events_created_at", "hazard_events", ["created_at"])
    op.create_table(
        "damage_reports",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("landmark_id", sa.String(length=64), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("verified", sa.Boolean(), nullable=False),
        sa.Column("settlement_id", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("hazard_event_id", sa.String(length=36), nullable=True),
        sa.ForeignKeyConstraint(["hazard_event_id"], ["hazard_events.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_damage_reports_settlement_id", "damage_reports", ["settlement_id"])
    op.create_index("ix_damage_reports_created_at", "damage_reports", ["created_at"])
    op.create_table(
        "edge_penalties",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("settlement_id", sa.String(length=64), nullable=False),
        sa.Column("from_landmark", sa.String(length=64), nullable=False),
        sa.Column("to_landmark", sa.String(length=64), nullable=False),
        sa.Column("multiplier", sa.Float(), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("source", sa.String(length=16), nullable=False),
        sa.Column("verified", sa.Boolean(), nullable=False),
        sa.Column("hazard_event_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("settlement_id", "from_landmark", "to_landmark", name="uq_edge_penalty"),
    )
    op.create_index("ix_edge_penalties_settlement_id", "edge_penalties", ["settlement_id"])
    op.create_index("ix_edge_penalties_active", "edge_penalties", ["settlement_id", "expires_at"])
    op.create_table(
        "idempotency_keys",
        sa.Column("key", sa.String(length=128), nullable=False),
        sa.Column("resource_type", sa.String(length=32), nullable=False),
        sa.Column("resource_id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("key"),
    )
    op.create_table(
        "outbox_messages",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("channel", sa.String(length=32), nullable=False),
        sa.Column("recipient", sa.String(length=64), nullable=False),
        sa.Column("payload", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_outbox_messages_status", "outbox_messages", ["status"])
    op.create_table(
        "ingestion_runs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("source", sa.String(length=64), nullable=False),
        sa.Column("settlement_id", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("records", sa.Integer(), nullable=False),
        sa.Column("geometry_version", sa.Integer(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "satellite_layers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("settlement_id", sa.String(length=64), nullable=False),
        sa.Column("layer_type", sa.String(length=64), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=False),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_satellite_layers_settlement_id", "satellite_layers", ["settlement_id"])
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("actor", sa.String(length=64), nullable=False),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("resource_type", sa.String(length=64), nullable=False),
        sa.Column("resource_id", sa.String(length=64), nullable=False),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_index("ix_satellite_layers_settlement_id", table_name="satellite_layers")
    op.drop_table("satellite_layers")
    op.drop_table("ingestion_runs")
    op.drop_index("ix_outbox_messages_status", table_name="outbox_messages")
    op.drop_table("outbox_messages")
    op.drop_table("idempotency_keys")
    op.drop_index("ix_edge_penalties_active", table_name="edge_penalties")
    op.drop_index("ix_edge_penalties_settlement_id", table_name="edge_penalties")
    op.drop_table("edge_penalties")
    op.drop_index("ix_damage_reports_created_at", table_name="damage_reports")
    op.drop_index("ix_damage_reports_settlement_id", table_name="damage_reports")
    op.drop_table("damage_reports")
    op.drop_index("ix_hazard_events_created_at", table_name="hazard_events")
    op.drop_index("ix_hazard_events_settlement_id", table_name="hazard_events")
    op.drop_table("hazard_events")
    op.drop_index("ix_sos_events_created_at", table_name="sos_events")
    op.drop_index("ix_sos_events_settlement_id", table_name="sos_events")
    op.drop_index("ix_sos_events_status", table_name="sos_events")
    op.drop_table("sos_events")
    op.drop_index("ix_cvi_observations_settlement_id", table_name="cvi_observations")
    op.drop_table("cvi_observations")
    op.drop_index("ix_graph_edges_settlement_id", table_name="graph_edges")
    op.drop_table("graph_edges")
    op.drop_index("ix_landmarks_settlement_id", table_name="landmarks")
    op.drop_table("landmarks")
    op.drop_table("settlements")
