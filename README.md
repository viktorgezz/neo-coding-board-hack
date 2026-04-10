# NEO Coding Board

![Java](https://img.shields.io/badge/Java-21-ED8B00?logo=openjdk&logoColor=white)
![Spring](https://img.shields.io/badge/Spring%20Boot-3-6DB33F?logo=spring&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-compose-2496ED?logo=docker&logoColor=white)

Платформа для проведения **технических интервью в формате live coding**: общий редактор кода с синхронизацией в реальном времени, сессии (комнаты), заметки интервьюера, метрики поведения в редакторе и **аналитические отчёты** по завершённым интервью. Есть **банк задач** для выбора условий и привязки к сессии.

### Роли

- **Интервьюер** — создаёт и ведёт сессию, видит код кандидата, пишет заметки, завершает интервью и выставляет оценку.
- **HR** — обзор сессий и статусов без полного админ-доступа.
- **Администратор** — управление учётными записями персонала (staff).
- **Кандидат** — вход по ссылке на комнату **без** общей учётной записи платформы; получает ограниченный доступ к редактору и контексту сессии.

Подробные API аналитики, формулы метрик и сценарий **AI-summary (GigaChat)** описаны только в [AnaliticsService/README.md](AnaliticsService/README.md), в корне они не дублируются.

---

## Требования

| Для чего | Минимум |
|-----------|---------|
| Полный стенд | [Docker](https://docs.docker.com/get-docker/) и Docker Compose v2 |
| Фронтенд в dev | **Node.js** 18+ (в CI/образе сборки используется 22), npm |
| Core без Docker | **JDK 21**, Maven — см. [core-service/README.md](core-service/README.md) |
| Python-сервисы локально | **Python 3.12**, venv — в README каждого сервиса |

---

## Модули и документация

| Каталог | Назначение | Документация |
|--------|------------|--------------|
| [core-service](core-service/) | Основной **REST API** (Spring Boot): аутентификация JWT, комнаты, код, заметки, интеграция с остальными частями платформы. В Docker — сервис `app`, контейнер `java-business-app`. | [core-service/README.md](core-service/README.md) |
| [frontend](frontend/) | **SPA**: Vite, React 18, TypeScript, Monaco Editor, STOMP для WebSocket, React Query. Статика отдаётся **nginx** в compose; в dev — Vite dev server с прокси (см. ниже). | [frontend/Readme.md](frontend/Readme.md) |
| [AnaliticsService](AnaliticsService/) | **Аналитика** (FastAPI): история событий, метрики, отчёт кандидата, AI-резюме. Публичный ключ JWT монтируется из `AnaliticsService/keys/`. | [AnaliticsService/README.md](AnaliticsService/README.md) |
| [TasksBankService](TasksBankService/) | **Банк задач**: категории и задачи, API для фронта. Использует тот же публичный ключ, что и аналитика. | [TasksBankService/README.md](TasksBankService/README.md) |
| [WSCodeService](WSCodeService/) | **WebSocket** для текста кода в комнате (отдельный микросервис). | [WSCodeService/README.md](WSCodeService/README.md) |
| [WSCursorService](WSCursorService/) | **WebSocket** для позиции и выделения курсора. | [WSCursorService/README.md](WSCursorService/README.md) |
| [deploy/postgres](deploy/postgres/) | Скрипт инициализации БД при первом старте Postgres в compose. | `init-multiple-dbs.sql`, `.env` по образцу репозитория |
| [docker-compose.yml](docker-compose.yml) | Один файл для Postgres и всех сервисов + сборка фронтенда. | этот README, комментарии в compose |
| [scripts](scripts/) | Вспомогательные скрипты (сиды, ключи JWT). | см. файлы в каталоге |

---

## Архитектура

Браузер загружает **фронтенд**. В **production-сборке под Docker** nginx в контейнере `frontend` проксирует:

- `/api/` и `/ws` → **core-service** (`app:8080`);
- `/analytics-api/` → **analytics-service** (`analytics-service:8000`);
- `/tasks-api/` → **tasks-bank-service** (`tasks-bank-service:8000`);
- `/code-ws/` → **ws-code-service** (`ws-code-service:8000`);
- `/cursor-ws/` → **ws-cursor-service** (`ws-cursor-service:8000`).

Таким образом, с точки зрения браузера один origin (например `http://localhost:3080`), а маршруты разводятся на бэкенды. **PostgreSQL** используется core и Python-сервисами; скрипт [deploy/postgres/init-multiple-dbs.sql](deploy/postgres/init-multiple-dbs.sql) при первом подъёме создаёт БД `neo_tasks_bank` и `coding_board_db` (подключение и учётные данные — в `.env` Postgres и сервисов).

<img width="935" height="657" alt="image" src="https://github.com/user-attachments/assets/b5b5a2e9-180d-400e-b558-fc2807ca2028" />


---

## Запуск через Docker Compose

1. Клонируйте репозиторий и перейдите в корень.
2. Подготовьте **обязательные** `env_file`, на которые ссылается [docker-compose.yml](docker-compose.yml):
   - [deploy/postgres/.env](deploy/postgres/) — пользователь и пароль Postgres (файл обязателен для `env_file.required: true`);
   - [core-service/.env](core-service/) — на основе `.env.origin`;
   - [AnaliticsService/.env](AnaliticsService/), [TasksBankService/.env](TasksBankService/), [WSCodeService/.env](WSCodeService/), [WSCursorService/.env](WSCursorService/) — по примерам в соответствующих каталогах.
3. Для JWT: **RSA-ключи** в `core-service` и **публичный** ключ, смонтированный в Python-сервисы (см. compose: `AnaliticsService/keys/public_key.pem`). Пошагово — в [core-service/README.md](core-service/README.md).
4. Соберите и поднимите стек:

   ```bash
   docker compose up --build -d
   ```

5. Откройте UI: **http://localhost:3080** (порт проброшен с контейнера `frontend`).

Сервисы в compose: `postgres`, `app` (Java core), `analytics-service`, `tasks-bank-service`, `ws-code-service`, `ws-cursor-service`, `frontend`. Логи, остановка, отладка отдельного контейнера — стандартно для Docker; детали переменных и портов при **локальном** запуске без compose — в README каждого модуля.

---

## Локальная разработка фронтенда

Из **корня репозитория** (npm workspace):

```bash
npm install
npm run dev
```

Скрипт запускает Vite для пакета `neo-coding-board` (каталог [frontend](frontend/)); по умолчанию dev-сервер слушает порт **5173**. Цели прокси для `/api`, `/ws`, `/tasks-api`, `/analytics-api` задаются в [frontend/vite.config.ts](frontend/vite.config.ts): при полном локальном стенде замените `target` на свои `localhost` и порты (для Java обычно **8080**; для uvicorn — см. README Python-сервисов; внутри Docker-сети несколько сервисов слушают **8000** на разных хостах). Сборка и превью: `npm run build`, `npm run preview` из корня.

---

## Вспомогательные скрипты

В [scripts](scripts/):

- **ensure-jwt-keys.sh** — генерирует пару RSA для JWT в `core-service/app/src/main/resources/keys/` и копирует публичный ключ в `AnaliticsService/keys/public_key.pem` (нужно для Python-сервисов в Docker). Bash; на Windows удобно запускать из Git Bash или WSL.
- **coding_board_seed.py**, **seed_all_test_data.py** — сиды тестовых данных; смотрите заголовки файлов и документацию в [AnaliticsService/testing/](AnaliticsService/testing/), если используете демо-сценарии аналитики.
