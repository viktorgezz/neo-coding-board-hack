"""normalize json to tables

Revision ID: 0a8918e6d7e1
Revises: 002
Create Date: 2026-04-09 00:02:36.250806

"""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import text
from sqlalchemy.dialects import postgresql

revision: str = "0a8918e6d7e1"
down_revision: Union[str, Sequence[str], None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _as_dict(val: Any) -> dict | None:
    if val is None:
        return None
    if isinstance(val, dict):
        return val
    if isinstance(val, str):
        return json.loads(val)
    return None


def _parse_dt(val: Any):
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    if isinstance(val, str):
        return datetime.fromisoformat(val.replace("Z", "+00:00"))
    return val


def _migrate_json_data(conn) -> None:
    rows = conn.execute(
        sa.text(
            "SELECT room_id, history_json, assessment_json, candidate_report_json, ai_summary_json "
            "FROM analytics_rooms"
        )
    ).fetchall()
    for row in rows:
        room_id = row[0]
        history_json = _as_dict(row[1])
        assessment_json = _as_dict(row[2])
        report_json = _as_dict(row[3])
        ai_json = _as_dict(row[4])

        if history_json:
            sh_id = uuid.uuid4()
            st = _parse_dt(history_json.get("startTime"))
            et = _parse_dt(history_json.get("endTime"))
            conn.execute(
                text(
                    "INSERT INTO session_histories (id, room_id, start_time, end_time) "
                    "VALUES (:id, :room_id, :st, :et)"
                ),
                {"id": sh_id, "room_id": room_id, "st": st, "et": et},
            )
            for i, cs in enumerate(history_json.get("codeSnapshots") or []):
                conn.execute(
                    text(
                        "INSERT INTO code_snapshots "
                        "(id, session_history_id, sort_order, timestamp, code, language) "
                        "VALUES (:id, :sh, :so, :ts, :code, :lang)"
                    ),
                    {
                        "id": uuid.uuid4(),
                        "sh": sh_id,
                        "so": i,
                        "ts": cs.get("timestamp", ""),
                        "code": cs.get("code", ""),
                        "lang": cs.get("language", ""),
                    },
                )
            for i, note in enumerate(history_json.get("interviewerNotes") or []):
                conn.execute(
                    text(
                        "INSERT INTO interviewer_notes "
                        "(id, session_history_id, sort_order, timestamp, text) "
                        "VALUES (:id, :sh, :so, :ts, :txt)"
                    ),
                    {
                        "id": uuid.uuid4(),
                        "sh": sh_id,
                        "so": i,
                        "ts": note.get("timestamp", ""),
                        "txt": note.get("text", ""),
                    },
                )

        if assessment_json:
            conn.execute(
                text(
                    "INSERT INTO interviewer_assessments "
                    "(room_id, system_design, code_readability, communication_skills, coachability, verdict) "
                    "VALUES (:room_id, :sd, :cr, :cs, :ch, :v)"
                ),
                {
                    "room_id": room_id,
                    "sd": assessment_json.get("systemDesign"),
                    "cr": assessment_json.get("codeReadability"),
                    "cs": assessment_json.get("communicationSkills"),
                    "ch": assessment_json.get("coachability"),
                    "v": assessment_json.get("verdict", ""),
                },
            )

        if report_json:
            cr_id = uuid.uuid4()
            summary = report_json.get("summary") or {}
            if not isinstance(summary, dict):
                summary = {}
            conn.execute(
                text(
                    "INSERT INTO candidate_reports "
                    "(id, room_id, summary_candidate_name, summary_final_verdict) "
                    "VALUES (:id, :room_id, :sn, :sv)"
                ),
                {
                    "id": cr_id,
                    "room_id": room_id,
                    "sn": summary.get("candidateName") or summary.get("candidate_name"),
                    "sv": summary.get("finalVerdict") or summary.get("final_verdict"),
                },
            )
            for i, ev in enumerate(report_json.get("timelineEvents") or []):
                conn.execute(
                    text(
                        "INSERT INTO timeline_events "
                        "(id, candidate_report_id, sort_order, timestamp, event_type, label) "
                        "VALUES (:id, :cr, :so, :ts, :et, :lb)"
                    ),
                    {
                        "id": uuid.uuid4(),
                        "cr": cr_id,
                        "so": i,
                        "ts": ev.get("timestamp", ""),
                        "et": ev.get("type", ""),
                        "lb": ev.get("label", ""),
                    },
                )
            for i, cp in enumerate(report_json.get("complexityTrend") or []):
                conn.execute(
                    text(
                        "INSERT INTO complexity_points "
                        "(id, candidate_report_id, sort_order, timestamp, complexity) "
                        "VALUES (:id, :cr, :so, :ts, :cx)"
                    ),
                    {
                        "id": uuid.uuid4(),
                        "cr": cr_id,
                        "so": i,
                        "ts": cp.get("timestamp", ""),
                        "cx": cp.get("complexity", 0),
                    },
                )
            rm = report_json.get("radarMetrics") or {}
            if rm:
                conn.execute(
                    text(
                        "INSERT INTO radar_metrics "
                        "(candidate_report_id, system_design, code_readability, communication, "
                        "coachability, technical_score, integrity) "
                        "VALUES (:cr, :sd, :crb, :cm, :ch, :ts, :in)"
                    ),
                    {
                        "cr": cr_id,
                        "sd": rm.get("systemDesign"),
                        "crb": rm.get("codeReadability"),
                        "cm": rm.get("communication"),
                        "ch": rm.get("coachability"),
                        "ts": rm.get("technicalScore"),
                        "in": rm.get("integrity"),
                    },
                )
            comp = report_json.get("comparative") or {}
            comp_id = uuid.uuid4()
            if comp:
                conn.execute(
                    text(
                        "INSERT INTO comparatives "
                        "(id, candidate_report_id, candidate_z_score, percentile) "
                        "VALUES (:id, :cr, :zs, :pc)"
                    ),
                    {
                        "id": comp_id,
                        "cr": cr_id,
                        "zs": comp.get("candidateZScore", 0.0),
                        "pc": comp.get("percentile", 0),
                    },
                )
                for i, pt in enumerate(comp.get("distributionCurve") or []):
                    conn.execute(
                        text(
                            "INSERT INTO curve_points "
                            "(id, comparative_id, sort_order, x, y) "
                            "VALUES (:id, :cid, :so, :x, :y)"
                        ),
                        {
                            "id": uuid.uuid4(),
                            "cid": comp_id,
                            "so": i,
                            "x": pt.get("x", 0.0),
                            "y": pt.get("y", 0.0),
                        },
                    )

        if ai_json:
            conn.execute(
                text(
                    "INSERT INTO ai_summaries (room_id, ai_recommendation) "
                    "VALUES (:room_id, :rec)"
                ),
                {
                    "room_id": room_id,
                    "rec": ai_json.get("aiRecommendation", ""),
                },
            )
            for i, t in enumerate(ai_json.get("positivePoints") or []):
                conn.execute(
                    text(
                        "INSERT INTO ai_summary_bullets "
                        "(id, room_id, kind, sort_order, text) "
                        "VALUES (:id, :room_id, :kind, :so, :txt)"
                    ),
                    {
                        "id": uuid.uuid4(),
                        "room_id": room_id,
                        "kind": "positive",
                        "so": i,
                        "txt": t,
                    },
                )
            for i, t in enumerate(ai_json.get("negativePoints") or []):
                conn.execute(
                    text(
                        "INSERT INTO ai_summary_bullets "
                        "(id, room_id, kind, sort_order, text) "
                        "VALUES (:id, :room_id, :kind, :so, :txt)"
                    ),
                    {
                        "id": uuid.uuid4(),
                        "room_id": room_id,
                        "kind": "negative",
                        "so": i,
                        "txt": t,
                    },
                )


def upgrade() -> None:
    op.create_table(
        "ai_summaries",
        sa.Column("room_id", sa.Uuid(), nullable=False),
        sa.Column("ai_recommendation", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["room_id"], ["analytics_rooms.room_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("room_id"),
    )
    op.create_table(
        "candidate_reports",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("room_id", sa.Uuid(), nullable=False),
        sa.Column("summary_candidate_name", sa.String(length=256), nullable=True),
        sa.Column("summary_final_verdict", sa.String(length=64), nullable=True),
        sa.ForeignKeyConstraint(["room_id"], ["analytics_rooms.room_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("room_id"),
    )
    op.create_table(
        "interviewer_assessments",
        sa.Column("room_id", sa.Uuid(), nullable=False),
        sa.Column("system_design", sa.Integer(), nullable=False),
        sa.Column("code_readability", sa.Integer(), nullable=False),
        sa.Column("communication_skills", sa.Integer(), nullable=False),
        sa.Column("coachability", sa.Integer(), nullable=False),
        sa.Column("verdict", sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(["room_id"], ["analytics_rooms.room_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("room_id"),
    )
    op.create_table(
        "session_histories",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("room_id", sa.Uuid(), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["room_id"], ["analytics_rooms.room_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("room_id"),
    )
    op.create_table(
        "ai_summary_bullets",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("room_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["room_id"], ["ai_summaries.room_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "code_snapshots",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("session_history_id", sa.Uuid(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("timestamp", sa.String(length=64), nullable=False),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("language", sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(["session_history_id"], ["session_histories.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "comparatives",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("candidate_report_id", sa.Uuid(), nullable=False),
        sa.Column("candidate_z_score", sa.Float(), nullable=False),
        sa.Column("percentile", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["candidate_report_id"], ["candidate_reports.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_report_id"),
    )
    op.create_table(
        "complexity_points",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("candidate_report_id", sa.Uuid(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("timestamp", sa.String(length=64), nullable=False),
        sa.Column("complexity", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["candidate_report_id"], ["candidate_reports.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "interviewer_notes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("session_history_id", sa.Uuid(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("timestamp", sa.String(length=64), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["session_history_id"], ["session_histories.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "radar_metrics",
        sa.Column("candidate_report_id", sa.Uuid(), nullable=False),
        sa.Column("system_design", sa.Integer(), nullable=False),
        sa.Column("code_readability", sa.Integer(), nullable=False),
        sa.Column("communication", sa.Integer(), nullable=False),
        sa.Column("coachability", sa.Integer(), nullable=False),
        sa.Column("technical_score", sa.Integer(), nullable=False),
        sa.Column("integrity", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["candidate_report_id"], ["candidate_reports.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("candidate_report_id"),
    )
    op.create_table(
        "timeline_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("candidate_report_id", sa.Uuid(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("timestamp", sa.String(length=64), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("label", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["candidate_report_id"], ["candidate_reports.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "curve_points",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("comparative_id", sa.Uuid(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("x", sa.Float(), nullable=False),
        sa.Column("y", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["comparative_id"], ["comparatives.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    conn = op.get_bind()
    _migrate_json_data(conn)

    op.drop_column("analytics_rooms", "assessment_json")
    op.drop_column("analytics_rooms", "ai_summary_json")
    op.drop_column("analytics_rooms", "history_json")
    op.drop_column("analytics_rooms", "candidate_report_json")


def downgrade() -> None:
    op.add_column(
        "analytics_rooms",
        sa.Column(
            "candidate_report_json",
            postgresql.JSON(astext_type=sa.Text()),
            autoincrement=False,
            nullable=True,
        ),
    )
    op.add_column(
        "analytics_rooms",
        sa.Column(
            "history_json",
            postgresql.JSON(astext_type=sa.Text()),
            autoincrement=False,
            nullable=True,
        ),
    )
    op.add_column(
        "analytics_rooms",
        sa.Column(
            "ai_summary_json",
            postgresql.JSON(astext_type=sa.Text()),
            autoincrement=False,
            nullable=True,
        ),
    )
    op.add_column(
        "analytics_rooms",
        sa.Column(
            "assessment_json",
            postgresql.JSON(astext_type=sa.Text()),
            autoincrement=False,
            nullable=True,
        ),
    )

    op.drop_table("curve_points")
    op.drop_table("comparatives")
    op.drop_table("radar_metrics")
    op.drop_table("timeline_events")
    op.drop_table("complexity_points")
    op.drop_table("candidate_reports")
    op.drop_table("code_snapshots")
    op.drop_table("interviewer_notes")
    op.drop_table("session_histories")
    op.drop_table("ai_summary_bullets")
    op.drop_table("ai_summaries")
    op.drop_table("interviewer_assessments")
