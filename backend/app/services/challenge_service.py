from typing import Sequence
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.challenge import Challenge, ChallengeSubmission
from app.services.grading_service import grade

async def list_challenges(db: AsyncSession) -> Sequence[Challenge]:
    result = await db.execute(select(Challenge))
    return result.scalars().all()

async def get_challenge(db: AsyncSession, challenge_id: int) -> Challenge:
    result = await db.execute(select(Challenge).where(Challenge.id == challenge_id))
    challenge = result.scalars().first()
    if not challenge:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found")
    return challenge

async def submit_challenge(db: AsyncSession, user_id: int, challenge_id: int, circuit_data: dict, code: str | None = None) -> ChallengeSubmission:
    challenge = await get_challenge(db, challenge_id)
    
    score, passed, feedback = await grade(circuit_data, challenge.validation_rules, challenge)
    
    submission = ChallengeSubmission(
        user_id=user_id,
        challenge_id=challenge_id,
        circuit_data=circuit_data,
        code_submitted=code,
        score=score,
        passed=passed,
        feedback=feedback
    )
    
    db.add(submission)
    await db.commit()
    await db.refresh(submission)
    
    return submission
