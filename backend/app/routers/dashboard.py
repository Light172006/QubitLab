from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from app.database import get_db
from app.schemas.dashboard import ClassResponse, AssignmentResponse, AssignmentCreate
from app.services import dashboard_service
from app.routers.auth import get_current_user_dep

router = APIRouter(tags=['dashboard'])

def require_instructor(current_user = Depends(get_current_user_dep)):
    if current_user.role not in ('instructor', 'admin'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return current_user

@router.get("/class/{class_id}", response_model=ClassResponse)
async def get_class_dashboard(class_id: UUID, current_user = Depends(require_instructor), db: AsyncSession = Depends(get_db)):
    """Get class dashboard."""
    return await dashboard_service.get_class_dashboard(db, class_id)

@router.get("/assignments", response_model=List[AssignmentResponse])
async def list_assignments(current_user = Depends(require_instructor), db: AsyncSession = Depends(get_db)):
    """List instructor's assignments."""
    return await dashboard_service.list_assignments(db, current_user.id)

@router.post("/assignments", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assignment(assignment: AssignmentCreate, current_user = Depends(require_instructor), db: AsyncSession = Depends(get_db)):
    """Create assignment."""
    return await dashboard_service.create_assignment(db, current_user.id, assignment)
