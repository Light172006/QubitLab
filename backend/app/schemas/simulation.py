from pydantic import BaseModel, Field
from typing import Optional, Any
import uuid
from datetime import datetime
from .circuit import CircuitDataSchema

class SimulateRequest(BaseModel):
    circuit_data: CircuitDataSchema
    backend: str = 'qiskit'
    shots: int = Field(default=1024, ge=1, le=100000)
    options: Optional[dict] = None
    code: Optional[str] = None  # Alternative: provide raw code

class SimulationResultSchema(BaseModel):
    counts: dict[str, int]
    statevector: Optional[list[list[float]]] = None  # [[real, imag], ...]
    probabilities: list[float]
    execution_time: float
    backend_name: str

class SimulationJobResponse(BaseModel):
    job_id: uuid.UUID
    status: str
    result: Optional[SimulationResultSchema] = None
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    model_config = {'from_attributes': True}
