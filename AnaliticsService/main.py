"""Точка входа FastAPI-приложения аналитики собеседований."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

from database import run_migrations
from jwt_auth import warmup_jwt_public_key
from routes import router
from settings import settings


def _attach_bearer_openapi(application: FastAPI) -> None:
    def custom_openapi():
        if application.openapi_schema:
            return application.openapi_schema
        openapi_schema = get_openapi(
            title=application.title,
            version=application.version,
            routes=application.routes,
        )
        openapi_schema.setdefault("components", {}).setdefault("securitySchemes", {})["BearerAuth"] = {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
        openapi_schema["security"] = [{"BearerAuth": []}]
        application.openapi_schema = openapi_schema
        return application.openapi_schema

    application.openapi = custom_openapi


@asynccontextmanager
async def lifespan(app: FastAPI):
    """При старте: загрузка JWT public key, миграции БД до head."""
    warmup_jwt_public_key(settings.jwt_public_key_path)
    run_migrations()
    yield


app = FastAPI(
    title="NEO CODING BOARD - Analytics & AI Engine",
    version="1.3.0",
    lifespan=lifespan,
)
app.include_router(router)
_attach_bearer_openapi(app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
