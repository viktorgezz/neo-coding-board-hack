"""Сид «большого» алгоритмического интервью через HTTP API.

Запуск:
  API_BASE_URL=http://72.56.248.147:8000 python3 testing/seed_test_data_api.py
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

_HERE = Path(__file__).resolve().parent
_ROOT = _HERE.parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from seed_algo_interview_data import ROOM_ALGO_INTERVIEW, build_algo_session_history

API_BASE_URL = os.environ.get("API_BASE_URL", "http://72.56.248.147:8000").rstrip("/")


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
        with urllib.request.urlopen(req, timeout=60) as response:
            text = response.read().decode("utf-8")
            return response.status, json.loads(text) if text else {}
    except urllib.error.HTTPError as exc:
        err_text = exc.read().decode("utf-8", errors="replace")
        try:
            err_json = json.loads(err_text) if err_text else {}
        except json.JSONDecodeError:
            err_json = {"raw": err_text}
        return exc.code, err_json


def _session_history_payload() -> dict[str, Any]:
    history = build_algo_session_history()
    return {
        "startTime": history.startTime.isoformat(),
        "endTime": history.endTime.isoformat(),
        "codeSnapshots": [snap.model_dump() for snap in history.codeSnapshots],
        "interviewerNotes": [note.model_dump() for note in history.interviewerNotes],
    }


def _assessment_payload() -> dict[str, Any]:
    return {
        "systemDesign": 4,
        "codeReadability": 4,
        "communicationSkills": 5,
        "coachability": 5,
        "verdict": "PASSED",
    }


def _assert_ok(status: int, data: Any, step: str) -> None:
    if status not in (200, 201):
        raise SystemExit(f"{step} failed with HTTP {status}: {data}")


def _validate_candidate_report(report: dict[str, Any]) -> None:
    complexity = report.get("complexityTrend") or []
    timeline = report.get("timelineEvents") or []

    if len(complexity) < 50:
        raise SystemExit(f"Validation failed: complexityTrend has {len(complexity)} items, expected >= 50")

    note_events = [event for event in timeline if event.get("type") == "NOTE"]
    violation_events = [
        event for event in timeline if event.get("type") in {"PASTE", "TAB_SWITCH"}
    ]
    violation_types = {event.get("type") for event in violation_events}

    if len(note_events) < 10:
        raise SystemExit(f"Validation failed: NOTE events = {len(note_events)}, expected >= 10")
    if len(violation_events) < 3:
        raise SystemExit(
            f"Validation failed: PASTE/TAB_SWITCH events = {len(violation_events)}, expected >= 3"
        )
    if not {"PASTE", "TAB_SWITCH"}.issubset(violation_types):
        raise SystemExit(
            f"Validation failed: expected both PASTE and TAB_SWITCH, got {sorted(violation_types)}"
        )


def main() -> None:
    room_id = str(ROOM_ALGO_INTERVIEW)
    print(f"Seeding room: {room_id}")
    print(f"API base: {API_BASE_URL}")

    payload = _session_history_payload()
    status, data = _request_json(
        "POST",
        f"/api/v1/rooms/{room_id}/history",
        payload=payload,
    )
    print(f"POST /history -> HTTP {status}")
    _assert_ok(status, data, "history")

    for _ in range(2):
        status, data = _request_json("POST", f"/api/v1/rooms/{room_id}/metrics/increment-paste")
        print(f"POST /metrics/increment-paste -> HTTP {status}")
        _assert_ok(status, data, "increment-paste")

    status, data = _request_json("POST", f"/api/v1/rooms/{room_id}/metrics/increment-tab-switch")
    print(f"POST /metrics/increment-tab-switch -> HTTP {status}")
    _assert_ok(status, data, "increment-tab-switch")

    status, data = _request_json(
        "POST",
        f"/api/v1/rooms/{room_id}/interviewer-assessment",
        payload=_assessment_payload(),
    )
    print(f"POST /interviewer-assessment -> HTTP {status}")
    _assert_ok(status, data, "interviewer-assessment")

    status, data = _request_json("GET", f"/api/v1/rooms/{room_id}/ai-summary")
    print(f"GET /ai-summary -> HTTP {status}")
    _assert_ok(status, data, "ai-summary")

    status, report = _request_json("GET", f"/api/v1/rooms/{room_id}/candidate-report")
    print(f"GET /candidate-report -> HTTP {status}")
    _assert_ok(status, report, "candidate-report")
    _validate_candidate_report(report)

    print("Validation passed:")
    print(f"- complexityTrend: {len(report.get('complexityTrend') or [])}")
    print(
        "- NOTE events: "
        + str(len([event for event in (report.get('timelineEvents') or []) if event.get('type') == 'NOTE']))
    )
    print(
        "- PASTE/TAB_SWITCH events: "
        + str(
            len(
                [
                    event
                    for event in (report.get("timelineEvents") or [])
                    if event.get("type") in {"PASTE", "TAB_SWITCH"}
                ]
            )
        )
    )
    print(f"room_id: {room_id}")


if __name__ == "__main__":
    main()
