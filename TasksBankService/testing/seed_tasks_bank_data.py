"""Полное заполнение банка задач тестовыми категориями и задачами.

Запуск:
  export DATABASE_URL='postgresql+psycopg2://postgres:postgres@localhost:5432/neo_tasks_bank'
  cd репозиторий && python3 TasksBankService/testing/seed_tasks_bank_data.py

Удаляет все существующие задачи и категории, затем вставляет новый набор.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))


def main() -> None:
    if not os.environ.get("DATABASE_URL"):
        raise SystemExit(
            "Задайте DATABASE_URL для neo_tasks_bank, например:\n"
            "  export DATABASE_URL='postgresql+psycopg2://postgres:postgres@host:5432/neo_tasks_bank'"
        )

    from sqlalchemy import delete

    from database import SessionLocal, engine
    from models import DifficultyLevel, Task, TaskCategory

    categories_data: list[tuple[str, str | None]] = [
        ("Алгоритмы и структуры данных", "Классические задачи на массивы, графы, деревья, хэши."),
        ("Системный дизайн", "Проектирование сервисов, масштабирование, хранение данных."),
        ("SQL и базы данных", "Запросы, индексы, транзакции, нормализация."),
        ("Backend (Java / API)", "REST, валидация, ошибки, интеграции."),
        ("Frontend и TypeScript", "Компоненты, состояние, асинхронность в UI."),
    ]

    # (title, statement, difficulty, category_index 0-based)
    tasks_data: list[tuple[str, str, DifficultyLevel, int]] = [
        (
            "Two Sum",
            "Дан массив целых и целевое значение. Верните индексы двух чисел, дающих в сумме target. Оцените сложность.",
            DifficultyLevel.EASY,
            0,
        ),
        (
            "Проверка скобочной последовательности",
            "Строка из ()[]{}. Определите, корректна ли вложенность. Решение на стеке.",
            DifficultyLevel.EASY,
            0,
        ),
        (
            "Обход бинарного дерева in-order",
            "Реализуйте in-order обход без рекурсии (итеративно).",
            DifficultyLevel.MEDIUM,
            0,
        ),
        (
            "Кратчайший путь в невзвешенном графе",
            "Дан список рёбер и вершины s, t. Найдите длину кратчайшего пути в рёбрах.",
            DifficultyLevel.MEDIUM,
            0,
        ),
        (
            "Course Schedule (топологическая сортировка)",
            "Есть n курсов и пары зависимостей. Верните порядок прохождения или пустой список при цикле.",
            DifficultyLevel.HARD,
            0,
        ),
        (
            "URL shortener",
            "Спроектируйте сервис сокращения ссылок: API, хранение, редирект, столкновения хэшей.",
            DifficultyLevel.MEDIUM,
            1,
        ),
        (
            "Лента новостей",
            "Как хранить и отдавать ленту для миллионов подписчиков с учётом fan-out.",
            DifficultyLevel.HARD,
            1,
        ),
        (
            "Rate limiting",
            "Ограничение запросов по IP и по пользователю в распределённой системе.",
            DifficultyLevel.MEDIUM,
            1,
        ),
        (
            "Выбор БД для аналитики событий",
            "Сравните OLTP Postgres и колоночное хранилище для агрегаций по событиям.",
            DifficultyLevel.EASY,
            1,
        ),
        (
            "Задачи и соискатели",
            "Спроектируйте модель данных и API для банка задач и назначения интервью.",
            DifficultyLevel.MEDIUM,
            1,
        ),
        (
            "Выборка с JOIN и GROUP BY",
            "Даны orders и customers. Посчитайте сумму заказов по городам за месяц.",
            DifficultyLevel.EASY,
            2,
        ),
        (
            "Индексы для медленного запроса",
            "EXPLAIN показывает Seq Scan. Какие индексы добавить и почему.",
            DifficultyLevel.MEDIUM,
            2,
        ),
        (
            "Уровни изоляции",
            "Объясните разницу READ COMMITTED и REPEATABLE READ на примере lost update.",
            DifficultyLevel.MEDIUM,
            2,
        ),
        (
            "Денормализация vs нормализация",
            "Когда имеет смысл дублировать данные в таблице заказов ради скорости чтения.",
            DifficultyLevel.EASY,
            2,
        ),
        (
            "Оконные функции",
            "Рейтинг сотрудников по отделам: ROW_NUMBER() и разница с RANK().",
            DifficultyLevel.HARD,
            2,
        ),
        (
            "Идемпотентный POST в REST",
            "Как сделать создание ресурса безопасным при повторной отправке запроса.",
            DifficultyLevel.MEDIUM,
            3,
        ),
        (
            "Валидация DTO",
            "Где проверять входные данные: контроллер, сервис, домен — плюсы и минусы.",
            DifficultyLevel.EASY,
            3,
        ),
        (
            "Обработка ошибок API",
            "Единый формат ошибок, коды, логирование, маскировка внутренних деталей.",
            DifficultyLevel.MEDIUM,
            3,
        ),
        (
            "Транзакции в сервисе",
            "Два репозитория в одной бизнес-операции: как обеспечить атомарность.",
            DifficultyLevel.HARD,
            3,
        ),
        (
            "Версионирование API",
            "Стратегии: URL v1/v2, заголовки, обратная совместимость.",
            DifficultyLevel.MEDIUM,
            3,
        ),
        (
            "Управление формой с React",
            "Контролируемые поля vs библиотека форм; когда что выбрать.",
            DifficultyLevel.EASY,
            4,
        ),
        (
            "Запросы к API из компонента",
            "useEffect + fetch, отмена запроса, состояния loading/error.",
            DifficultyLevel.MEDIUM,
            4,
        ),
        (
            "Оптимизация списка",
            "Виртуализация длинного списка и мемоизация строк.",
            DifficultyLevel.MEDIUM,
            4,
        ),
        (
            "Типизация ответа API",
            "Как описать контракт с бэкенда в TypeScript (zod / вручную).",
            DifficultyLevel.EASY,
            4,
        ),
        (
            "Доступность (a11y)",
            "Фокус, aria-атрибуты, клавиатурная навигация в модальном окне.",
            DifficultyLevel.HARD,
            4,
        ),
    ]

    session = SessionLocal()
    try:
        session.execute(delete(Task))
        session.execute(delete(TaskCategory))
        session.flush()

        cat_rows: list[TaskCategory] = []
        for name, desc in categories_data:
            row = TaskCategory(name=name, description=desc)
            session.add(row)
            cat_rows.append(row)
        session.flush()

        for title, statement, difficulty, cat_i in tasks_data:
            session.add(
                Task(
                    title=title,
                    statement=statement,
                    difficulty=difficulty,
                    category_id=cat_rows[cat_i].id,
                )
            )
        session.commit()
        print(f"Банк задач: {len(categories_data)} категорий, {len(tasks_data)} задач.")
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
        engine.dispose()


if __name__ == "__main__":
    main()
