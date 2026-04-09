"""Удаление неиспользуемых таблиц (остатки старых схем).

Revision ID: 002
Revises: 001
Create Date: 2026-04-08

"""

from typing import Sequence, Union

from sqlalchemy import text

from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name
    if dialect == "postgresql":
        op.execute(text("DROP TABLE IF EXISTS code_snapshots CASCADE"))
        op.execute(text("DROP TABLE IF EXISTS interviewer_notes CASCADE"))
    else:
        op.execute(text("DROP TABLE IF EXISTS code_snapshots"))
        op.execute(text("DROP TABLE IF EXISTS interviewer_notes"))


def downgrade() -> None:
    pass
