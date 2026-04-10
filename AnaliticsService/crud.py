"""CRUD-операции над комнатами, сессиями, отчётами и realtime-метриками аналитики."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from models import (
    AISummaryBulletRecord,
    AISummaryRecord,
    CandidateReportRecord,
    CodeSnapshotRecord,
    ComparativeRecord,
    ComplexityPointRecord,
    CurvePointRecord,
    InterviewerAssessmentRecord,
    InterviewerNoteRecord,
    RadarMetricRecord,
    Room,
    RoomRealtimeEvent,
    SessionHistoryRecord,
    TimelineEventRecord,
)
from schemas import (
    AISummaryResponse,
    CandidateReport,
    InterviewerAssessment,
    SessionHistory,
)


def get_or_create_room(session: Session, room_id: uuid.UUID) -> Room:
    """Возвращает комнату по UUID или создаёт строку с нулевыми счётчиками paste/switch."""
    room = session.get(Room, room_id)
    if room is None:
        room = Room(room_id=room_id, pastes=0, switches=0)
        session.add(room)
        session.flush()
    return room


def _delete_derived_candidate_report_and_ai(session: Session, room_id: uuid.UUID) -> None:
    """Удаляет производные candidate-report и AI-summary (без commit).

    Оценку интервьюера (`interviewer_assessments`) не трогаем: она задаётся в модалке
    завершения интервью и приходит в БД *до* POST /history; прежняя логика удаляла её
    здесь же и обнуляла радар на странице отчёта.
    """
    if cr := session.scalar(
        select(CandidateReportRecord).where(CandidateReportRecord.room_id == room_id)
    ):
        session.delete(cr)
    if ai := session.get(AISummaryRecord, room_id):
        session.delete(ai)


def save_room_history(session: Session, room_id: uuid.UUID, history: SessionHistory) -> None:
    """Полностью заменяет историю сессии (снепшоты и заметки); сбрасывает только производный отчёт и AI."""
    get_or_create_room(session, room_id)
    _delete_derived_candidate_report_and_ai(session, room_id)
    if sh := session.scalar(
        select(SessionHistoryRecord).where(SessionHistoryRecord.room_id == room_id)
    ):
        session.delete(sh)
        session.flush()

    sh = SessionHistoryRecord(
        room_id=room_id,
        start_time=history.startTime,
        end_time=history.endTime,
    )
    session.add(sh)
    session.flush()
    for i, cs in enumerate(history.codeSnapshots):
        session.add(
            CodeSnapshotRecord(
                session_history_id=sh.id,
                sort_order=i,
                timestamp=cs.timestamp,
                code=cs.code,
                language=cs.language,
            )
        )
    for i, note in enumerate(history.interviewerNotes):
        session.add(
            InterviewerNoteRecord(
                session_history_id=sh.id,
                sort_order=i,
                timestamp=note.timestamp,
                text=note.text,
            )
        )
    session.commit()


def increment_pastes(session: Session, room_id: uuid.UUID) -> int:
    """+1 к счётчику paste, запись `RoomRealtimeEvent` с текущим временем; возвращает новое значение."""
    room = get_or_create_room(session, room_id)
    room.pastes += 1
    now = datetime.now(timezone.utc)
    session.add(
        RoomRealtimeEvent(
            room_id=room_id,
            event_type="paste",
            created_at=now,
        )
    )
    session.commit()
    session.refresh(room)
    return room.pastes


def increment_switches(session: Session, room_id: uuid.UUID) -> int:
    """+1 к счётчику tab_switch и событие в БД; возвращает новое значение счётчика."""
    room = get_or_create_room(session, room_id)
    room.switches += 1
    now = datetime.now(timezone.utc)
    session.add(
        RoomRealtimeEvent(
            room_id=room_id,
            event_type="tab_switch",
            created_at=now,
        )
    )
    session.commit()
    session.refresh(room)
    return room.switches


def save_assessment(session: Session, room_id: uuid.UUID, assessment: InterviewerAssessment) -> None:
    """Создаёт или обновляет строку `interviewer_assessments` для комнаты."""
    get_or_create_room(session, room_id)
    row = session.get(InterviewerAssessmentRecord, room_id)
    if row is None:
        row = InterviewerAssessmentRecord(
            room_id=room_id,
            system_design=assessment.systemDesign,
            code_readability=assessment.codeReadability,
            communication_skills=assessment.communicationSkills,
            coachability=assessment.coachability,
            verdict=assessment.verdict,
        )
        session.add(row)
    else:
        row.system_design = assessment.systemDesign
        row.code_readability = assessment.codeReadability
        row.communication_skills = assessment.communicationSkills
        row.coachability = assessment.coachability
        row.verdict = assessment.verdict
    session.commit()


def save_candidate_report(session: Session, room_id: uuid.UUID, report: CandidateReport) -> None:
    """Заменяет отчёт кандидата: summary, таймлайн, точки сложности, radar, comparative и кривую."""
    get_or_create_room(session, room_id)
    if old := session.scalar(
        select(CandidateReportRecord).where(CandidateReportRecord.room_id == room_id)
    ):
        session.delete(old)
        session.flush()

    summary = report.summary or {}
    name = summary.get("candidateName") or summary.get("candidate_name")
    verdict = summary.get("finalVerdict") or summary.get("final_verdict")

    cr = CandidateReportRecord(
        room_id=room_id,
        summary_candidate_name=name,
        summary_final_verdict=verdict,
    )
    session.add(cr)
    session.flush()

    for i, ev in enumerate(report.timelineEvents):
        session.add(
            TimelineEventRecord(
                candidate_report_id=cr.id,
                sort_order=i,
                timestamp=ev.timestamp,
                event_type=ev.type,
                label=ev.label,
            )
        )
    for i, cp in enumerate(report.complexityTrend):
        session.add(
            ComplexityPointRecord(
                candidate_report_id=cr.id,
                sort_order=i,
                timestamp=cp.timestamp,
                complexity=cp.complexity,
            )
        )
    rm = report.radarMetrics
    session.add(
        RadarMetricRecord(
            candidate_report_id=cr.id,
            system_design=rm.systemDesign,
            code_readability=rm.codeReadability,
            communication=rm.communication,
            coachability=rm.coachability,
            technical_score=rm.technicalScore,
            integrity=rm.integrity,
        )
    )
    comp = ComparativeRecord(
        candidate_report_id=cr.id,
        candidate_z_score=report.comparative.candidateZScore,
        percentile=report.comparative.percentile,
    )
    session.add(comp)
    session.flush()
    for i, pt in enumerate(report.comparative.distributionCurve):
        session.add(
            CurvePointRecord(
                comparative_id=comp.id,
                sort_order=i,
                x=pt.x,
                y=pt.y,
            )
        )
    session.commit()


def save_ai_summary(session: Session, room_id: uuid.UUID, summary: AISummaryResponse) -> None:
    """Заменяет AI-резюме и списки положительных/отрицательных пунктов для комнаты."""
    get_or_create_room(session, room_id)
    if old := session.get(AISummaryRecord, room_id):
        session.delete(old)
        session.flush()

    ai = AISummaryRecord(room_id=room_id, ai_recommendation=summary.aiRecommendation)
    session.add(ai)
    session.flush()
    for i, t in enumerate(summary.positivePoints):
        session.add(
            AISummaryBulletRecord(room_id=room_id, kind="positive", sort_order=i, text=t)
        )
    for i, t in enumerate(summary.negativePoints):
        session.add(
            AISummaryBulletRecord(room_id=room_id, kind="negative", sort_order=i, text=t)
        )
    session.commit()


def set_room_metrics(session: Session, room_id: uuid.UUID, pastes: int, switches: int) -> None:
    """Явно выставляет счётчики paste/switch (без добавления строк в `room_realtime_events`)."""
    room = get_or_create_room(session, room_id)
    room.pastes = pastes
    room.switches = switches
    session.commit()
