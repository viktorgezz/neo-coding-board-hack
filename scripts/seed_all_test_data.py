#!/usr/bin/env python3
"""Полное заполнение всех PostgreSQL-БД проекта тестовыми данными.

Создаёт БД при необходимости: neo_analytics, neo_tasks_bank, coding_board_db.
Прогоняет Alembic для аналитики и банка задач, очищает аналитику и сидирует заново,
заполняет банк задач и coding_board_db (core-service).

Переменные окружения (все опциональны, кроме пароля на вашей среде):

  SEED_PG_HOST       — хост (по умолчанию localhost)
  SEED_PG_PORT       — порт (5432)
  SEED_PG_USER       — пользователь (postgres)
  SEED_PG_PASSWORD   — пароль (postgres)

Пример:

  export SEED_PG_HOST=111.88.127.60
  export SEED_PG_PASSWORD=postgres
  python3 scripts/seed_all_test_data.py

Требования: psycopg2, sqlalchemy (как в сервисах), установленный alembic в PATH
или через python -m alembic.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path
from urllib.parse import quote_plus

ROOT = Path(__file__).resolve().parent.parent


def _conn_params() -> tuple[str, str, str, str]:
    host = os.environ.get("SEED_PG_HOST", "localhost")
    port = os.environ.get("SEED_PG_PORT", "5432")
    user = os.environ.get("SEED_PG_USER", "postgres")
    password = os.environ.get("SEED_PG_PASSWORD", "postgres")
    return host, port, user, password


def _sqlalchemy_url(database: str) -> str:
    host, port, user, password = _conn_params()
    return (
        f"postgresql+psycopg2://{quote_plus(user)}:{quote_plus(password)}"
        f"@{host}:{port}/{database}"
    )


def ensure_databases() -> None:
    from sqlalchemy import create_engine, text

    host, port, user, password = _conn_params()
    admin = (
        f"postgresql+psycopg2://{quote_plus(user)}:{quote_plus(password)}"
        f"@{host}:{port}/postgres"
    )
    eng = create_engine(admin, isolation_level="AUTOCOMMIT")
    for name in ("neo_analytics", "neo_tasks_bank", "coding_board_db"):
        with eng.connect() as c:
            exists = c.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :n"),
                {"n": name},
            ).scalar()
            if not exists:
                c.execute(text(f'CREATE DATABASE "{name}"'))
    eng.dispose()


def _run_alembic(service_dir: Path, database_url: str) -> None:
    env = {**os.environ, "DATABASE_URL": database_url}
    try:
        subprocess.run(["alembic", "upgrade", "head"], cwd=service_dir, env=env, check=True)
        return
    except FileNotFoundError:
        pass
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=service_dir,
        env=env,
        check=True,
    )


def _seed_analytics_subprocess() -> None:
    code = r"""
import os, sys
ROOT = os.environ['REPO_ROOT']
sys.path.insert(0, os.path.join(ROOT, 'AnaliticsService'))
os.environ['DATABASE_URL'] = os.environ['ANALYTICS_DATABASE_URL']
from testing.db_utils import clear_all_app_tables
from database import SessionLocal, engine
from testing.seed_ten_candidates import seed_analytics_candidates
clear_all_app_tables()
sess = SessionLocal()
try:
    specs = seed_analytics_candidates(sess)
    print('Вставлено 10 комнат (аналитика + AI). room_id:')
    for c in specs:
        print(f"  {c['room_id']}  — {c['name']}, {c['verdict']}")
finally:
    sess.close()
    engine.dispose()
"""
    env = {
        **os.environ,
        "REPO_ROOT": str(ROOT),
        "ANALYTICS_DATABASE_URL": _sqlalchemy_url("neo_analytics"),
    }
    subprocess.run([sys.executable, "-c", code], env=env, check=True, cwd=str(ROOT))


def _seed_tasks_subprocess() -> None:
    env = {**os.environ, "DATABASE_URL": _sqlalchemy_url("neo_tasks_bank")}
    subprocess.run(
        [sys.executable, str(ROOT / "TasksBankService/testing/seed_tasks_bank_data.py")],
        env=env,
        check=True,
        cwd=str(ROOT),
    )


def _seed_coding_board() -> None:
    import importlib.util

    import psycopg2

    mod_path = ROOT / "scripts" / "coding_board_seed.py"
    spec = importlib.util.spec_from_file_location("coding_board_seed", mod_path)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)

    host, port, user, password = _conn_params()
    conn = psycopg2.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        dbname="coding_board_db",
    )
    try:
        mod.run_coding_board_seed(conn)
    finally:
        conn.close()


def main() -> None:
    def step(msg: str) -> None:
        print(msg, flush=True)

    step("1/5 Создание БД при отсутствии…")
    ensure_databases()
    step("2/5 Миграции neo_analytics…")
    _run_alembic(ROOT / "AnaliticsService", _sqlalchemy_url("neo_analytics"))
    step("3/5 Миграции neo_tasks_bank…")
    _run_alembic(ROOT / "TasksBankService", _sqlalchemy_url("neo_tasks_bank"))
    step("4/5 Сид аналитики (полная очистка таблиц приложения)…")
    _seed_analytics_subprocess()
    step("5/5 Банк задач + coding_board_db…")
    _seed_tasks_subprocess()
    _seed_coding_board()
    step(
        "Готово. Core-service: interviewer1, interviewer2, hr_demo, admin_demo, "
        "cand_01…cand_10 — пароль test123"
    )


if __name__ == "__main__":
    main()
