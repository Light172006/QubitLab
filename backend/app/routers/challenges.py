from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from app.database import get_db
from app.schemas.challenge import ChallengeSummary, ChallengeResponse, ChallengeSubmitRequest, ChallengeSubmissionResponse
from app.services import challenge_service
from app.routers.auth import get_current_user_dep

router = APIRouter(tags=['challenges'])

@router.get("/", response_model=List[ChallengeSummary])
async def list_challenges(db: AsyncSession = Depends(get_db)):
    """List challenges (summaries)."""
    return await challenge_service.get_all_challenges(db)

@router.get("/{challenge_id}", response_model=ChallengeResponse)
async def get_challenge(challenge_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get challenge details."""
    return await challenge_service.get_challenge(db, challenge_id)

@router.post("/{challenge_id}/submit", response_model=ChallengeSubmissionResponse)
async def submit_challenge(challenge_id: UUID, request: ChallengeSubmitRequest, current_user = Depends(get_current_user_dep), db: AsyncSession = Depends(get_db)):
    """Submit challenge solution."""
    return await challenge_service.submit_solution(db, current_user.id, challenge_id, request)
