from pydantic import BaseModel, Field
from typing import Optional, Any
import uuid
from datetime import datetime

class GateSchema(BaseModel):
    id: str
    type: str
    qubit: int
    col: int
    control: Optional[int] = None
    param: Optional[float] = None

class CircuitDataSchema(BaseModel):
    nQubits: int = Field(ge=1, le=12)
    gates: list[GateSchema] = []

class CircuitCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    gate_data: CircuitDataSchema
    code: Optional[str] = None
    backend: str = 'qiskit'

class CircuitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    gate_data: Optional[CircuitDataSchema] = None
    code: Optional[str] = None
    backend: Optional[str] = None

class CircuitResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    description: Optional[str]
    gate_data: dict
    code: Optional[str]
    backend: str
    created_at: datetime
    updated_at: Optional[datetime]
    model_config = {'from_attributes': True}
