FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Зависимости Python
COPY requirements.txt /app/requirements.txt
RUN pip install --upgrade pip && pip install -r /app/requirements.txt

# Код сервиса
COPY . /app

# FastAPI
EXPOSE 8000

# Миграции запускаются в lifespan приложения (main.py -> run_migrations)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

