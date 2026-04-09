import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid

from database import Base


class Room(Base):
    __tablename__ = "analytics_rooms"

    room_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    pastes: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    switches: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    session_history: Mapped[Optional["SessionHistoryRecord"]] = relationship(
        back_populates="room",
        uselist=False,
        cascade="all, delete-orphan",
    )
    assessment: Mapped[Optional["InterviewerAssessmentRecord"]] = relationship(
        back_populates="room",
        uselist=False,
        cascade="all, delete-orphan",
    )
    candidate_report: Mapped[Optional["CandidateReportRecord"]] = relationship(
        back_populates="room",
        uselist=False,
        cascade="all, delete-orphan",
    )
    ai_summary: Mapped[Optional["AISummaryRecord"]] = relationship(
        back_populates="room",
        uselist=False,
        cascade="all, delete-orphan",
    )
    realtime_events: Mapped[List["RoomRealtimeEvent"]] = relationship(
        back_populates="room",
        order_by="RoomRealtimeEvent.created_at",
        cascade="all, delete-orphan",
    )


class RoomRealtimeEvent(Base):
    """Одно срабатывание increment-paste или increment-tab-switch с меткой времени."""

    __tablename__ = "room_realtime_events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("analytics_rooms.room_id", ondelete="CASCADE"),
        nullable=False,
    )
    event_type: Mapped[str] = mapped_column(String(32), nullable=False)  # paste | tab_switch
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    room: Mapped["Room"] = relationship(back_populates="realtime_events")


class SessionHistoryRecord(Base):
    __tablename__ = "session_histories"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("analytics_rooms.room_id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    room: Mapped["Room"] = relationship(back_populates="session_history")
    code_snapshots: Mapped[List["CodeSnapshotRecord"]] = relationship(
        back_populates="session_history",
        order_by="CodeSnapshotRecord.sort_order",
        cascade="all, delete-orphan",
    )
    interviewer_notes: Mapped[List["InterviewerNoteRecord"]] = relationship(
        back_populates="session_history",
        order_by="InterviewerNoteRecord.sort_order",
        cascade="all, delete-orphan",
    )


class CodeSnapshotRecord(Base):
    __tablename__ = "code_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_history_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("session_histories.id", ondelete="CASCADE"),
        nullable=False,
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    timestamp: Mapped[str] = mapped_column(String(64), nullable=False)
    code: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str] = mapped_column(String(64), nullable=False)

    session_history: Mapped["SessionHistoryRecord"] = relationship(back_populates="code_snapshots")


class InterviewerNoteRecord(Base):
    __tablename__ = "interviewer_notes"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_history_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("session_histories.id", ondelete="CASCADE"),
        nullable=False,
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    timestamp: Mapped[str] = mapped_column(String(64), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)

    session_history: Mapped["SessionHistoryRecord"] = relationship(back_populates="interviewer_notes")


class InterviewerAssessmentRecord(Base):
    __tablename__ = "interviewer_assessments"

    room_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("analytics_rooms.room_id", ondelete="CASCADE"),
        primary_key=True,
    )
    system_design: Mapped[int] = mapped_column(Integer, nullable=False)
    code_readability: Mapped[int] = mapped_column(Integer, nullable=False)
    communication_skills: Mapped[int] = mapped_column(Integer, nullable=False)
    coachability: Mapped[int] = mapped_column(Integer, nullable=False)
    verdict: Mapped[str] = mapped_column(String(32), nullable=False)

    room: Mapped["Room"] = relationship(back_populates="assessment")


