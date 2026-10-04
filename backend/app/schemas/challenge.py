from pydantic import BaseModel, Field
from typing import Optional, Any
import uuid
from datetime import datetime

class ChallengeResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str]
    difficulty: str
    starter_circuit: Optional[dict]
    validation_rules: dict
    points: int
    model_config = {'from_attributes': True}

class ChallengeSummary(BaseModel):
    id: uuid.UUID
    title: str
    difficulty: str
    points: int
    model_config = {'from_attributes': True}

class ChallengeSubmitRequest(BaseModel):
    circuit_data: dict
    code: Optional[str] = None

class ChallengeSubmissionResponse(BaseModel):
    id: uuid.UUID
    challenge_id: uuid.UUID
    score: int
    passed: bool
    feedback: Optional[str]
    created_at: datetime
    model_config = {'from_attributes': True}
