"""Схема и тестовые данные для БД core-service (coding_board_db).

Таблицы совместимы с Hibernate ddl-auto=update (типичные имена колонок).
Пароль для всех тестовых пользователей: test123 (BCrypt ниже).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

# BCrypt(test123), strength 10 — совместимо с Spring BCryptPasswordEncoder
TEST_PASSWORD_BCRYPT = (
    "$2b$10$12YX5lsM4FFQBodkZ9ED6uBn2C67pDcteeQv8kKtn.12n8Bd2QfHi"
)

# UUID комнат совпадают с AnaliticsService (удобно для сквозных сценариев)
ROOM_UUIDS = [
    uuid.UUID("c0ffee01-0001-4000-8000-000000000001"),
    uuid.UUID("c0ffee01-0002-4000-8000-000000000002"),
    uuid.UUID("c0ffee01-0003-4000-8000-000000000003"),
    uuid.UUID("c0ffee01-0004-4000-8000-000000000004"),
    uuid.UUID("c0ffee01-0005-4000-8000-000000000005"),
    uuid.UUID("c0ffee01-0006-4000-8000-000000000006"),
    uuid.UUID("c0ffee01-0007-4000-8000-000000000007"),
    uuid.UUID("c0ffee01-0008-4000-8000-000000000008"),
    uuid.UUID("c0ffee01-0009-4000-8000-000000000009"),
    uuid.UUID("c0ffee01-000a-4000-8000-00000000000a"),
]

CANDIDATE_NAMES = [
    "Анна Волкова",
    "Борис Ким",
    "Виктория Ли",
    "Глеб Смирнов",
    "Дарья Орлова",
    "Егор Назаров",
    "Жанна Петрова",
    "Илья Зайцев",
    "Ксения Морозова",
    "Лев Андреев",
]

ROOM_TITLES = [f"Интервью: {n.split()[0]}" for n in CANDIDATE_NAMES]
VACANCY = "Middle Backend Developer"


def _ddl(cur) -> None:
    stmts = [
        """
        CREATE TABLE IF NOT EXISTS users (
            id BIGSERIAL PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(255) NOT NULL,
            is_enabled BOOLEAN,
            is_account_locked BOOLEAN,
            is_credentials_expired BOOLEAN
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS candidates (
            id BIGSERIAL PRIMARY KEY,
            full_name VARCHAR(255) NOT NULL,
            id_user BIGINT UNIQUE,
            CONSTRAINT fk_candidates_users FOREIGN KEY (id_user) REFERENCES users(id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS rooms (
            id UUID PRIMARY KEY,
            title_room VARCHAR(255) NOT NULL,
            name_vacancy VARCHAR(255) NOT NULL,
            status VARCHAR(255) NOT NULL,
            date_created TIMESTAMPTZ NOT NULL,
            date_start TIMESTAMPTZ,
            date_end TIMESTAMPTZ,
            candidate_id BIGINT,
            CONSTRAINT fk_rooms_candidates FOREIGN KEY (candidate_id) REFERENCES candidates(id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS room_interviewers (
            room_id UUID NOT NULL,
            user_id BIGINT NOT NULL,
            PRIMARY KEY (room_id, user_id),
            CONSTRAINT fk_ri_room FOREIGN KEY (room_id) REFERENCES rooms(id),
            CONSTRAINT fk_ri_user FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS code_snapshots (
            id UUID PRIMARY KEY,
            text_code TEXT NOT NULL,
            language VARCHAR(255) NOT NULL,
            time_created TIMESTAMPTZ NOT NULL,
            time_offset VARCHAR(255) NOT NULL,
            candidate_id BIGINT,
            user_id BIGINT,
            room_id UUID NOT NULL,
            CONSTRAINT fk_cs_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id),
            CONSTRAINT fk_cs_user FOREIGN KEY (user_id) REFERENCES users(id),
            CONSTRAINT fk_cs_room FOREIGN KEY (room_id) REFERENCES rooms(id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id BIGSERIAL PRIMARY KEY,
            username VARCHAR(255) NOT NULL,
            token VARCHAR(1024) NOT NULL UNIQUE,
            date_expiration TIMESTAMPTZ NOT NULL
        )
        """,
    ]
    for s in stmts:
        cur.execute(s)


def _truncate(cur) -> None:
    cur.execute(
        """
        TRUNCATE TABLE code_snapshots, room_interviewers, rooms, candidates,
                    refresh_tokens, users
        RESTART IDENTITY CASCADE
        """
    )


def run_coding_board_seed(conn) -> None:
    """conn — psycopg2 connection к coding_board_db."""
    cur = conn.cursor()
    try:
        _ddl(cur)
        _truncate(cur)

        pw = TEST_PASSWORD_BCRYPT
        staff = [
            (1, "interviewer1", pw, "INTERVIEWER", True, False, False),
            (2, "interviewer2", pw, "INTERVIEWER", True, False, False),
            (3, "hr_demo", pw, "HR", True, False, False),
            (4, "admin_demo", pw, "SUPERUSER", True, False, False),
        ]
        cur.executemany(
            """
            INSERT INTO users (id, username, password, role, is_enabled, is_account_locked, is_credentials_expired)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            staff,
        )

        cand_users = []
        uid = 5
        for i in range(10):
            cand_users.append(
                (uid, f"cand_{i + 1:02d}", pw, "CANDIDATE", True, False, False)
            )
            uid += 1
        cur.executemany(
            """
            INSERT INTO users (id, username, password, role, is_enabled, is_account_locked, is_credentials_expired)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            cand_users,
        )

        cur.execute("SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users))")

        for i in range(10):
            cur.execute(
                """
                INSERT INTO candidates (id, full_name, id_user) VALUES (%s, %s, %s)
                """,
                (i + 1, CANDIDATE_NAMES[i], 5 + i),
            )
        cur.execute(
            "SELECT setval(pg_get_serial_sequence('candidates', 'id'), (SELECT MAX(id) FROM candidates))"
        )

        now = datetime.now(timezone.utc)
        for i in range(10):
            rid = ROOM_UUIDS[i]
            status = "FINISHED" if i % 3 == 0 else "ACTIVE" if i % 3 == 1 else "CREATED"
            cur.execute(
                """
                INSERT INTO rooms (id, title_room, name_vacancy, status, date_created, date_start, date_end, candidate_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    str(rid),
                    ROOM_TITLES[i],
                    VACANCY,
                    status,
                    now,
                    now,
                    now if status == "FINISHED" else None,
                    i + 1,
                ),
            )
            cur.executemany(
                "INSERT INTO room_interviewers (room_id, user_id) VALUES (%s, %s)",
                [(str(rid), 1), (str(rid), 2)],
            )

        for i in range(10):
            rid = ROOM_UUIDS[i]
            cur.execute(
                """
                INSERT INTO code_snapshots (id, text_code, language, time_created, time_offset, candidate_id, user_id, room_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    str(uuid.uuid4()),
                    f"def demo_{i}():\n    return {i}\n",
                    "python",
                    now,
                    "10:15",
                    i + 1,
                    1,
                    str(rid),
                ),
            )

        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
