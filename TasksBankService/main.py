"""Точка входа FastAPI-приложения банка задач."""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from database import run_migrations
from routes import router


@asynccontextmanager
async def lifespan(_: FastAPI):
    """При старте приложения прогоняет миграции БД до head."""
    run_migrations()
    yield


app = FastAPI(
    title="NEO CODING BOARD - Tasks Bank Service",
    version="1.0.0",
    lifespan=lifespan,
)
app.include_router(router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
