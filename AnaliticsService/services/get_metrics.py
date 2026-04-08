import json
import math
import statistics
import sys
import uuid
from datetime import date, datetime, time, timezone, tzinfo
from pathlib import Path
from typing import Any

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from models import (
    CandidateReportRecord,
    InterviewerAssessmentRecord,
    Room,
    RoomRealtimeEvent,
    SessionHistoryRecord,
)

from .analize_code import AnalyticsEngine
from .complexity_analizer import ComplexityAnalyzer


def _parse_note_clock(clock: str, base_date: date, tz: tzinfo | None) -> datetime:
    """Склеивает дату сессии и строку времени вида HH:MM или HH:MM:SS."""
    tzi = tz or timezone.utc
    clock = (clock or "").strip()
    try:
        parts = clock.split(":")
        h = max(0, min(23, int(parts[0])))
        m = max(0, min(59, int(parts[1]))) if len(parts) > 1 else 0
        s = max(0, min(59, int(parts[2]))) if len(parts) > 2 else 0
        return datetime.combine(base_date, time(h, m, s, tzinfo=tzi))
    except (ValueError, IndexError):
        return datetime.combine(base_date, time(0, 0, 0, tzinfo=tzi))


def _normal_pdf_std(x: float) -> float:
    """Плотность стандартного нормального распределения N(0,1)."""
    return math.exp(-0.5 * x * x) / math.sqrt(2.0 * math.pi)


def _normal_cdf_std(z: float) -> float:
    """Функция распределения Φ(z) для N(0,1)."""
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))