class CandidateReportRecord(Base):
    __tablename__ = "candidate_reports"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("analytics_rooms.room_id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    summary_candidate_name: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    summary_final_verdict: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    room: Mapped["Room"] = relationship(back_populates="candidate_report")
    timeline_events: Mapped[List["TimelineEventRecord"]] = relationship(
        back_populates="candidate_report",
        order_by="TimelineEventRecord.sort_order",
        cascade="all, delete-orphan",
    )
    complexity_points: Mapped[List["ComplexityPointRecord"]] = relationship(
        back_populates="candidate_report",
        order_by="ComplexityPointRecord.sort_order",
        cascade="all, delete-orphan",
    )
    radar_metrics: Mapped[Optional["RadarMetricRecord"]] = relationship(
        back_populates="candidate_report",
        uselist=False,
        cascade="all, delete-orphan",
    )
    comparative: Mapped[Optional["ComparativeRecord"]] = relationship(
        back_populates="candidate_report",
        uselist=False,
        cascade="all, delete-orphan",
    )


class TimelineEventRecord(Base):
    __tablename__ = "timeline_events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_report_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("candidate_reports.id", ondelete="CASCADE"),
        nullable=False,
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    timestamp: Mapped[str] = mapped_column(String(64), nullable=False)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str] = mapped_column(Text, nullable=False)

    candidate_report: Mapped["CandidateReportRecord"] = relationship(back_populates="timeline_events")


class ComplexityPointRecord(Base):
    __tablename__ = "complexity_points"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_report_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("candidate_reports.id", ondelete="CASCADE"),
        nullable=False,
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    timestamp: Mapped[str] = mapped_column(String(64), nullable=False)
    complexity: Mapped[int] = mapped_column(Integer, nullable=False)

    candidate_report: Mapped["CandidateReportRecord"] = relationship(back_populates="complexity_points")


class RadarMetricRecord(Base):
    __tablename__ = "radar_metrics"

    candidate_report_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("candidate_reports.id", ondelete="CASCADE"),
        primary_key=True,
    )
    system_design: Mapped[int] = mapped_column(Integer, nullable=False)
    code_readability: Mapped[int] = mapped_column(Integer, nullable=False)
    communication: Mapped[int] = mapped_column(Integer, nullable=False)
    coachability: Mapped[int] = mapped_column(Integer, nullable=False)
    technical_score: Mapped[int] = mapped_column(Integer, nullable=False)
    integrity: Mapped[int] = mapped_column(Integer, nullable=False)

    candidate_report: Mapped["CandidateReportRecord"] = relationship(back_populates="radar_metrics")


class ComparativeRecord(Base):
    __tablename__ = "comparatives"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_report_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("candidate_reports.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    candidate_z_score: Mapped[float] = mapped_column(Float, nullable=False)
    percentile: Mapped[int] = mapped_column(Integer, nullable=False)

    candidate_report: Mapped["CandidateReportRecord"] = relationship(back_populates="comparative")
    distribution_curve: Mapped[List["CurvePointRecord"]] = relationship(
        back_populates="comparative",
        order_by="CurvePointRecord.sort_order",
        cascade="all, delete-orphan",
    )


class CurvePointRecord(Base):
    __tablename__ = "curve_points"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    comparative_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("comparatives.id", ondelete="CASCADE"),
        nullable=False,
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    x: Mapped[float] = mapped_column(Float, nullable=False)
    y: Mapped[float] = mapped_column(Float, nullable=False)

    comparative: Mapped["ComparativeRecord"] = relationship(back_populates="distribution_curve")


class AISummaryRecord(Base):
    __tablename__ = "ai_summaries"

    room_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("analytics_rooms.room_id", ondelete="CASCADE"),
        primary_key=True,
    )
    ai_recommendation: Mapped[str] = mapped_column(Text, nullable=False)

    room: Mapped["Room"] = relationship(back_populates="ai_summary")
    bullets: Mapped[List["AISummaryBulletRecord"]] = relationship(
        back_populates="ai_summary",
        order_by="AISummaryBulletRecord.sort_order",
        cascade="all, delete-orphan",
    )


class AISummaryBulletRecord(Base):
    __tablename__ = "ai_summary_bullets"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("ai_summaries.room_id", ondelete="CASCADE"),
        nullable=False,
    )
    kind: Mapped[str] = mapped_column(String(16), nullable=False)  # positive | negative
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    text: Mapped[str] = mapped_column(Text, nullable=False)

    ai_summary: Mapped["AISummaryRecord"] = relationship(back_populates="bullets")
