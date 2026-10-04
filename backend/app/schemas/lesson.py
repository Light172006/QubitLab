from pydantic import BaseModel, Field
from typing import Optional
import uuid
from datetime import datetime

class LessonResponse(BaseModel):
    id: uuid.UUID
    module_id: str
    title: str
    description: Optional[str]
    content_md: str
    order_index: int
    prerequisites: list = []
    model_config = {'from_attributes': True}

class LessonSummary(BaseModel):
    id: uuid.UUID
    module_id: str
    title: str
    description: Optional[str]
    order_index: int
    model_config = {'from_attributes': True}

class LessonProgressUpdate(BaseModel):
    status: str = Field(pattern='^(not_started|in_progress|completed)$')
    quiz_score: Optional[float] = Field(default=None, ge=0.0, le=100.0)

class LessonProgressResponse(BaseModel):
    id: uuid.UUID
    lesson_id: uuid.UUID
    status: str
    quiz_score: Optional[float]
    completed_at: Optional[datetime]
    model_config = {'from_attributes': True}
