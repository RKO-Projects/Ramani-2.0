"""optional SOS / hazard columns: hashed callback, medical triage, cell hash, media paths

Revision ID: 003_channel_privacy
Revises: 002_geospatial
Create Date: 2026-09-03
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003_channel_privacy"
down_revision: Union[str, None] = "002_geospatial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("sos_events") as batch_op:
        batch_op.add_column(sa.Column("phone_hash", sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column("needs_medical", sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column("location_hash", sa.String(length=64), nullable=True))

    with op.batch_alter_table("hazard_events") as batch_op:
        batch_op.add_column(sa.Column("photo_path", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("voice_path", sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("hazard_events") as batch_op:
        batch_op.drop_column("voice_path")
        batch_op.drop_column("photo_path")

    with op.batch_alter_table("sos_events") as batch_op:
        batch_op.drop_column("location_hash")
        batch_op.drop_column("needs_medical")
        batch_op.drop_column("phone_hash")
