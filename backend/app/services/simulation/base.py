from abc import ABC, abstractmethod
from typing import Any
from app.schemas.circuit import CircuitDataSchema
from app.schemas.simulation import SimulationResultSchema

class SimulationBackend(ABC):
    name: str
    
    @abstractmethod
    async def run_circuit(self, circuit_data: CircuitDataSchema, shots: int = 1024, options: dict | None = None) -> SimulationResultSchema:
        pass
    
    @abstractmethod
    def circuit_to_code(self, circuit_data: CircuitDataSchema) -> str:
        """Convert circuit data to framework-specific code string."""
        pass
