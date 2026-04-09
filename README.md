# NEO Coding Board Hack - Analytics Service

![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-D71F00?logo=sqlalchemy&logoColor=white)
![Alembic](https://img.shields.io/badge/Alembic-Migrations-4B8BBE)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-supported-4169E1?logo=postgresql&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-supported-003B57?logo=sqlite&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)
![AI](https://img.shields.io/badge/AI-GigaChat-2E7D32)

Сервис аналитики технических интервью для Live Coding платформы.

Назначение сервиса:
- принимать историю интервью (снимки кода + заметки интервьюера);
- собирать realtime-сигналы поведения кандидата (paste/tab switch);
- строить отчеты кандидата с метриками, трендами и сравнительной статистикой;
- генерировать AI-резюме по результатам интервью.

---

## 1) Описание

### Что делает API

Основные эндпоинты:
- `POST /api/v1/rooms/{idRoom}/history` - загрузка истории сессии (базовые данные интервью);
- `POST /api/v1/rooms/{idRoom}/metrics/increment-paste` - инкремент счетчика paste и запись события;
- `POST /api/v1/rooms/{idRoom}/metrics/increment-tab-switch` - инкремент tab switch и запись события;
- `POST /api/v1/rooms/{idRoom}/interviewer-assessment` - сохранение оценки интервьюера;
- `GET /api/v1/rooms/{idRoom}/candidate-report` - сборный аналитический отчет;
- `GET /api/v1/rooms/{idRoom}/ai-summary` - AI-резюме (сохранение и возврат).

### Технологический стек

- Backend: `FastAPI`, `Pydantic v2`
- БД и ORM: `SQLAlchemy 2`, `Alembic`
- Драйверы БД: `SQLite` (по умолчанию), `PostgreSQL` (production-ready)
- Анализ кода:
  - эвристический: `ast`, `javalang`, `esprima`, `bashlex`, `libclang`
  - цикломатическая сложность: `radon` (Python), `lizard` (другие языки)
- AI-интеграция: `GigaChat API` (OAuth + chat completions)
- Деплой: `Docker`

---

## 2) Инструкция по запуску

### Локально (Python)

1. Перейти в директорию сервиса:
```bash
cd AnaliticsService
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

Минимальные переменные:
- `DATABASE_URL` - строка подключения (если не задано, используется `sqlite:///./analytics.db`);
- `GIGACHAT_AUTH_KEY` - Base64 от `<client_id>:<client_secret>` (нужен для `/ai-summary`).

5. Запустить API:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

При старте автоматически выполняются миграции Alembic до `head`.

### Через Docker

Из директории `AnaliticsService`:
```bash
docker build -t neo-analytics-service .
docker run --rm -p 8000:8000 --env-file .env neo-analytics-service
```

---

## 3) Архитектура

Сервис реализован как монолитный API с четким разделением слоев:

- `routes.py` - HTTP-контракты и оркестрация use-case'ов;
- `crud.py` - операции записи/обновления данных в БД;
- `services/get_metrics.py` - вычисление метрик и сборка `candidate-report`;
- `services/interview_summarizer.py` - AI-резюме на основе candidate-report;
- `models.py` + `schemas.py` - модель БД и API-схемы;
- `database.py` + Alembic - подключение и миграции.

Поток данных:
1. История интервью загружается в `session_histories`, `code_snapshots`, `interviewer_notes`.
2. Realtime-события paste/tab switch пишутся в `room_realtime_events`, счетчики - в `analytics_rooms`.
3. `candidate-report` агрегирует timeline, complexity trend, radar и comparative.
4. `ai-summary` получает report как JSON, отправляет в GigaChat и сохраняет итог в `ai_summaries`.

---

## 4) Аналитика: метрики и математика

Ниже описаны ключевые вычисления, которые используются в отчете кандидата.

### 4.1 Сложность кода по снапшотам

Для каждого снимка кода считаются две оценки:
- `heuristic_complexity` - эвристическая сложность (AST/паттерны, зависит от языка);
- `cyclomatic_complexity` - цикломатическая сложность.

Комбинированный raw-скор снапшота:

$$
S_i = H_i + C_i
$$

где:
- $H_i$ - эвристическая сложность снимка $i$;
- $C_i$ - цикломатическая сложность снимка $i$.

### 4.2 Нормализованный тренд сложности

Для графика тренда используется нормализация по максимуму в рамках текущей сессии:

$$
\hat{H}_i = \frac{H_i}{\max_j H_j}, \qquad
\hat{C}_i = \frac{C_i}{\max_j C_j}
$$

Комбинация:

$$
T_i =
\begin{cases}
\frac{\hat{H}_i + \hat{C}_i}{2}, & \hat{H}_i > 0 \land \hat{C}_i > 0 \\
\hat{H}_i + \hat{C}_i, & \text{иначе}
\end{cases}
$$

В API `complexityTrend` отправляется в шкале 0..100:

$$
T_i^{(100)} = \mathrm{round}(100 \cdot T_i)
$$

### 4.3 Сырый score кандидата (для сравнительной аналитики)

На основе средних значений по снапшотам и штрафов за поведенческие сигналы:

$$
\text{skill} = \frac{1}{n}\sum_{i=1}^{n}(H_i + C_i)
$$

$$
\text{raw} = 3 \cdot \text{skill} - 2 \cdot \text{paste} - 0.5 \cdot \text{tabSwitch}
$$

где:
- `paste` - количество вставок из буфера;
- `tabSwitch` - количество переключений вкладки.

### 4.4 Comparative: Z-score, перцентиль и кривая распределения

Если в БД достаточно peer-комнат (минимум 2), параметры берутся эмпирически:

<p><b>μ</b> = mean(raw<sub>peer</sub>), <b>σ</b> = std<sub>pop</sub>(raw<sub>peer</sub>)</p>

<p><b>z</b> = (raw<sub>candidate</sub> - μ) / σ</p>

Перцентиль в эмпирическом режиме:

<p><b>percentile</b> = 100 × ( count(s ∈ peer, where s ≤ raw<sub>candidate</sub>) / count(peer) )</p>

Если peer-данных мало, используются fallback-параметры:
- <b>μ</b> = 28.0
- <b>σ</b> = 10.0

И перцентиль считается через CDF стандартного нормального распределения:

<p><b>Φ(z)</b> = 0.5 × (1 + erf(z / √2))</p>

<p><b>percentile</b> = 100 × Φ(z)</p>

Кривая `distributionCurve` строится как нормализованная плотность `N(0,1)`:

<p><b>φ(x)</b> = (1 / √(2π)) × e<sup>-x²/2</sup></p>

<p><b>y<sub>norm</sub>(x)</b> = φ(x) / max<sub>x</sub>(φ(x))</p>

### 4.5 Radar-метрики

`radarMetrics` формируется из сохраненного отчета (6 осей):
- `systemDesign`
- `codeReadability`
- `communication`
- `coachability`
- `technicalScore`
- `integrity`

При отсутствии данных возвращаются нулевые значения.

---

## 5) Описание AI-summary

`GET /api/v1/rooms/{idRoom}/ai-summary` работает так:

1. Сервис строит `candidate-report` по комнате.
2. Формирует промпт для GigaChat (роль: тех. рекрутер/аналитик).
3. Отправляет report в JSON виде в `chat/completions`.
4. Ожидает строгий JSON формата:
   - `positivePoints: string[]`
   - `negativePoints: string[]`
   - `aiRecommendation: string`
5. Нормализует ответ (поддерживаются алиасы полей) и валидирует схемой Pydantic.
6. Сохраняет результат в `ai_summaries` и `ai_summary_bullets`.

Особенности логики:
- Основной фокус AI - заметки интервьюера и контекст событий timeline;
- учитывается последовательность событий (например, поздние paste после финальной позитивной заметки);
- итог возвращается в виде короткой HR-ориентированной выжимки.

---

## Полезные замечания

- Для AI-функциональности нужен валидный `GIGACHAT_AUTH_KEY`.
- Для production рекомендуется PostgreSQL и отдельная настройка сетевой/секретной инфраструктуры.
- Swagger UI доступен после запуска по `/docs`.

