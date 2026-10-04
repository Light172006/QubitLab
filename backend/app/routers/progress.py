from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.progress import ProgressOverview, SkillBreakdownResponse
from app.services import progress_service
from app.routers.auth import get_current_user_dep

router = APIRouter(tags=['progress'])

@router.get("/", response_model=ProgressOverview)
async def get_progress_overview(current_user = Depends(get_current_user_dep), db: AsyncSession = Depends(get_db)):
    """Get user progress overview."""
    return await progress_service.get_user_progress(db, current_user.id)

@router.get("/skills", response_model=SkillBreakdownResponse)
async def get_skill_breakdown(current_user = Depends(get_current_user_dep), db: AsyncSession = Depends(get_db)):
    """Get skill breakdown."""
    return await progress_service.get_user_skills(db, current_user.id)
