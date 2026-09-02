"""geospatial upgrade: provenance + geom_wkt columns; postgis geometry indexes

Revision ID: 002_geospatial
Revises: 001_initial
Create Date: 2026-09-02

Adds:
  - landmarks.provenance   (VARCHAR 64, default 'seed')
  - landmarks.geom_wkt     (TEXT nullable) - WKT POINT for PostGIS upgrade path
  - graph_edges.provenance (VARCHAR 64, default 'seed')
  - graph_edges.geom_wkt   (TEXT nullable) - WKT LINESTRING for PostGIS upgrade path

The WKT columns are populated by the OSM ingestion pipeline. When PostGIS is
available these will later be migrated to geometry(Point, 4326) and
geometry(LineString, 4326) columns. For SQLite / development they remain TEXT.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_geospatial"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("landmarks") as batch_op:
        batch_op.add_column(
            sa.Column("provenance", sa.String(length=64), nullable=False, server_default="seed")
        )
        batch_op.add_column(
            sa.Column("geom_wkt", sa.Text(), nullable=True)
        )

    with op.batch_alter_table("graph_edges") as batch_op:
        batch_op.add_column(
            sa.Column("provenance", sa.String(length=64), nullable=False, server_default="seed")
        )
        batch_op.add_column(
            sa.Column("geom_wkt", sa.Text(), nullable=True)
        )


def downgrade() -> None:
    with op.batch_alter_table("graph_edges") as batch_op:
        batch_op.drop_column("geom_wkt")
        batch_op.drop_column("provenance")

    with op.batch_alter_table("landmarks") as batch_op:
        batch_op.drop_column("geom_wkt")
        batch_op.drop_column("provenance")
