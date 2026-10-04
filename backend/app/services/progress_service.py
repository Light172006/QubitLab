from datetime import datetime, timedelta
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.models.lesson import Lesson, LessonProgress
from app.models.challenge import Challenge, ChallengeSubmission
from app.schemas.progress import ProgressOverview, SkillBreakdownResponse

async def get_overview(db: AsyncSession, user_id: int) -> ProgressOverview:
    # Total lessons
    total_lessons_result = await db.execute(select(func.count(Lesson.id)))
    total_lessons = total_lessons_result.scalar() or 0
    
    # Completed lessons
    completed_lessons_result = await db.execute(
        select(func.count(LessonProgress.id)).where(
            LessonProgress.user_id == user_id,
            LessonProgress.status == "completed"
        )
    )
    completed_lessons = completed_lessons_result.scalar() or 0
    
    # Total challenges
    total_challenges_result = await db.execute(select(func.count(Challenge.id)))
    total_challenges = total_challenges_result.scalar() or 0
    
    # Passed challenges
    passed_challenges_result = await db.execute(
        select(func.count(ChallengeSubmission.id)).where(
            ChallengeSubmission.user_id == user_id,
            ChallengeSubmission.passed == True
        )
    )
    passed_challenges = passed_challenges_result.scalar() or 0
    
    # Total points
    points_result = await db.execute(
        select(func.sum(ChallengeSubmission.score)).where(
            ChallengeSubmission.user_id == user_id,
            ChallengeSubmission.passed == True
        )
    )
    total_points = points_result.scalar() or 0
    
    # Calculate streak (simplified for now based on recent activity)
    # Ideally, we'd query distinct dates from activity logs
    streak = 0
    
    return ProgressOverview(
        completed_lessons=completed_lessons,
        total_lessons=total_lessons,
        passed_challenges=passed_challenges,
        total_challenges=total_challenges,
        total_points=int(total_points),
        streak=streak
    )

async def get_skill_breakdown(db: AsyncSession, user_id: int) -> SkillBreakdownResponse:
    # Placeholder logic for skill breakdown
    # In a real app, these would be computed from specific lesson modules and challenge categories
    
    overview = await get_overview(db, user_id)
    
    # Simple heuristic for dummy data based on progress
    lesson_progress = overview.completed_lessons / max(1, overview.total_lessons)
    challenge_progress = overview.passed_challenges / max(1, overview.total_challenges)
    
    base_skill = min(100, int((lesson_progress * 50) + (challenge_progress * 50)))
    
    skills = {
        "Single Qubit Gates": min(100, base_skill + 20),
        "Multi-Qubit Gates": min(100, base_skill + 5),
        "Quantum Algorithms": min(100, max(0, base_skill - 20)),
        "Circuit Design": min(100, base_skill + 10),
        "Measurement & Analysis": min(100, base_skill + 15),
    }
    
    return SkillBreakdownResponse(skills=skills)
