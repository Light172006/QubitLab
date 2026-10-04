import asyncio
import time
from collections import Counter
import cirq
import numpy as np

from app.schemas.circuit import CircuitDataSchema
from app.schemas.simulation import SimulationResultSchema
from app.services.simulation.base import SimulationBackend

class CirqBackend(SimulationBackend):
    name = "cirq"
    
    def _run_sync(self, circuit_data: CircuitDataSchema, shots: int) -> SimulationResultSchema:
        start_time = time.time()
        
        qubits = cirq.LineQubit.range(circuit_data.num_qubits)
        circuit = cirq.Circuit()
        
        for gate in circuit_data.gates:
            gate_type = gate.type.upper()
            if gate_type == "H":
                circuit.append(cirq.H(qubits[gate.target]))
            elif gate_type == "X":
                circuit.append(cirq.X(qubits[gate.target]))
            elif gate_type == "Y":
                circuit.append(cirq.Y(qubits[gate.target]))
            elif gate_type == "Z":
                circuit.append(cirq.Z(qubits[gate.target]))
            elif gate_type == "CNOT":
                circuit.append(cirq.CNOT(qubits[gate.control], qubits[gate.target]))
            elif gate_type == "SWAP":
                circuit.append(cirq.SWAP(qubits[gate.control], qubits[gate.target]))
            elif gate_type == "TOFFOLI":
                circuit.append(cirq.TOFFOLI(qubits[gate.controls[0]], qubits[gate.controls[1]], qubits[gate.target]))
            elif gate_type == "RX":
                circuit.append(cirq.rx(gate.params[0])(qubits[gate.target]))
            elif gate_type == "RY":
                circuit.append(cirq.ry(gate.params[0])(qubits[gate.target]))
            elif gate_type == "RZ":
                circuit.append(cirq.rz(gate.params[0])(qubits[gate.target]))
            elif gate_type == "S":
                circuit.append(cirq.S(qubits[gate.target]))
            elif gate_type == "T":
                circuit.append(cirq.T(qubits[gate.target]))
                
        simulator = cirq.Simulator()
        
        result_sv = simulator.simulate(circuit)
        sv = result_sv.final_state_vector
        sv_list = [[float(v.real), float(v.imag)] for v in sv]
        probs = [float(abs(v)**2) for v in sv]
        
        circuit.append(cirq.measure(*qubits, key='result'))
        result_shots = simulator.run(circuit, repetitions=shots)
        
        measurements = result_shots.measurements['result']
        counts_dict = Counter()
        for sample in measurements:
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
            "import cirq",
            "",
            f"qubits = cirq.LineQubit.range({circuit_data.num_qubits})",
            "circuit = cirq.Circuit()"
        ]
        
        for gate in circuit_data.gates:
            gate_type = gate.type.upper()
            if gate_type == "H":
                lines.append(f"circuit.append(cirq.H(qubits[{gate.target}]))")
            elif gate_type == "X":
                lines.append(f"circuit.append(cirq.X(qubits[{gate.target}]))")
            elif gate_type == "Y":
                lines.append(f"circuit.append(cirq.Y(qubits[{gate.target}]))")
            elif gate_type == "Z":
                lines.append(f"circuit.append(cirq.Z(qubits[{gate.target}]))")
            elif gate_type == "CNOT":
                lines.append(f"circuit.append(cirq.CNOT(qubits[{gate.control}], qubits[{gate.target}]))")
            elif gate_type == "SWAP":
                lines.append(f"circuit.append(cirq.SWAP(qubits[{gate.control}], qubits[{gate.target}]))")
            elif gate_type == "TOFFOLI":
                lines.append(f"circuit.append(cirq.TOFFOLI(qubits[{gate.controls[0]}], qubits[{gate.controls[1]}], qubits[{gate.target}]))")
            elif gate_type in ["RX", "RY", "RZ"]:
                lines.append(f"circuit.append(cirq.{gate_type.lower()}({gate.params[0]})(qubits[{gate.target}]))")
            elif gate_type == "S":
                lines.append(f"circuit.append(cirq.S(qubits[{gate.target}]))")
            elif gate_type == "T":
                lines.append(f"circuit.append(cirq.T(qubits[{gate.target}]))")
                
        lines.append("circuit.append(cirq.measure(*qubits, key='result'))")
        return "\n".join(lines)
