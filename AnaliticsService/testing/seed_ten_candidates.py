"""Вставка 10 тестовых «кандидатов» (комнат) в БД аналитики.

Каждая запись: комната, история сессии (снепшоты + заметки), события paste/tab,
оценка интервьюера, candidate_report с именем и radar_metrics, AI-резюме (bullets).

Запуск (пароль и хост не хранятся в репозитории):

  export DATABASE_URL='postgresql+psycopg2://USER:PASSWORD@HOST:5432/DBNAME'
  cd AnaliticsService && python3 testing/seed_ten_candidates.py

Повторный запуск удаляет прежние данные по тем же room_id и вставляет заново.
"""

from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

_HERE = Path(__file__).resolve().parent
_ROOT = _HERE.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))


def _py_snapshot_body(level: int) -> str:
    """Немного растущий по объёму Python для анализа сложности."""
    lines = [
        "from typing import List\n",
        "\n",
        "def two_sum(nums: List[int], target: int) -> List[int]:\n",
        "    seen: dict[int, int] = {}\n",
        "    for i, x in enumerate(nums):\n",
        "        need = target - x\n",
        "        if need in seen:\n",
        "            return [seen[need], i]\n",
        "        seen[x] = i\n",
        "    return []\n",
    ]
    extra = "\n".join(f"def helper_{j}(n: int) -> int:\n    return n + {j}\n" for j in range(level))
    return "".join(lines) + "\n" + extra


def _candidate_room_specs() -> list[dict]:
    """Детерминированные UUID комнат — удобно дергать API по id."""
    return [
        {
            "room_id": uuid.UUID("c0ffee01-0001-4000-8000-000000000001"),
            "name": "Анна Волкова",
            "verdict": "PASSED",
            "pastes": 0,
            "switches": 1,
            "assess": (5, 5, 4, 5),
            "radar": (88, 90, 85, 87, 86, 92),
            "day": 0,
        },
        {
            "room_id": uuid.UUID("c0ffee01-0002-4000-8000-000000000002"),
            "name": "Борис Ким",
            "verdict": "PASSED",
            "pastes": 1,
            "switches": 0,
            "assess": (4, 5, 5, 4),
            "radar": (82, 88, 90, 80, 84, 88),
            "day": 1,
        },
        {
            "room_id": uuid.UUID("c0ffee01-0003-4000-8000-000000000003"),
            "name": "Виктория Ли",
            "verdict": "FAILED",
            "pastes": 4,
            "switches": 3,
            "assess": (2, 3, 3, 2),
            "radar": (45, 50, 48, 42, 40, 55),
            "day": 2,
        },
        {
            "room_id": uuid.UUID("c0ffee01-0004-4000-8000-000000000004"),
            "name": "Глеб Смирнов",
            "verdict": "PASSED",
            "pastes": 1,
            "switches": 2,
            "assess": (4, 4, 4, 5),
            "radar": (78, 80, 79, 85, 77, 80),
            "day": 3,
        },
        {
            "room_id": uuid.UUID("c0ffee01-0005-4000-8000-000000000005"),
            "name": "Дарья Орлова",
            "verdict": "PASSED",
            "pastes": 2,
            "switches": 1,
            "assess": (4, 5, 4, 4),
            "radar": (80, 85, 82, 83, 81, 86),
            "day": 4,
        },
        {
            "room_id": uuid.UUID("c0ffee01-0006-4000-8000-000000000006"),
            "name": "Егор Назаров",
            "verdict": "FAILED",
            "pastes": 5,
            "switches": 4,
            "assess": (2, 2, 3, 2),
            "radar": (38, 42, 45, 40, 35, 50),
            "day": 5,
        },
        {
            "room_id": uuid.UUID("c0ffee01-0007-4000-8000-000000000007"),
            "name": "Жанна Петрова",
            "verdict": "PASSED",
            "pastes": 0,
            "switches": 0,
            "assess": (5, 4, 5, 5),
            "radar": (90, 85, 92, 88, 89, 91),
            "day": 6,
        },
        {
            "room_id": uuid.UUID("c0ffee01-0008-4000-8000-000000000008"),
            "name": "Илья Зайцев",
            "verdict": "PASSED",
            "pastes": 1,
            "switches": 3,
            "assess": (3, 4, 4, 4),
            "radar": (70, 75, 78, 76, 72, 74),
            "day": 7,
        },
        {
            "room_id": uuid.UUID("c0ffee01-0009-4000-8000-000000000009"),
            "name": "Ксения Морозова",
            "verdict": "FAILED",
            "pastes": 3,
            "switches": 2,
            "assess": (3, 3, 4, 3),
            "radar": (55, 58, 62, 55, 52, 60),
            "day": 8,
        },
        {
            "room_id": uuid.UUID("c0ffee01-000a-4000-8000-00000000000a"),
            "name": "Лев Андреев",
            "verdict": "PASSED",
            "pastes": 2,
            "switches": 2,
            "assess": (4, 4, 5, 4),
            "radar": (76, 78, 88, 80, 75, 82),
            "day": 9,
        },
    ]


