import asyncio
import time
import pennylane as qml
from collections import Counter
import numpy as np

from app.schemas.circuit import CircuitDataSchema
from app.schemas.simulation import SimulationResultSchema
from app.services.simulation.base import SimulationBackend

class PennyLaneBackend(SimulationBackend):
    name = "pennylane"
    
    def _run_sync(self, circuit_data: CircuitDataSchema, shots: int) -> SimulationResultSchema:
        start_time = time.time()
        
        dev_sv = qml.device("default.qubit", wires=circuit_data.num_qubits)
        dev_shots = qml.device("default.qubit", wires=circuit_data.num_qubits, shots=shots)
        
        def circuit_ops():
            for gate in circuit_data.gates:
                gate_type = gate.type.upper()
                if gate_type == "H":
                    qml.Hadamard(wires=gate.target)
                elif gate_type == "X":
                    qml.PauliX(wires=gate.target)
                elif gate_type == "Y":
                    qml.PauliY(wires=gate.target)
                elif gate_type == "Z":
                    qml.PauliZ(wires=gate.target)
                elif gate_type == "CNOT":
                    qml.CNOT(wires=[gate.control, gate.target])
                elif gate_type == "SWAP":
                    qml.SWAP(wires=[gate.control, gate.target])
                elif gate_type == "TOFFOLI":
                    qml.Toffoli(wires=[gate.controls[0], gate.controls[1], gate.target])
                elif gate_type == "RX":
                    qml.RX(gate.params[0], wires=gate.target)
                elif gate_type == "RY":
                    qml.RY(gate.params[0], wires=gate.target)
                elif gate_type == "RZ":
                    qml.RZ(gate.params[0], wires=gate.target)
                elif gate_type == "S":
                    qml.S(wires=gate.target)
                elif gate_type == "T":
                    qml.T(wires=gate.target)
        
        @qml.qnode(dev_sv)
        def get_statevector():
            circuit_ops()
            return qml.state()
            
        @qml.qnode(dev_shots)
        def get_counts():
            circuit_ops()
            return qml.sample()
            
        sv = get_statevector()
        sv_list = [[float(v.real), float(v.imag)] for v in sv]
        probs = [float(abs(v)**2) for v in sv]
        
        samples = get_counts()
        counts_dict = Counter()
        for sample in samples:
            bitstring = "".join(str(int(b)) for b in sample)
            counts_dict[bitstring] += 1
            
        end_time = time.time()
        
        return SimulationResultSchema(
            backend_name=self.name,
            counts=dict(counts_dict),
            statevector=sv_list,
            probabilities=probs,
            execution_time=end_time - start_time
        )
        
    async def run_circuit(self, circuit_data: CircuitDataSchema, shots: int = 1024, options: dict | None = None) -> SimulationResultSchema:
        return await asyncio.to_thread(self._run_sync, circuit_data, shots)
        
    def circuit_to_code(self, circuit_data: CircuitDataSchema) -> str:
        lines = [
            "import pennylane as qml",
            "",
            f"dev = qml.device('default.qubit', wires={circuit_data.num_qubits})",
            "",
            "@qml.qnode(dev)",
            "def circuit():"
        ]
        
        for gate in circuit_data.gates:
            gate_type = gate.type.upper()
            if gate_type == "H":
                lines.append(f"    qml.Hadamard(wires={gate.target})")
            elif gate_type == "X":
                lines.append(f"    qml.PauliX(wires={gate.target})")
            elif gate_type == "Y":
                lines.append(f"    qml.PauliY(wires={gate.target})")
            elif gate_type == "Z":
                lines.append(f"    qml.PauliZ(wires={gate.target})")
            elif gate_type == "CNOT":
                lines.append(f"    qml.CNOT(wires=[{gate.control}, {gate.target}])")
            elif gate_type == "SWAP":
                lines.append(f"    qml.SWAP(wires=[{gate.control}, {gate.target}])")
            elif gate_type == "TOFFOLI":
                lines.append(f"    qml.Toffoli(wires=[{gate.controls[0]}, {gate.controls[1]}, {gate.target}])")
            elif gate_type in ["RX", "RY", "RZ"]:
                lines.append(f"    qml.{gate_type}({gate.params[0]}, wires={gate.target})")
            elif gate_type == "S":
                lines.append(f"    qml.S(wires={gate.target})")
            elif gate_type == "T":
                lines.append(f"    qml.T(wires={gate.target})")
                
        lines.append("    return qml.state()")
        return "\n".join(lines)
