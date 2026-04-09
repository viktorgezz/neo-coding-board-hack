# NEO Coding Board Hack - WS Code Service

![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-realtime-0A66C2)
![Pydantic](https://img.shields.io/badge/Pydantic-v2-1F7A8C)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)

Realtime-сервис синхронизации текста редактора между интервьюером и кандидатом.

Назначение сервиса:

- хранить авторитетное состояние кода по комнате (`text_content`, `id_language`, `version`);
- при подключении отдавать снимок (`snapshot`) текущему клиенту;
- принимать полные снимки от любого участника и рассылать обновления остальным;
- добавлять `timestamp` относительно начала сессии комнаты;
- валидировать размер и формат входящих сообщений.

Ограничения:

- состояние только в памяти процесса (без БД);
- при одновременном редактировании действует last-write-wins на сервере;
- `text_content` не длиннее 512 KiB символов (см. `MAX_TEXT_BYTES` в `main.py`).

---

## 1) WebSocket endpoint

- `WS /ws/{interview_id}/{user_role}`

`user_role`: `candidate` или `interviewer`. Иначе соединение закрывается с code `1008`.

Локально (после `docker compose up` для этого сервиса):

- HTTP: `http://localhost:8003`
- WebSocket: `ws://localhost:8003/ws/{interview_id}/{user_role}`

---

## 2) Контракты сообщений

### Первое сообщение после подключения (server → этот клиент)

Снимок состояния комнаты:

```json
{
  "type": "snapshot",
  "text_content": "",
  "id_language": "",
  "version": 0
}
```

### Входящее сообщение (client → server)

```json
{
  "text_content": "def hello():\n    pass\n",
  "id_language": "python"
}
```

`id_language` может быть пустой строкой.

### Исходящее сообщение к другим участникам (server → peers)

После каждого валидного входящего сообщения остальные получают:

```json
{
  "type": "update",
  "text_content": "def hello():\n    pass\n",
  "id_language": "python",
  "version": 1,
  "from_role": "candidate",
  "timestamp": 4.512
}
```

`timestamp` — секунды с начала сессии комнаты (округление до 3 знаков).

### Ошибка валидации (server → отправитель)

```json
{
  "error": "invalid_code_payload",
  "details": [ ... ]
}
```

---

## 3) Архитектура (файл `main.py`)

- `CodeIn` — входящая схема (`text_content`, `id_language`);
- `CodeSnapshotOut` — первое сообщение при connect (`type: snapshot`);
- `CodeUpdateOut` — рассылка правок (`type: update`, плюс `version`, `from_role`, `timestamp`);
- `ConnectionManager` — комнаты, состояние кода `room_state`, тайминг сессии, рассылка всем кроме отправителя.

Поток данных:

1. Клиент подключается к `WS /ws/{interview_id}/{user_role}`.
2. Сервис отправляет `snapshot`.
3. На каждый JSON от клиента — валидация `CodeIn`, обновление версии и рассылка `update` остальным.

---

## 4) Запуск

### Локально (Python)

```bash
cd WSCodeService
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8003
```

### Docker Compose

Из корня репозитория:

```bash
docker compose up ws-code-service --build
```

Сервис проброшен на порт **8003** хоста.

---

## 5) Пример клиента (JavaScript)

```javascript
const ws = new WebSocket("ws://localhost:8003/ws/interview-123/candidate");

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === "snapshot") {
    console.log("Initial:", msg.text_content, "v", msg.version);
  } else if (msg.type === "update") {
    console.log("Peer edit from", msg.from_role, msg.text_content);
  }
};

ws.onopen = () => {
  ws.send(
    JSON.stringify({
      text_content: "print('hi')",
      id_language: "python",
    }),
  );
};
```

Для проверки из консоли можно использовать [websocat](https://github.com/vi/websocat) или аналог: подключиться к URL и отправлять строки JSON вручную.
