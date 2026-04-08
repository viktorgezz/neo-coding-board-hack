"""Утилиты для БД (без циклических импортов с models)."""

from sqlalchemy import text

from database import engine

# Порядок: сначала дочерние таблицы (FK).
_TABLES_DELETE_ORDER = (
    "curve_points",
    "comparatives",
    "radar_metrics",
    "complexity_points",
    "timeline_events",
    "candidate_reports",
    "code_snapshots",
    "interviewer_notes",
    "session_histories",
    "ai_summary_bullets",
    "ai_summaries",
    "interviewer_assessments",
    "room_realtime_events",
    "analytics_rooms",
)


def clear_all_app_tables() -> None:
    """Удаляет все строки приложения. Таблицу alembic_version не трогает."""
    with engine.begin() as conn:
        for table in _TABLES_DELETE_ORDER:
            conn.execute(text(f"DELETE FROM {table}"))
