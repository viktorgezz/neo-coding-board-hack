from contextlib import asynccontextmanager

from fastapi import FastAPI

from database import run_migrations
from routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    run_migrations()
    yield


app = FastAPI(
    title="NEO CODING BOARD - Analytics & AI Engine",
    version="1.3.0",
    lifespan=lifespan,
)
app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
