# NEO Coding Board Hack - Tasks Bank Service

![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-D71F00?logo=sqlalchemy&logoColor=white)
![Alembic](https://img.shields.io/badge/Alembic-Migrations-4B8BBE)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-supported-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)

Сервис банка задач для Live Coding платформы.

Назначение сервиса:
- хранить и управлять категориями задач;
- хранить и управлять задачами с уровнем сложности;
- отдавать каталог задач с фильтрацией для интервью-сценариев.

---

## 1) Описание

### Что делает API

Основные эндпоинты:
- `POST /api/v1/categories` - создать категорию;
- `GET /api/v1/categories` - получить список категорий;
- `GET /api/v1/categories/{category_id}` - получить категорию по id;
- `PATCH /api/v1/categories/{category_id}` - частично обновить категорию;
- `DELETE /api/v1/categories/{category_id}` - удалить категорию;
- `POST /api/v1/tasks` - создать задачу;
- `GET /api/v1/tasks` - получить список задач (с фильтрами);
- `GET /api/v1/tasks/{task_id}` - получить задачу по id;
- `PATCH /api/v1/tasks/{task_id}` - частично обновить задачу;
- `DELETE /api/v1/tasks/{task_id}` - удалить задачу.

### Технологический стек

- Backend: `FastAPI`, `Pydantic v2`
- БД и ORM: `SQLAlchemy 2`, `Alembic`
- База данных: `PostgreSQL`
- Деплой: `Docker`

---

## 2) Инструкция по запуску

### Локально (Python)

1. Перейти в директорию сервиса:
```bash
cd TasksBankService
```

2. Создать и активировать виртуальное окружение:
```bash
python3 -m venv .venv
source .venv/bin/activate
```

3. Установить зависимости:
```bash
pip install -r requirements.txt
```

4. Подготовить `.env`:
```bash
cp .env.example .env
```

Минимальная переменная:
- `DATABASE_URL` - строка подключения к PostgreSQL.

Для запуска рядом с локальным PostgreSQL используйте пример:
```env
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/neo_tasks_bank
```

5. Запустить API:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

При старте автоматически выполняются миграции Alembic до `head`.

### Через Docker

Из директории `TasksBankService`:
```bash
docker build -t neo-tasks-bank-service .
docker run --rm -p 8001:8000 --env-file .env neo-tasks-bank-service
```

---

## 3) Архитектура

Сервис реализован как монолитный REST API с четким разделением слоев:

- `routes.py` - HTTP-контракты и обработка ошибок;
- `crud.py` - операции чтения/записи в БД;
- `models.py` - ORM-модели `TaskCategory` и `Task`;
- `schemas.py` - Pydantic-схемы запросов/ответов;
- `database.py` - инициализация SQLAlchemy, сессии и запуск миграций;
- `migrations/` - Alembic-миграции схемы.

Поток данных:
1. Запрос приходит в endpoint в `routes.py`.
2. Валидируется Pydantic-схемой.
3. CRUD-слой выполняет SQL-операции через SQLAlchemy session.
4. Результат сериализуется в response schema и возвращается клиенту.

---

## 4) Контракты API

### Категории

`CategoryCreate`:
```json
{
  "name": "Algorithms",
  "description": "Задачи на алгоритмы и структуры данных"
}
```

`CategoryRead`:
```json
{
  "id": 1,
  "name": "Algorithms",
  "description": "Задачи на алгоритмы и структуры данных"
}
```

### Задачи

Допустимые значения поля `difficulty`:
- `easy`
- `medium`
- `hard`

`TaskCreate`:
```json
{
  "title": "Two Sum",
  "statement": "Найдите индексы двух чисел с заданной суммой.",
  "difficulty": "easy",
  "category_id": 1
}
```

`TaskRead`:
```json
{
  "id": 10,
  "title": "Two Sum",
  "statement": "Найдите индексы двух чисел с заданной суммой.",
  "difficulty": "easy",
  "category_id": 1
}
```

Фильтры списка задач:
- `GET /api/v1/tasks?difficulty=medium`
- `GET /api/v1/tasks?category_id=2`
- `GET /api/v1/tasks?difficulty=hard&category_id=3`

---

## 5) Примеры запросов

Создание категории:
```bash
curl -X POST http://localhost:8000/api/v1/categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Backend",
    "description": "Серверные задачи"
  }'
```

Создание задачи:
```bash
curl -X POST http://localhost:8000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Design URL Shortener",
    "statement": "Спроектируйте сервис сокращения ссылок.",
    "difficulty": "medium",
    "category_id": 1
  }'
```

Получение списка задач:
```bash
curl "http://localhost:8000/api/v1/tasks?difficulty=medium"
```
# NEO Coding Board Hack - Tasks Bank Service

Сервис банка алгоритмических задач с CRUD для категорий и задач.

## Стек

- FastAPI
- PostgreSQL
- SQLAlchemy 2
- Alembic

## Модель данных

- `task_categories`
  - `id` (PK)
  - `name` (unique)
  - `description` (nullable)
- `tasks`
  - `id` (PK)
  - `title`
  - `statement`
  - `difficulty` (`easy | medium | hard`)
  - `category_id` (FK -> `task_categories.id`)

## Локальный запуск

1. Перейти в папку сервиса:

```bash
cd TasksBankService
```

2. Установить зависимости:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

3. Подготовить `.env`:

```bash
cp .env.example .env
```

4. Запустить API:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

5. Заполнить БД тестовыми задачами (6 категорий и ~100 задач):

```bash
python3 seed_tasks.py
```

## Docker Compose

Из корня репозитория:

```bash
docker compose up --build
```

Сервис будет доступен по адресу `http://localhost:8001`.

## API

### Categories

- `POST /api/v1/categories`
- `GET /api/v1/categories`
- `GET /api/v1/categories/{category_id}`
- `PATCH /api/v1/categories/{category_id}`
- `DELETE /api/v1/categories/{category_id}`

### Tasks

- `POST /api/v1/tasks`
- `GET /api/v1/tasks?difficulty=easy&category_id=1`
- `GET /api/v1/tasks/{task_id}`
- `PATCH /api/v1/tasks/{task_id}`
- `DELETE /api/v1/tasks/{task_id}`

## Примеры запросов

Создать категорию:

```bash
curl -X POST http://localhost:8001/api/v1/categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Arrays",
    "description": "Задачи на массивы и двухуказательные техники"
  }'
```

Создать задачу:

```bash
curl -X POST http://localhost:8001/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Two Sum",
    "statement": "Find indices of two numbers that sum to target",
    "difficulty": "easy",
    "category_id": 1
  }'
```

Получить задачи уровня `easy`:

```bash
curl "http://localhost:8001/api/v1/tasks?difficulty=easy"
```
