import asyncio
import time
from typing import Any
import qiskit
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator

from app.schemas.circuit import CircuitDataSchema
from app.schemas.simulation import SimulationResultSchema
from app.services.simulation.base import SimulationBackend

class QiskitBackend(SimulationBackend):
    name = "qiskit"
    
    def _run_sync(self, circuit_data: CircuitDataSchema, shots: int) -> SimulationResultSchema:
        start_time = time.time()
        
        qc = QuantumCircuit(circuit_data.num_qubits)
        
        for gate in circuit_data.gates:
            gate_type = gate.type.upper()
            if gate_type == "H":
                qc.h(gate.target)
            elif gate_type == "X":
                qc.x(gate.target)
            elif gate_type == "Y":
                qc.y(gate.target)
            elif gate_type == "Z":
                qc.z(gate.target)
            elif gate_type == "CNOT":
                qc.cx(gate.control, gate.target)
            elif gate_type == "SWAP":
                qc.swap(gate.control, gate.target)
            elif gate_type == "TOFFOLI":
                qc.ccx(gate.controls[0], gate.controls[1], gate.target)
            elif gate_type == "RX":
                qc.rx(gate.params[0], gate.target)
            elif gate_type == "RY":
                qc.ry(gate.params[0], gate.target)
            elif gate_type == "RZ":
                qc.rz(gate.params[0], gate.target)
            elif gate_type == "S":
                qc.s(gate.target)
            elif gate_type == "T":
                qc.t(gate.target)
                
        # Statevector sim
        qc_sv = qc.copy()
        qc_sv.save_statevector()
        sim_sv = AerSimulator(method="statevector")
        result_sv = sim_sv.run(qc_sv).result()
        statevector = result_sv.get_statevector()
        
        sv_list = [[float(v.real), float(v.imag)] for v in statevector.data]
        probs = [float(abs(v)**2) for v in statevector.data]
        
        # Counts sim
        qc.measure_all()
        sim_qasm = AerSimulator(method="statevector")
        result_counts = sim_qasm.run(qc, shots=shots).result()
        counts = result_counts.get_counts()
        
        end_time = time.time()
        
        return SimulationResultSchema(
            backend_name=self.name,
            counts=counts,
            statevector=sv_list,
            probabilities=probs,
            execution_time=end_time - start_time
        )
        
    async def run_circuit(self, circuit_data: CircuitDataSchema, shots: int = 1024, options: dict | None = None) -> SimulationResultSchema:
        return await asyncio.to_thread(self._run_sync, circuit_data, shots)
        
    def circuit_to_code(self, circuit_data: CircuitDataSchema) -> str:
        lines = [
            "from qiskit import QuantumCircuit",
            "",
            f"qc = QuantumCircuit({circuit_data.num_qubits})"
        ]
        
        for gate in circuit_data.gates:
            gate_type = gate.type.upper()
            if gate_type == "H":
                lines.append(f"qc.h({gate.target})")
            elif gate_type == "X":
                lines.append(f"qc.x({gate.target})")
            elif gate_type == "Y":
                lines.append(f"qc.y({gate.target})")
            elif gate_type == "Z":
                lines.append(f"qc.z({gate.target})")
            elif gate_type == "CNOT":
                lines.append(f"qc.cx({gate.control}, {gate.target})")
            elif gate_type == "SWAP":
                lines.append(f"qc.swap({gate.control}, {gate.target})")
            elif gate_type == "TOFFOLI":
                lines.append(f"qc.ccx({gate.controls[0]}, {gate.controls[1]}, {gate.target})")
            elif gate_type in ["RX", "RY", "RZ"]:
                lines.append(f"qc.{gate_type.lower()}({gate.params[0]}, {gate.target})")
            elif gate_type == "S":
                lines.append(f"qc.s({gate.target})")
            elif gate_type == "T":
                lines.append(f"qc.t({gate.target})")
                
        lines.append("qc.measure_all()")
        return "\n".join(lines)
