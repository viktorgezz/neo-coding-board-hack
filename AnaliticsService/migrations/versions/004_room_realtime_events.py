"""Таблица room_realtime_events: paste / tab_switch с created_at.

Revision ID: 004
Revises: 0a8918e6d7e1
Create Date: 2026-04-09

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004"
down_revision: Union[str, None] = "0a8918e6d7e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "room_realtime_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("room_id", sa.Uuid(), nullable=False),
        sa.Column("event_type", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["room_id"], ["analytics_rooms.room_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_room_realtime_events_room_created",
        "room_realtime_events",
        ["room_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_room_realtime_events_room_created", table_name="room_realtime_events")
    op.drop_table("room_realtime_events")
