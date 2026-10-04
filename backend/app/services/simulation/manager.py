from .qiskit_backend import QiskitBackend
from .pennylane_backend import PennyLaneBackend
from .cirq_backend import CirqBackend
from .base import SimulationBackend

class SimulationManager:
    def __init__(self):
        self._backends: dict[str, SimulationBackend] = {
            'qiskit': QiskitBackend(),
            'pennylane': PennyLaneBackend(),
            'cirq': CirqBackend(),
        }
    
    def get_backend(self, name: str) -> SimulationBackend:
        backend = self._backends.get(name)
        if not backend:
            raise ValueError(f'Unknown backend: {name}. Available: {list(self._backends.keys())}')
        return backend
    
    def list_backends(self) -> list[str]:
        return list(self._backends.keys())

simulation_manager = SimulationManager()