class GetMetrics:
    def __init__(self, session: Session, room_id: uuid.UUID):
        self._session = session
        self.room_id = room_id
        self.data = self.get_data()

    def get_data(self) -> dict[str, Any]:
        """Все снимки кода и заметки интервьюера по комнате (по sort_order)."""
        sh = self._session.scalar(
            select(SessionHistoryRecord)
            .where(SessionHistoryRecord.room_id == self.room_id)
            .options(
                selectinload(SessionHistoryRecord.code_snapshots),
                selectinload(SessionHistoryRecord.interviewer_notes),
            )
        )
        if not sh:
            return {
                "startTime": None,
                "endTime": None,
                "codeSnapshots": [],
                "interviewerNotes": [],
            }

        snapshots = sorted(sh.code_snapshots, key=lambda c: c.sort_order)
        notes = sorted(sh.interviewer_notes, key=lambda n: n.sort_order)

        return {
            "startTime": sh.start_time,
            "endTime": sh.end_time,
            "codeSnapshots": [
                {"timestamp": c.timestamp, "code": c.code, "language": c.language}
                for c in snapshots
            ],
            "interviewerNotes": [
                {"timestamp": n.timestamp, "text": n.text}
                for n in notes
            ],
        }

    def get_violation(self) -> dict[str, Any]:
        """Paste и Tab Switch: суммарные счётчики и хронология (время каждого +1 из API)."""
        room = self._session.get(Room, self.room_id)
        pastes = room.pastes if room else 0
        switches = room.switches if room else 0

        events = self._session.scalars(
            select(RoomRealtimeEvent)
            .where(RoomRealtimeEvent.room_id == self.room_id)
            .order_by(RoomRealtimeEvent.created_at.asc())
        ).all()

        paste_at = [{"at": e.created_at.isoformat()} for e in events if e.event_type == "paste"]
        tab_at = [{"at": e.created_at.isoformat()} for e in events if e.event_type == "tab_switch"]

        return {
            "paste": pastes,
            "tabSwitch": switches,
            "pasteEvents": paste_at,
            "tabSwitchEvents": tab_at,
        }

    def get_timeline_events(self) -> list[dict[str, str]]:
        """Единая лента: NOTE (заметки интервьюера), PASTE, TAB_SWITCH — по времени.

        Формат как у TimelineEvent: timestamp (ISO), type, label.
        Время заметок: дата от startTime сессии (или от первого realtime-события) + clock из БД.
        """
        notes = self.data.get("interviewerNotes") or []
        raw = self._session.scalars(
            select(RoomRealtimeEvent)
            .where(RoomRealtimeEvent.room_id == self.room_id)
            .order_by(RoomRealtimeEvent.created_at.asc())
        ).all()

        start = self.data.get("startTime")
        anchor = start
        if anchor is None and raw:
            anchor = raw[0].created_at
        if anchor is None:
            anchor = datetime.now(timezone.utc)

        if getattr(anchor, "tzinfo", None) is None:
            anchor = anchor.replace(tzinfo=timezone.utc)
        base_date = anchor.date()
        tz = anchor.tzinfo

        items: list[tuple[datetime, dict[str, str]]] = []

        for n in notes:
            sort_dt = _parse_note_clock(n["timestamp"], base_date, tz)
            items.append(
                (
                    sort_dt,
                    {
                        "timestamp": sort_dt.isoformat(),
                        "type": "NOTE",
                        "label": n["text"],
                    },
                )
            )

        for e in raw:
            dt = e.created_at
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            if e.event_type == "paste":
                items.append(
                    (
                        dt,
                        {
                            "timestamp": dt.isoformat(),
                            "type": "PASTE",
                            "label": "Вставка из буфера",
                        },
                    )
                )
            elif e.event_type == "tab_switch":
                items.append(
                    (
                        dt,
                        {
                            "timestamp": dt.isoformat(),
                            "type": "TAB_SWITCH",
                            "label": "Смена фокуса вкладки",
                        },
                    )
                )

        items.sort(key=lambda x: x[0])
        return [p for _, p in items]

    def get_code_diff(self) -> list[dict[str, Any]]:
        """Снимки: эвристическая сложность (AnalyticsEngine) и цикломатическая (radon/lizard)."""
        code_snapshots = self.data.get("codeSnapshots") or []
        engine = AnalyticsEngine()
        snapshots: list[dict[str, Any]] = []
        for s in code_snapshots:
            code = s["code"]
            language = s["language"]
            cx_heuristic = engine.get_complexity(code, language)
            cx_cyclomatic = ComplexityAnalyzer.calculate(code, language)
            snapshots.append(
                {
                    "timestamp": s["timestamp"],
                    "language": language,
                    "code": code,
                    "complexity": cx_heuristic,
                    "cyclomaticComplexity": cx_cyclomatic,
                }
            )
        return snapshots

    def normalize_complexity(self) -> list[dict[str, Any]]:
        """Точки для графика: среднее нормализованных эвристики и цикломатики (0…1 по каждой оси)."""
        code_complex = self.get_code_diff()
        if not code_complex:
            return []

        max_cx = max(c["complexity"] for c in code_complex)
        max_cc = max(c["cyclomaticComplexity"] for c in code_complex)
        den_cx = max_cx if max_cx > 0 else 1
        den_cc = max_cc if max_cc > 0 else 1

        complexity_trend: list[dict[str, Any]] = []
        for c in code_complex:
            norm_h = c["complexity"] / den_cx
            norm_c = c["cyclomaticComplexity"] / den_cc
            complexity_trend.append(
                {
                    "timestamp": c["timestamp"],
                    "complexity": (norm_h + norm_c) / 2 if norm_c != 0 and norm_h != 0 else (norm_h + norm_c),
                }
            )
        return complexity_trend

    def _candidate_raw_score(self) -> float:
        """Сводный показатель для бенчмарка: средняя «сила» кода минус штраф за paste/tab.

        Шкала условная; μ и σ в get_comparative берутся из других комнат в БД (при достаточной выборке).
        """
        diffs = self.get_code_diff()
        vm = self.get_violation()
        if diffs:
            per_snap = [
                float(d["complexity"]) + float(d["cyclomaticComplexity"]) for d in diffs
            ]
            skill = sum(per_snap) / len(per_snap)
        else:
            skill = 0.0
        pastes = float(vm["paste"])
        switches = float(vm["tabSwitch"])
        return skill * 3.0 - 2.0 * pastes - 0.5 * switches

    def get_comparative(
        self,
        *,
        population_mean: float = 28.0,
        population_std: float = 10.0,
        curve_x_min: float = -3.5,
        curve_x_max: float = 3.5,
        curve_point_count: int = 48,
        min_peer_rooms: int = 2,
    ) -> dict[str, Any]:
        """Сравнение с пулом других комнат в БД: μ и σ по их сырым скорам, перцентиль — ранг среди пиров.

        Текущая комната в популяцию не входит. Если других комнат меньше min_peer_rooms,
        используются population_mean / population_std и нормальный перцентиль по Φ(z).

        Ось X графика — Z-score; кривая — эталон N(0,1) для визуализации.
        percentile (при эмпирическом режиме): доля пиров с сырым скором ≤ кандидата.
        """
        raw = self._candidate_raw_score()

        stmt = select(Room.room_id).where(Room.room_id != self.room_id)
        other_ids = list(self._session.scalars(stmt).all())

        peer_scores: list[float] = []
        for rid in other_ids:
            peer_scores.append(GetMetrics(self._session, rid)._candidate_raw_score())

        fallback_sigma = population_std if population_std > 1e-9 else 1.0

        if len(peer_scores) >= min_peer_rooms:
            mu = statistics.mean(peer_scores)
            sigma = statistics.pstdev(peer_scores)
            if sigma < 1e-6:
                sigma = fallback_sigma
            z = (raw - mu) / sigma
            pct_float = 100.0 * sum(1 for s in peer_scores if s <= raw) / len(peer_scores)
            percentile = int(round(max(0.0, min(100.0, pct_float))))
        else:
            mu = population_mean
            sigma = fallback_sigma
            z = (raw - mu) / sigma
            pct_float = _normal_cdf_std(z) * 100.0
            percentile = int(round(max(0.0, min(100.0, pct_float))))

        n = max(2, curve_point_count)
        step = (curve_x_max - curve_x_min) / (n - 1)
        xs = [curve_x_min + i * step for i in range(n)]
        ys = [_normal_pdf_std(x) for x in xs]
        ymax = max(ys) or 1.0
        curve = [{"x": round(x, 4), "y": round(y / ymax, 6)} for x, y in zip(xs, ys)]

        return {
            "candidateZScore": round(z, 2),
            "percentile": percentile,
            "distributionCurve": curve,
        }

    def get_radar_metrics(self) -> dict[str, int]:
        """Шесть осей радара из `radar_metrics` (через candidate_report комнаты); без строки — нули."""
        cr = self._session.scalar(
            select(CandidateReportRecord)
            .where(CandidateReportRecord.room_id == self.room_id)
            .options(selectinload(CandidateReportRecord.radar_metrics))
        )
        if not cr or cr.radar_metrics is None:
            return {
                "systemDesign": 0,
                "codeReadability": 0,
                "communication": 0,
                "coachability": 0,
                "technicalScore": 0,
                "integrity": 0,
            }
        rm = cr.radar_metrics
        return {
            "systemDesign": rm.system_design,
            "codeReadability": rm.code_readability,
            "communication": rm.communication,
            "coachability": rm.coachability,
            "technicalScore": rm.technical_score,
            "integrity": rm.integrity,
        }

    def _get_candidate_report_summary(self) -> dict[str, str]:
        cr = self._session.scalar(
            select(CandidateReportRecord).where(CandidateReportRecord.room_id == self.room_id)
        )
        name = (cr.summary_candidate_name if cr else None) or ""
        verdict = (cr.summary_final_verdict if cr else None) or ""
        if not verdict:
            assess = self._session.get(InterviewerAssessmentRecord, self.room_id)
            if assess and assess.verdict:
                verdict = assess.verdict
        return {"candidateName": name, "finalVerdict": verdict}

    def get_complexity_trend_for_report(self) -> list[dict[str, Any]]:
        """Точки тренда сложности для отчёта: timestamp из снапшотов, complexity 0–100 (из нормализованной средней)."""
        trend_raw = self.normalize_complexity()
        out: list[dict[str, Any]] = []
        for p in trend_raw:
            v = float(p["complexity"])
            scaled = max(0, min(100, int(round(v * 100.0))))
            out.append({"timestamp": str(p["timestamp"]), "complexity": scaled})
        return out

    def get_candidate_report(self) -> dict[str, Any]:
        """Полный payload для GET /api/v1/rooms/{idRoom}/candidate-report."""
        return {
            "summary": self._get_candidate_report_summary(),
            "timelineEvents": self.get_timeline_events(),
            "complexityTrend": self.get_complexity_trend_for_report(),
            "radarMetrics": self.get_radar_metrics(),
            "comparative": self.get_comparative(),
        }


def _main() -> None:
    from database import SessionLocal

    default_room = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    arg = sys.argv[1] if len(sys.argv) > 1 else default_room
    try:
        room_id = uuid.UUID(arg)
    except ValueError:
        print(f"Некорректный UUID: {arg}", file=sys.stderr)
        raise SystemExit(1)

    session = SessionLocal()
    try:
        data = GetMetrics(session, room_id).normalize_complexity()

        def _json_default(o: object) -> str:
            if isinstance(o, (datetime, date)):
                return o.isoformat()
            raise TypeError

        print(json.dumps(data, ensure_ascii=False, indent=2, default=_json_default))
    finally:
        session.close()


if __name__ == "__main__":
    _main()
