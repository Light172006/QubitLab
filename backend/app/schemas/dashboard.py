from pydantic import BaseModel, Field
from typing import Optional
import uuid
from datetime import datetime

class StudentProgress(BaseModel):
    student_id: uuid.UUID
    student_name: str
    lessons_completed: int
    challenges_solved: int
    total_points: int
    last_active: Optional[datetime]

class ClassResponse(BaseModel):
    class_id: uuid.UUID
    class_name: str
    students: list[StudentProgress]
    total_students: int

class AssignmentCreate(BaseModel):
    class_id: uuid.UUID
    challenge_id: uuid.UUID
    due_date: Optional[datetime] = None
    title: str = Field(min_length=1)

class AssignmentResponse(BaseModel):
    id: uuid.UUID
    class_id: uuid.UUID
    challenge_id: uuid.UUID
    title: str
    due_date: Optional[datetime]
    created_at: datetime
    submissions_count: int = 0
    model_config = {'from_attributes': True}
