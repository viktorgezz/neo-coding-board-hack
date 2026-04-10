# NEO Coding Board — Frontend

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Monaco](https://img.shields.io/badge/Editor-Monaco-1e1e1e?logo=visualstudiocode&logoColor=white)

Одностраничное приложение (**SPA**) платформы NEO Coding Board: вход и роли персонала, комнаты live coding с **Monaco Editor**, синхронизация кода и курсора по **WebSocket (STOMP)**, заметки интервьюера, дашборды HR, админка пользователей, отчёты и аналитика, управление банком задач. Сборка отдаётся как статика; в **Docker** перед ней стоит **nginx** с обратным прокси на бэкенды (см. [nginx/default.conf](nginx/default.conf)).

Общий обзор репозитория, compose и Postgres — в [корневом README.md](../README.md). Детали REST и метрик — в README **core-service** и **AnaliticsService**.

---

## Требования

| Задача | Минимум |
|--------|---------|
| Разработка | **Node.js** 18+; рекомендуется LTS. Образ сборки в [Dockerfile](Dockerfile) — Node **22**. |
| Пакетный менеджер | **npm** (в корне репозитория настроен workspace на этот пакет). |
| Полный стенд | Запущенные API и WS согласно [docker-compose.yml](../docker-compose.yml) или локальным портам после настройки прокси. |

---

## Стек

| Технология | Роль в проекте |
|------------|----------------|
| [Vite](https://vitejs.dev/) | Сборка и dev-сервер |
| React 18 | UI |
| TypeScript | Типизация |
| [React Router](https://reactrouter.com/) v6 | Маршруты, lazy-страницы |
| [@monaco-editor/react](https://github.com/suren-atoyan/monaco-react) | Редактор кода |
| [@stomp/stompjs](https://stomp-js.github.io/) | STOMP поверх WebSocket |
| [@tanstack/react-query](https://tanstack.com/query) | Запросы и кэш |
| [axios](https://axios-http.com/) | HTTP там, где не fetch |
| [zustand](https://github.com/pmndrs/zustand) | Состояние авторизации |
| [recharts](https://recharts.org/) | Графики в отчётах |
| CSS Modules | Стили рядом с компонентами |

Алиас импортов: `@/` → [src/](src/) (см. [vite.config.ts](vite.config.ts)).

---

## Структура каталога `src`

| Путь | Назначение |
|------|------------|
| [src/pages/](src/pages/) | Экраны: `candidate/`, `interviewer/`, `hr/`, `admin/`, `shared/` (отчёт, банк задач) |
| [src/components/](src/components/) | Переиспользуемые блоки (редактор, заметки, модалки, таблицы и т.д.) |
| [src/layouts/](src/layouts/) | Оболочка с сайдбаром для защищённых маршрутов |
| [src/router/](src/router/) | Дерево маршрутов, guards по ролям |
| [src/auth/](src/auth/) | Логин, JWT, контекст, хранение сессии staff |
| [src/api/](src/api/) | Клиенты analytics, tasks bank, отчёты |
| [src/hooks/](src/hooks/) | WebSocket кода/курсора, вспомогательные хуки |
| [src/store/](src/store/) | Глобальное состояние (auth) |
| [src/styles/](src/styles/) | Тема Monaco и прочее |

Маршруты задаются в [src/router/index.tsx](src/router/index.tsx): публичные `/login`, поток кандидата `/session/:id/join`, `/session/:id/candidate`, `/session/:id/done`, комната интервьюера на весь экран `/interviewer/sessions/:id`, остальные роли — внутри `AppLayout`.

---

## Команды

Пакет npm называется **`neo-coding-board`**; удобнее запускать из **корня монорепозитория** (workspace):

```bash
cd ..   # корень neo-coding-board-hack
npm install
npm run dev      # Vite dev server (по умолчанию порт 5173)
npm run build    # production-сборка в dist/
npm run preview  # превью сборки
npm run typecheck
```

Из каталога `frontend/` напрямую:

```bash
npm install
npm run dev
```

---

## Переменные окружения (Vite)

Файл-пример: [.env.example](.env.example). Префикс **`VITE_`** обязателен для попадания переменных в клиентский бандл.

| Переменная | Назначение |
|------------|------------|
| `VITE_ANALYTICS_API_BASE_URL` | Базовый URL API аналитики (пусто → `/analytics-api`) |
| `VITE_TASKS_BANK_API_BASE_URL` | Базовый URL банка задач (пусто → `/tasks-api`) |
| `VITE_CURSOR_WS_BASE_URL` | WebSocket курсора (в Docker-стенде часто `ws://localhost:3080/cursor-ws`) |
| `VITE_CODE_WS_BASE_URL` | WebSocket кода (`.../code-ws`) |

При **docker compose** UI обычно на **http://localhost:3080**: префиксы `/analytics-api`, `/tasks-api`, `/code-ws`, `/cursor-ws` обслуживает nginx (см. ниже). Для **чисто локального** Vite без Docker подставьте в `.env` свои URL или настройте прокси.

---

## Прокси в режиме разработки

В [vite.config.ts](vite.config.ts) в `server.proxy` заданы перенаправления:

- **`/api`** и **`/ws`** → основной Java-бэкенд (комнаты, auth, STOMP через Spring);
- **`/tasks-api`** → Tasks Bank Service;
- **`/analytics-api`** → Analytics Service.

Значения **`target`** нужно выставить под вашу среду (например `http://localhost:8080` для core и соответствующие хосты для Python-сервисов). Для WebSocket-клиентов приложение может ходить на отдельные базы (`VITE_*_WS_BASE_URL`), если они не совпадают с origin dev-сервера.

В файле сохранён закомментированный **mock-плагин** с тестовыми аккаунтами (см. комментарии вверху `vite.config.ts`); для работы с реальным API плагин не подключается.

---

## Сборка и Docker

1. **`npm run build`** — TypeScript-проверка и вывод в `dist/`.
2. **[Dockerfile](Dockerfile)** — multi-stage: `npm ci`, `npm run build`, затем образ **nginx** со статикой и конфигом [nginx/default.conf](nginx/default.conf).

Nginx проксирует на сервисы Docker-сети (имена как в compose):

| Префикс браузера | Назначение |
|------------------|------------|
| `/api/`, `/ws` | core-service (`app:8080`) |
| `/analytics-api/` | analytics-service |
| `/tasks-api/` | tasks-bank-service |
| `/code-ws/`, `/cursor-ws/` | ws-code-service, ws-cursor-service |

Подробнее о стеке целиком — [README в корне](../README.md#архитектура).

---

## Маршрутизация и авторизация (кратко)

- **Staff** после логина получает JWT; токен хранится в `localStorage` (см. `staffSessionStorage`), роли: ADMIN, HR, INTERVIEWER.
- **Кандидат** не проходит `/login`: регистрация в комнате и отдельный токен по сценарию join.
- В режиме **`import.meta.env.DEV`** [src/auth/api.ts](src/auth/api.ts) может обслужить вход по **встроенным mock-учёткам** (см. `MOCK_ACCOUNTS` в том файле), если реальный `/api/v1/auth/login` не используется.

---

## Связанная документация

- [Корневой README](../README.md) — архитектура, Postgres, `docker compose`
- [core-service/README.md](../core-service/README.md) — API, Swagger, JWT-ключи
- [AnaliticsService/README.md](../AnaliticsService/README.md) — отчёты и AI-summary
- [TasksBankService/README.md](../TasksBankService/README.md), [WSCodeService](../WSCodeService/README.md), [WSCursorService](../WSCursorService/README.md)
