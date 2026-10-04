from typing import Sequence
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.dashboard import Class_, ClassEnrollment
from app.models.user import User
from app.schemas.dashboard import ClassResponse, AssignmentResponse, AssignmentCreate
from app.services.progress_service import get_overview

async def get_class_dashboard(db: AsyncSession, class_id: int, instructor_id: int) -> ClassResponse:
    # Fetch Class_ and verify instructor
    result = await db.execute(select(Class_).where(Class_.id == class_id))
    cls = result.scalars().first()
    
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class_ not found")
        
    if cls.instructor_id != instructor_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this Class_")
        
    # Get students
    enrollments_result = await db.execute(
        select(ClassEnrollment).where(ClassEnrollment.class_id == class_id).options(selectinload(ClassEnrollment.user))
    )
    enrollments = enrollments_result.scalars().all()
    
    students_data = []
    for enr in enrollments:
        user = enr.user
        progress = await get_overview(db, user.id)
        students_data.append({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "completed_lessons": progress.completed_lessons,
            "passed_challenges": progress.passed_challenges,
            "total_points": progress.total_points
        })
        
    return ClassResponse(
        id=cls.id,
        name=cls.name,
        description=cls.description,
        instructor_id=cls.instructor_id,
        invite_code=cls.invite_code,
        students=students_data
    )

async def list_assignments(db: AsyncSession, instructor_id: int) -> Sequence[AssignmentResponse]:
    return []

async def create_assignment(db: AsyncSession, instructor_id: int, data: AssignmentCreate) -> AssignmentResponse:
    raise HTTPException(status_code=501, detail="Assignments not implemented yet")
