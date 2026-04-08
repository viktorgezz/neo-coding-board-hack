"""Очистка БД и отправка тестовой истории через POST /api/v1/rooms/{idRoom}/history.

По умолчанию шлёт HTTP на API_BASE_URL (см. ниже). Запусти сервер, например:
  uvicorn main:app --reload --host 0.0.0.0 --port 8000

Без сервера можно один раз выполнить с флагом --testclient (тот же обработчик роутера).

Примеры:
  API_BASE_URL=http://127.0.0.1:8000 python3 clear_and_seed_history_api.py
  python3 clear_and_seed_history_api.py --testclient
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
import urllib.error
import urllib.request

from database import run_migrations

ROOM_ID = uuid.UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")


def _history_payload() -> dict:
    return {
        "startTime": "2026-04-08T09:00:00+00:00",
        "endTime": "2026-04-08T10:45:00+00:00",
        "codeSnapshots": [
            {
                "timestamp": "09:05",
                "code": "fun main() = println('hello')",
                "language": "kotlin",
            },
            {
                "timestamp": "10:12",
                "code": "data class Node(val v: Int, val next: Node?)",
                "language": "kotlin",
            },
        ],
        "interviewerNotes": [
            {"timestamp": "09:02", "text": "Кандидат начал с простого примера"},
            {"timestamp": "10:40", "text": "Обсудили сложность связного списка"},
        ],
    }


def _post_history_http(base_url: str, room_id: uuid.UUID, payload: dict) -> tuple[int, str]:
    url = f"{base_url.rstrip('/')}/api/v1/rooms/{room_id}/history"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, body
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        return e.code, err_body


def _post_history_testclient(room_id: uuid.UUID, payload: dict) -> tuple[int, str]:
    from fastapi.testclient import TestClient

    from main import app

    with TestClient(app) as client:
        r = client.post(f"/api/v1/rooms/{room_id}/history", json=payload)
        return r.status_code, r.text


def main() -> None:
    parser = argparse.ArgumentParser(description="Очистка БД + POST /history")
    parser.add_argument(
        "--testclient",
        action="store_true",
        help="Вызвать роут через FastAPI TestClient (сервер не нужен)",
    )
    args = parser.parse_args()

    run_migrations()

    from db_utils import clear_all_app_tables

    clear_all_app_tables()
    print("БД очищена (кроме alembic_version).")

    payload = _history_payload()

    if args.testclient:
        code, body = _post_history_testclient(ROOM_ID, payload)
    else:
        base = os.environ.get("API_BASE_URL", "http://127.0.0.1:8000")
        print(f"POST {base}/api/v1/rooms/{ROOM_ID}/history ...")
        try:
            code, body = _post_history_http(base, ROOM_ID, payload)
        except urllib.error.URLError as e:
            print(
                "Не удалось подключиться к API. Запусти сервер, например:\n"
                "  uvicorn main:app --host 0.0.0.0 --port 8000\n"
                "Или выполни: python3 clear_and_seed_history_api.py --testclient",
                file=sys.stderr,
            )
            raise SystemExit(1) from e

    print(f"Ответ: HTTP {code}")
    print(body)
    if code not in (200, 201):
        raise SystemExit(1)
    print(f"\nroom_id для проверки: {ROOM_ID}")


if __name__ == "__main__":
    main()
