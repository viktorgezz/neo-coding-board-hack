# NEO Coding Board Hack - WS Cursor Service

![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-realtime-0A66C2)
![Pydantic](https://img.shields.io/badge/Pydantic-v2-1F7A8C)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)

Realtime-сервис синхронизации курсора между участниками технического интервью.

Назначение сервиса:
- принимать события положения курсора от клиента;
- рассылать координаты второму участнику комнаты;
- добавлять timestamp относительно начала интервью-сессии;
- валидировать формат входящих websocket-сообщений.

---

## 1) Описание

### Что делает API

Основной websocket-эндпоинт:
- `WS /ws/{interview_id}/{user_role}` - подключение к комнате интервью и обмен событиями курсора.

Ограничения:
- `user_role` должен быть `candidate` или `interviewer`;
- входящие координаты: `line >= 1`, `column >= 1`;
- сообщение отправителя не возвращается ему же, только второму участнику комнаты.

### Технологический стек

- Backend: `FastAPI`, `Pydantic v2`
- Протокол: `WebSocket`
- Runtime: `uvicorn`

---

## 2) Инструкция по запуску

### Локально (Python)

1. Перейти в директорию сервиса:
```bash
cd WSCursorService
```

2. Создать и активировать виртуальное окружение:
```bash
python3 -m venv .venv
source .venv/bin/activate
```

3. Установить зависимости:
```bash
pip install fastapi "uvicorn[standard]" pydantic
```

4. Запустить websocket-сервис:
```bash
uvicorn main:app --host 0.0.0.0 --port 8002
```

Сервис будет доступен по адресу:
- `http://localhost:8002`
- `ws://localhost:8002/ws/{interview_id}/{user_role}`

### Через Docker

Пример запуска без отдельного Dockerfile:
```bash
docker run --rm -it -p 8002:8002 \
  -v "$PWD":/app -w /app python:3.12-slim \
  bash -lc "pip install fastapi 'uvicorn[standard]' pydantic && uvicorn main:app --host 0.0.0.0 --port 8002"
```

---

## 3) Архитектура

Сервис минималистичный, в одном файле `main.py`:

- `CursorIn` - входящая схема (`line`, `column`);
- `CursorOut` - исходящая схема (`line`, `column`, `timestamp`, `from_role`);
- `ConnectionManager`:
  - хранит участников комнат в `rooms`;
  - хранит время старта комнаты в `session_started_at`;
  - подключает/отключает участников;
  - выполняет рассылку всем, кроме отправителя.

Поток данных:
1. Клиент подключается к `WS /ws/{interview_id}/{user_role}`.
2. Сервис принимает JSON с координатами курсора.
3. Валидирует payload через `CursorIn`.
4. Добавляет `timestamp` (секунды с начала сессии) и `from_role`.
5. Отправляет событие всем остальным участникам той же комнаты.

---

## 4) Контракты WebSocket

### Входящее сообщение (client -> server)

```json
{
  "line": 14,
  "column": 3
}
```

### Исходящее сообщение (server -> peer)

```json
{
  "line": 14,
  "column": 3,
  "timestamp": 12.347,
  "from_role": "candidate"
}
```

### Ошибка валидации

Если payload не проходит валидацию, отправителю возвращается:

```json
{
  "error": "invalid_cursor_payload",
  "details": [
    {
      "type": "greater_than_equal",
      "loc": ["line"],
      "msg": "Input should be greater than or equal to 1",
      "input": 0,
      "ctx": {"ge": 1}
    }
  ]
}
```

### Ошибка роли

Если `user_role` не равен `candidate` или `interviewer`, соединение закрывается:
- close code: `1008`
- reason: `user_role must be candidate or interviewer`

---

## 5) Пример клиентского подключения

Пример на JavaScript:

```javascript
const ws = new WebSocket("ws://localhost:8002/ws/interview-123/candidate");

ws.onopen = () => {
  ws.send(JSON.stringify({ line: 10, column: 5 }));
};

ws.onmessage = (event) => {
  const payload = JSON.parse(event.data);
  console.log("Cursor update:", payload);
};
```
