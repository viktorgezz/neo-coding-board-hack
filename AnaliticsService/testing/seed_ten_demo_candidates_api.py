"""Создаёт 10 демо-комнат в БД аналитики через публичный HTTP API (без прямого SQL).

Каждая комната получает: session history (код + заметки с именем кандидата),
метрики paste/tab, оценку интервьюера. После сидирования GET /candidate-report
должен отдавать данные для этих room_id.

Запуск из корня репозитория или из AnaliticsService:

  python testing/seed_ten_demo_candidates_api.py

Переменные окружения:
  API_BASE_URL  — по умолчанию http://111.88.127.60:8000
"""

from __future__ import annotations

import json
import os
import sys
import uuid
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

_HERE = Path(__file__).resolve().parent
_ROOT = _HERE.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

API_BASE_URL = os.environ.get("API_BASE_URL", "http://111.88.127.60:8000").rstrip("/")

NAMESPACE = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")

DEMO_NAMES = [
    "Смирнова Анна — демо 01",
    "Козлов Пётр — демо 02",
    "Волкова Елена — демо 03",
    "Новиков Дмитрий — демо 04",
    "Морозова Ольга — демо 05",
    "Павлов Алексей — демо 06",
    "Соколова Мария — демо 07",
    "Лебедев Игорь — демо 08",
    "Кузнецова Татьяна — демо 09",
    "Орлов Сергей — демо 10",
]


def room_uuid(index: int) -> uuid.UUID:
    """Стабильный UUID для комнаты i (1..10)."""
    return uuid.uuid5(NAMESPACE, f"neo-analytics-demo-candidate-{index:02d}")


def _request_json(method: str, path: str, payload: dict[str, Any] | None = None) -> tuple[int, Any]:
    url = f"{API_BASE_URL}{path}"
    body = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url=url,
        data=body,
        headers={"Content-Type": "application/json"},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            text = response.read().decode("utf-8")
            return response.status, json.loads(text) if text else {}
    except urllib.error.HTTPError as exc:
        err_text = exc.read().decode("utf-8", errors="replace")
        try:
            err_json = json.loads(err_text) if err_text else {}
        except json.JSONDecodeError:
            err_json = {"raw": err_text}
        return exc.code, err_json


def build_history_payload(name: str, index: int) -> dict[str, Any]:
    start = datetime.now(timezone.utc) - timedelta(hours=2 + index)
    end = start + timedelta(hours=1, minutes=15)
    t0 = start.isoformat()
    t1 = (start + timedelta(minutes=20)).isoformat()
    t2 = (start + timedelta(minutes=50)).isoformat()
    return {
        "startTime": start.isoformat(),
        "endTime": end.isoformat(),
        "codeSnapshots": [
            {"timestamp": t0, "code": f"// {name}\nfun main() {{ println(1) }}\n", "language": "kotlin"},
            {"timestamp": t1, "code": f"// {name}\nfun main() {{ println(2) }}\n", "language": "kotlin"},
            {"timestamp": t2, "code": f"// {name}\nfun main() {{ println(3) }}\n", "language": "kotlin"},
        ],
        "interviewerNotes": [
            {"timestamp": t0, "text": f"Кандидат: {name}. Начало интервью."},
            {"timestamp": t1, "text": "Уверенно формулирует решение."},
            {"timestamp": t2, "text": "Итог: готовность к обсуждению edge cases."},
        ],
    }


def build_assessment(index: int) -> dict[str, Any]:
    passed = index % 2 == 1  # нечётные PASSED, чётные FAILED
    return {
        "systemDesign": 3 + (index % 3),
        "codeReadability": 4,
        "communicationSkills": 4 if passed else 3,
        "coachability": 4,
        "verdict": "PASSED" if passed else "FAILED",
    }


def main() -> None:
    print(f"API: {API_BASE_URL}")
    print("Создаю 10 демо-комнат (аналитика)…\n")

    for i in range(1, 11):
        rid = room_uuid(i)
        name = DEMO_NAMES[i - 1]
        print(f"[{i}/10] room_id={rid}  ({name})")

        hist = build_history_payload(name, i)
        status, data = _request_json("POST", f"/api/v1/rooms/{rid}/history", hist)
        if status not in (200, 201):
            print(f"  !! POST history -> HTTP {status}: {data}")
            continue

        for _ in range(2):
            st, _ = _request_json("POST", f"/api/v1/rooms/{rid}/metrics/increment-paste")
            if st != 200:
                print(f"  !! paste -> HTTP {st}")

        st, _ = _request_json("POST", f"/api/v1/rooms/{rid}/metrics/increment-tab-switch")
        if st != 200:
            print(f"  !! tab -> HTTP {st}")

        assess = build_assessment(i)
        st, data = _request_json(
            "POST",
            f"/api/v1/rooms/{rid}/interviewer-assessment",
            assess,
        )
        if st != 200:
            print(f"  !! assessment -> HTTP {st}: {data}")
        else:
            print(f"  OK history + metrics + assessment (вердикт {assess['verdict']})")

    print("\n--- Проверка отчёта (первая комната) ---")
    first = room_uuid(1)
    st, report = _request_json("GET", f"/api/v1/rooms/{first}/candidate-report")
    print(f"GET /candidate-report -> HTTP {st}")
    if st == 200 and isinstance(report, dict):
        ev = report.get("timelineEvents") or []
        cx = report.get("complexityTrend") or []
        print(f"  timelineEvents: {len(ev)}, complexityTrend: {len(cx)}")
    else:
        print(f"  {report}")

    print("\nГотово. Для фронта открой отчёт по UUID (пример):")
    print(f"  /interviewer/sessions/{first}/report")
    print("\nСписок всех демо room_id:")
    for i in range(1, 11):
        print(f"  {room_uuid(i)}  — {DEMO_NAMES[i - 1]}")


if __name__ == "__main__":
    main()
