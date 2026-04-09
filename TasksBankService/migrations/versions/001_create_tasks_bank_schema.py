"""create tasks bank schema

Revision ID: 001_create_tasks_bank_schema
Revises:
Create Date: 2026-04-09
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "001_create_tasks_bank_schema"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


difficulty_level = sa.Enum("easy", "medium", "hard", name="difficulty_level")


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "task_categories",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
    )
    op.create_index("ix_task_categories_name", "task_categories", ["name"], unique=True)

    op.create_table(
        "tasks",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("title", sa.String(length=256), nullable=False),
        sa.Column("statement", sa.Text(), nullable=False),
        sa.Column("difficulty", difficulty_level, nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["category_id"], ["task_categories.id"], ondelete="RESTRICT"),
    )
    op.create_index("ix_tasks_difficulty", "tasks", ["difficulty"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_tasks_difficulty", table_name="tasks")
    op.drop_table("tasks")
    op.drop_index("ix_task_categories_name", table_name="task_categories")
    op.drop_table("task_categories")
