"""Заполнение БД тестовыми данными.

Запуск из каталога AnaliticsService:
  python3 seed_test_data.py

Использует DATABASE_URL из .env или SQLite по умолчанию.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import crud
from database import SessionLocal, run_migrations
from models import Room, RoomRealtimeEvent
from seed_algo_interview_data import (
    ROOM_ALGO_INTERVIEW,
    build_algo_session_history,
    session_start_for_violations,
)
from sqlalchemy import delete
from sqlalchemy.orm import Session
from schemas import (
    AISummaryResponse,
    CandidateReport,
    CodeSnapshot,
    Comparative,
    ComplexityPoint,
    CurvePoint,
    InterviewerAssessment,
    InterviewerNote,
    RadarMetrics,
    SessionHistory,
    TimelineEvent,
)

ROOM_FULL = uuid.UUID("11111111-1111-1111-1111-111111111111")
ROOM_PASSED = uuid.UUID("22222222-2222-2222-2222-222222222222")
ROOM_METRICS_ONLY = uuid.UUID("33333333-3333-3333-3333-333333333333")


def _dt(*args: int) -> datetime:
    return datetime(*args, tzinfo=timezone.utc)


def build_history_1() -> SessionHistory:
    return SessionHistory(
        startTime=_dt(2026, 4, 8, 9, 0, 0),
        endTime=_dt(2026, 4, 8, 10, 45, 0),
        codeSnapshots=[
            CodeSnapshot(
                timestamp="09:05",
                code="fun main() = println('hello')",
                language="kotlin",
            ),
            CodeSnapshot(
                timestamp="10:12",
                code="data class Node(val v: Int, val next: Node?)",
                language="kotlin",
            ),
        ],
        interviewerNotes=[
            InterviewerNote(timestamp="09:02", text="Кандидат начал с простого примера"),
            InterviewerNote(timestamp="10:40", text="Обсудили сложность связного списка"),
        ],
    )


def build_history_2() -> SessionHistory:
    return SessionHistory(
        startTime=_dt(2026, 4, 7, 14, 0, 0),
        endTime=_dt(2026, 4, 7, 15, 20, 0),
        codeSnapshots=[
            CodeSnapshot(
                timestamp="14:10",
                code="class Solution { public int[] twoSum(int[] nums, int t) { ... } }",
                language="java",
            ),
        ],
        interviewerNotes=[
            InterviewerNote(timestamp="14:05", text="Уверенно объяснил подход hash map"),
        ],
    )


def build_report_1() -> CandidateReport:
    return CandidateReport(
        summary={"candidateName": "Павел", "finalVerdict": "FAILED"},
        timelineEvents=[
            TimelineEvent(timestamp="01:05", type="NOTE", label="Приступил к задаче"),
            TimelineEvent(timestamp="15:51", type="PASTE", label="Вставка кода"),
        ],
        complexityTrend=[
            ComplexityPoint(timestamp="01:30", complexity=2),
            ComplexityPoint(timestamp="15:51", complexity=12),
        ],
        radarMetrics=RadarMetrics(
            systemDesign=3,
            codeReadability=4,
            communication=2,
            coachability=3,
            technicalScore=2,
            integrity=1,
        ),
        comparative=Comparative(
            candidateZScore=-1.2,
            percentile=15,
            distributionCurve=[
                CurvePoint(x=-3.0, y=0.01),
                CurvePoint(x=0.0, y=0.4),
            ],
        ),
    )


def build_report_2() -> CandidateReport:
    return CandidateReport(
        summary={"candidateName": "Анна", "finalVerdict": "PASSED"},
        timelineEvents=[
            TimelineEvent(timestamp="00:10", type="NOTE", label="Старт"),
            TimelineEvent(timestamp="20:00", type="TAB_SWITCH", label="Документация"),
        ],
        complexityTrend=[
            ComplexityPoint(timestamp="05:00", complexity=3),
            ComplexityPoint(timestamp="25:00", complexity=7),
        ],
        radarMetrics=RadarMetrics(
            systemDesign=4,
            codeReadability=5,
            communication=4,
            coachability=4,
            technicalScore=5,
            integrity=5,
        ),
        comparative=Comparative(
            candidateZScore=0.8,
            percentile=72,
            distributionCurve=[
                CurvePoint(x=-2.0, y=0.05),
                CurvePoint(x=1.0, y=0.35),
            ],
        ),
    )


def build_ai_1() -> AISummaryResponse:
    return AISummaryResponse(
        positivePoints=["Использовал современные конструкции Kotlin"],
        negativePoints=["Подозрение на плагиат: резкий скачок сложности при Paste"],
        aiRecommendation="Не рекомендуется к найму из-за аномального поведения.",
    )


def build_ai_2() -> AISummaryResponse:
    return AISummaryResponse(
        positivePoints=["Чистый код", "Корректная оценка сложности"],
        negativePoints=["Мало вопросов к интервьюеру"],
        aiRecommendation="Рекомендуется пригласить на следующий этап.",
    )


def build_report_algo() -> CandidateReport:
    return CandidateReport(
        summary={"candidateName": "Елена", "finalVerdict": "PASSED"},
        timelineEvents=[
            TimelineEvent(timestamp="14:05", type="NOTE", label="Старт live-coding"),
            TimelineEvent(timestamp="14:25", type="PASTE", label="Вставка шаблона deque"),
            TimelineEvent(timestamp="14:40", type="TAB_SWITCH", label="Смена вкладки"),
            TimelineEvent(timestamp="14:55", type="PASTE", label="Вставка теста"),
        ],
        complexityTrend=[
            ComplexityPoint(timestamp="14:20", complexity=35),
            ComplexityPoint(timestamp="15:30", complexity=78),
        ],
        radarMetrics=RadarMetrics(
            systemDesign=4,
            codeReadability=5,
            communication=4,
            coachability=4,
            technicalScore=5,
            integrity=4,
        ),
        comparative=Comparative(
            candidateZScore=0.5,
            percentile=62,
            distributionCurve=[
                CurvePoint(x=-2.0, y=0.05),
                CurvePoint(x=0.5, y=0.35),
            ],
        ),
    )


def build_ai_algo() -> AISummaryResponse:
    return AISummaryResponse(
        positivePoints=[
            "Корректно реализован алгоритм Кана для топологической сортировки",
            "Обсудила циклы и граничные случаи",
        ],
        negativePoints=[
            "Два события paste во время сессии",
            "Кратковременный tab switch в середине решения",
        ],
        aiRecommendation="Сильный алгоритмический уровень; нарушения дисциплины сессии умеренные.",
    )


def _seed_realtime_violations(
    session: Session,
    room_id: uuid.UUID,
    anchor: datetime,
    events: list[tuple[str, timedelta]],
) -> None:
    """Удаляет старые события комнаты, пишет новые и синхронизирует счётчики Room."""
    session.execute(delete(RoomRealtimeEvent).where(RoomRealtimeEvent.room_id == room_id))
    pastes = 0
    switches = 0
    for kind, delta in events:
        created = anchor + delta
        if kind == "paste":
            pastes += 1
            event_type = "paste"
        else:
            switches += 1
            event_type = "tab_switch"
        session.add(
            RoomRealtimeEvent(
                room_id=room_id,
                event_type=event_type,
                created_at=created,
            )
        )
    room = session.get(Room, room_id)
    if room is not None:
        room.pastes = pastes
        room.switches = switches
    session.commit()


def main() -> None:
    run_migrations()
    session = SessionLocal()
    try:
        crud.save_room_history(session, ROOM_FULL, build_history_1())
        crud.save_assessment(
            session,
            ROOM_FULL,
            InterviewerAssessment(
                systemDesign=3,
                codeReadability=4,
                communicationSkills=2,
                coachability=3,
                verdict="FAILED",
            ),
        )
        crud.save_candidate_report(session, ROOM_FULL, build_report_1())
        crud.save_ai_summary(session, ROOM_FULL, build_ai_1())
        crud.set_room_metrics(session, ROOM_FULL, 14, 6)

        crud.save_room_history(session, ROOM_PASSED, build_history_2())
        crud.save_assessment(
            session,
            ROOM_PASSED,
            InterviewerAssessment(
                systemDesign=4,
                codeReadability=5,
                communicationSkills=4,
                coachability=5,
                verdict="PASSED",
            ),
        )
        crud.save_candidate_report(session, ROOM_PASSED, build_report_2())
        crud.save_ai_summary(session, ROOM_PASSED, build_ai_2())
        crud.set_room_metrics(session, ROOM_PASSED, 3, 1)

        crud.set_room_metrics(session, ROOM_METRICS_ONLY, 42, 18)

        algo_history = build_algo_session_history()
        crud.save_room_history(session, ROOM_ALGO_INTERVIEW, algo_history)
        _seed_realtime_violations(
            session,
            ROOM_ALGO_INTERVIEW,
            session_start_for_violations(),
            [
                ("paste", timedelta(minutes=25)),
                ("tab_switch", timedelta(minutes=40)),
                ("paste", timedelta(minutes=55)),
            ],
        )
        crud.save_assessment(
            session,
            ROOM_ALGO_INTERVIEW,
            InterviewerAssessment(
                systemDesign=4,
                codeReadability=5,
                communicationSkills=4,
                coachability=4,
                verdict="PASSED",
            ),
        )
        crud.save_candidate_report(session, ROOM_ALGO_INTERVIEW, build_report_algo())
        crud.save_ai_summary(session, ROOM_ALGO_INTERVIEW, build_ai_algo())
    finally:
        session.close()

    print("Готово. Тестовые room_id:")
    print(f"  полный набор:     {ROOM_FULL}")
    print(f"  успешное интервью: {ROOM_PASSED}")
    print(f"  только метрики:   {ROOM_METRICS_ONLY}")
    print(f"  алго-собеседование (50+ снепшотов): {ROOM_ALGO_INTERVIEW}")


if __name__ == "__main__":
    main()
