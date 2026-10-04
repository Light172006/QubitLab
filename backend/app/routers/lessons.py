from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from app.database import get_db
from app.schemas.lesson import LessonSummary, LessonResponse, LessonProgressUpdate, LessonProgressResponse
from app.services import lesson_service
from app.routers.auth import get_current_user_dep

router = APIRouter(tags=['lessons'])

@router.get("/", response_model=List[LessonSummary])
async def list_lessons(db: AsyncSession = Depends(get_db)):
    """List all lessons (summaries)."""
    return await lesson_service.get_all_lessons(db)

@router.get("/{lesson_id}", response_model=LessonResponse)
async def get_lesson(lesson_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get full lesson."""
    return await lesson_service.get_lesson(db, lesson_id)

@router.post("/{lesson_id}/progress", response_model=LessonProgressResponse)
async def update_lesson_progress(lesson_id: UUID, update: LessonProgressUpdate, current_user = Depends(get_current_user_dep), db: AsyncSession = Depends(get_db)):
    """Update lesson progress."""
    return await lesson_service.update_progress(db, current_user.id, lesson_id, update)
