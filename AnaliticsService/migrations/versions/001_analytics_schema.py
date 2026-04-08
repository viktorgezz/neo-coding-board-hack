"""Удаление устаревшей таблицы rooms и схема analytics_rooms (включая отчёты).

Revision ID: 001
Revises:
Create Date: 2026-04-08

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy import inspect, text
from sqlalchemy.types import Uuid

from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "postgresql":
        op.execute(text("DROP TABLE IF EXISTS rooms CASCADE"))
    else:
        op.execute(text("DROP TABLE IF EXISTS rooms"))

    inspector = inspect(bind)
    if not inspector.has_table("analytics_rooms"):
        op.create_table(
            "analytics_rooms",
            sa.Column("room_id", Uuid(as_uuid=True), primary_key=True),
            sa.Column("history_json", sa.JSON(), nullable=True),
            sa.Column("assessment_json", sa.JSON(), nullable=True),
            sa.Column("candidate_report_json", sa.JSON(), nullable=True),
            sa.Column("ai_summary_json", sa.JSON(), nullable=True),
            sa.Column("pastes", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("switches", sa.Integer(), nullable=False, server_default="0"),
        )
        return

    cols = {c["name"] for c in inspector.get_columns("analytics_rooms")}
    if "candidate_report_json" not in cols:
        op.add_column(
            "analytics_rooms",
            sa.Column("candidate_report_json", sa.JSON(), nullable=True),
        )
    if "ai_summary_json" not in cols:
        op.add_column(
            "analytics_rooms",
            sa.Column("ai_summary_json", sa.JSON(), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("analytics_rooms"):
        return
    cols = {c["name"] for c in inspector.get_columns("analytics_rooms")}
    if "ai_summary_json" in cols:
        op.drop_column("analytics_rooms", "ai_summary_json")
    if "candidate_report_json" in cols:
        op.drop_column("analytics_rooms", "candidate_report_json")
