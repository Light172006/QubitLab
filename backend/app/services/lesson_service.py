from typing import Sequence
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.lesson import Lesson, LessonProgress

async def list_lessons(db: AsyncSession) -> Sequence[Lesson]:
    result = await db.execute(select(Lesson).order_by(Lesson.module_id, Lesson.order_index))
    return result.scalars().all()

async def get_lesson(db: AsyncSession, lesson_id: int) -> Lesson:
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalars().first()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    return lesson

async def update_progress(db: AsyncSession, user_id: int, lesson_id: int, status_val: str, quiz_score: int | None = None) -> LessonProgress:
    # Ensure lesson exists
    await get_lesson(db, lesson_id)
    
    result = await db.execute(select(LessonProgress).where(LessonProgress.user_id == user_id, LessonProgress.lesson_id == lesson_id))
    progress = result.scalars().first()
    
    if progress:
        progress.status = status_val
        if quiz_score is not None:
            progress.quiz_score = quiz_score
    else:
        progress = LessonProgress(user_id=user_id, lesson_id=lesson_id, status=status_val, quiz_score=quiz_score)
        db.add(progress)
        
    await db.commit()
    await db.refresh(progress)
    return progress

async def get_user_progress(db: AsyncSession, user_id: int) -> Sequence[LessonProgress]:
    result = await db.execute(select(LessonProgress).where(LessonProgress.user_id == user_id))
    return result.scalars().all()
