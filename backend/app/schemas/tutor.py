from pydantic import BaseModel, Field
from typing import Optional
import uuid
from datetime import datetime

class TutorChatRequest(BaseModel):
    session_id: Optional[uuid.UUID] = None
    message: str = Field(min_length=1, max_length=5000)
    context: Optional[dict] = None  # Current circuit/lesson context

class TutorMessageResponse(BaseModel):
    role: str
    content: str
    created_at: Optional[datetime] = None
    model_config = {'from_attributes': True}

class TutorSessionResponse(BaseModel):
    id: uuid.UUID
    context: Optional[dict] = None
    messages: list[TutorMessageResponse] = []
    created_at: datetime
    model_config = {'from_attributes': True}