def seed_analytics_candidates(session) -> list[dict]:
    """Вставляет 10 комнат: сессия, метрики, отчёт, радар, AI-резюме. Делает commit."""
    from models import (
        AISummaryBulletRecord,
        AISummaryRecord,
        CandidateReportRecord,
        CodeSnapshotRecord,
        InterviewerAssessmentRecord,
        InterviewerNoteRecord,
        RadarMetricRecord,
        Room,
        RoomRealtimeEvent,
        SessionHistoryRecord,
    )

    specs = _candidate_room_specs()
    for c in specs:
        rid = c["room_id"]
        existing = session.get(Room, rid)
        if existing:
            session.delete(existing)
            session.flush()

        room = Room(room_id=rid, pastes=c["pastes"], switches=c["switches"])
        session.add(room)

        base = datetime(2026, 3, 1, 9, 0, tzinfo=timezone.utc) + timedelta(days=c["day"])
        start = base.replace(hour=10, minute=0)
        end = start + timedelta(hours=1, minutes=20)

        sh = SessionHistoryRecord(room_id=rid, start_time=start, end_time=end)
        session.add(sh)
        session.flush()

        for i in range(6):
            session.add(
                CodeSnapshotRecord(
                    session_history_id=sh.id,
                    sort_order=i,
                    timestamp=f"{10 + i // 2:02d}:{(i % 2) * 20:02d}",
                    code=_py_snapshot_body(i),
                    language="python",
                )
            )

        notes = [
            ("10:05", "Уточнила постановку задачи"),
            ("10:12", "Предложила тест-кейсы"),
            ("10:18", "Обсудили сложность по времени"),
            ("10:25", "Небольшая подсказка по хэш-таблице"),
            ("10:33", "Корректная реализация two-sum"),
            ("10:40", "Вопросы по edge cases"),
            ("10:48", "Объяснила выбор структуры данных"),
            ("10:55", "Итог по коммуникации: спокойно и чётко"),
        ]
        for i, (ts, text) in enumerate(notes):
            session.add(
                InterviewerNoteRecord(
                    session_history_id=sh.id,
                    sort_order=i,
                    timestamp=ts,
                    text=text,
                )
            )

        t_evt = start + timedelta(minutes=7)
        for _ in range(c["pastes"]):
            session.add(
                RoomRealtimeEvent(
                    room_id=rid,
                    event_type="paste",
                    created_at=t_evt,
                )
            )
            t_evt += timedelta(seconds=40)
        for _ in range(c["switches"]):
            session.add(
                RoomRealtimeEvent(
                    room_id=rid,
                    event_type="tab_switch",
                    created_at=t_evt,
                )
            )
            t_evt += timedelta(seconds=50)

        sd, crb, comm, coach = c["assess"]
        session.add(
            InterviewerAssessmentRecord(
                room_id=rid,
                system_design=sd,
                code_readability=crb,
                communication_skills=comm,
                coachability=coach,
                verdict=c["verdict"],
            )
        )

        r_sd, r_cr, r_cm, r_ch, r_ts, r_in = c["radar"]
        cr_row = CandidateReportRecord(
            room_id=rid,
            summary_candidate_name=c["name"],
            summary_final_verdict=c["verdict"],
        )
        session.add(cr_row)
        session.flush()
        session.add(
            RadarMetricRecord(
                candidate_report_id=cr_row.id,
                system_design=r_sd,
                code_readability=r_cr,
                communication=r_cm,
                coachability=r_ch,
                technical_score=r_ts,
                integrity=r_in,
            )
        )

        passed = c["verdict"] == "PASSED"
        recommendation = (
            "Рекомендуем пригласить на следующий этап воронки."
            if passed
            else "Текущий уровень не соответствует планке по техническому интервью."
        )
        positive = [
            "Понятно объясняет ход мыслей при написании кода.",
            "Задаёт уточняющие вопросы по формулировке задачи.",
        ]
        if passed:
            positive.append("Уверенно работает с базовыми структурами данных.")
        negative: list[str] = []
        if c["pastes"] > 2:
            negative.append("Частые вставки из буфера — стоит обсудить контекст с командой.")
        if not passed:
            negative.append("Недостаточная глубина разбора граничных случаев.")
        if not negative:
            negative.append("Мало названо альтернативных подходов к решению.")

        session.add(AISummaryRecord(room_id=rid, ai_recommendation=recommendation))
        session.flush()
        for i, t in enumerate(positive):
            session.add(AISummaryBulletRecord(room_id=rid, kind="positive", sort_order=i, text=t))
        for i, t in enumerate(negative):
            session.add(AISummaryBulletRecord(room_id=rid, kind="negative", sort_order=i, text=t))

    session.commit()
    return specs


def main() -> None:
    if not os.environ.get("DATABASE_URL"):
        raise SystemExit(
            "Задайте DATABASE_URL, например:\n"
            "  export DATABASE_URL='postgresql+psycopg2://user:pass@host:5432/neo_analytics'"
        )

    from sqlalchemy.orm import Session

    from database import SessionLocal, engine

    session: Session = SessionLocal()
    try:
        specs = seed_analytics_candidates(session)
        print("Вставлено 10 кандидатов (комнат). room_id:")
        for c in specs:
            print(f"  {c['room_id']}  — {c['name']}, {c['verdict']}")
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
        engine.dispose()


if __name__ == "__main__":
    main()
