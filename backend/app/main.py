from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import init_db
from app.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(
    title='QubitLab API',
    version='1.0.0',
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import auth, circuits, simulate, tutor, lessons, challenges, progress, dashboard

app.include_router(auth.router, prefix="/api/auth")
app.include_router(circuits.router, prefix="/api/circuits")
app.include_router(simulate.router, prefix="/api/simulate")
app.include_router(tutor.router, prefix="/api/tutor")
app.include_router(lessons.router, prefix="/api/lessons")
app.include_router(challenges.router, prefix="/api/challenges")
app.include_router(progress.router, prefix="/api/progress")
app.include_router(dashboard.router, prefix="/api/dashboard")

@app.get("/api/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}

@app.get("/", tags=["Root"])
async def root():
    return {
        "name": "QubitLab API",
        "version": "1.0.0",
        "docs_url": "/docs"
    }
