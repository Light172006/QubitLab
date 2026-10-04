def circuit_to_qiskit_code(circuit_data: dict) -> str:
    """Convert circuit JSON to Qiskit Python code."""
    num_qubits = circuit_data.get('nQubits', 1)
    gates = circuit_data.get('gates', [])
    
    code = [
        "from qiskit import QuantumCircuit, execute, Aer",
        f"qc = QuantumCircuit({num_qubits})",
        ""
    ]
    
    # Sort gates by column
    gates_sorted = sorted(gates, key=lambda g: g.get('column', 0))
    
    for gate in gates_sorted:
        gate_type = gate.get('type').lower()
        qubits = gate.get('qubits', [])
        params = gate.get('params', {})
        
        if not qubits:
            continue
            
        target = qubits[0]
        if gate_type in ['h', 'x', 'y', 'z', 's', 't']:
            code.append(f"qc.{gate_type}({target})")
        elif gate_type == 'cnot' and len(qubits) == 2:
            code.append(f"qc.cx({qubits[0]}, {qubits[1]})")
        elif gate_type == 'swap' and len(qubits) == 2:
            code.append(f"qc.swap({qubits[0]}, {qubits[1]})")
        elif gate_type == 'toffoli' and len(qubits) == 3:
            code.append(f"qc.ccx({qubits[0]}, {qubits[1]}, {qubits[2]})")
        elif gate_type in ['rx', 'ry', 'rz']:
            theta = params.get('theta', 0)
            code.append(f"qc.{gate_type}({theta}, {target})")
            
    code.extend([
        "",
        "qc.measure_all()",
        "simulator = Aer.get_backend('qasm_simulator')",
        "job = execute(qc, simulator, shots=1024)",
        "result = job.result()",
        "counts = result.get_counts(qc)",
        "print('Result:', counts)"
    ])
    
    return "\n".join(code)

def circuit_to_pennylane_code(circuit_data: dict) -> str:
    """Convert circuit JSON to PennyLane Python code."""
    num_qubits = circuit_data.get('nQubits', 1)
    gates = circuit_data.get('gates', [])
    
    code = [
        "import pennylane as qml",
        "import numpy as np",
        "",
        f"dev = qml.device('default.qubit', wires={num_qubits}, shots=1024)",
        "",
        "@qml.qnode(dev)",
        "def circuit():"
    ]
    
    gates_sorted = sorted(gates, key=lambda g: g.get('column', 0))
    
    gate_map = {
        'h': 'Hadamard', 'x': 'PauliX', 'y': 'PauliY', 'z': 'PauliZ',
        's': 'S', 't': 'T', 'cnot': 'CNOT', 'swap': 'SWAP', 'toffoli': 'Toffoli',
        'rx': 'RX', 'ry': 'RY', 'rz': 'RZ'
    }
    
    for gate in gates_sorted:
        gate_type = gate.get('type').lower()
        qubits = gate.get('qubits', [])
        params = gate.get('params', {})
        
        if not qubits:
            continue
            
        pl_gate = gate_map.get(gate_type)
        if not pl_gate:
            continue
            
        if gate_type in ['h', 'x', 'y', 'z', 's', 't']:
            code.append(f"    qml.{pl_gate}(wires={qubits[0]})")
        elif gate_type in ['cnot', 'swap']:
            if len(qubits) == 2:
                code.append(f"    qml.{pl_gate}(wires=[{qubits[0]}, {qubits[1]}])")
        elif gate_type == 'toffoli':
            if len(qubits) == 3:
                code.append(f"    qml.{pl_gate}(wires=[{qubits[0]}, {qubits[1]}, {qubits[2]}])")
        elif gate_type in ['rx', 'ry', 'rz']:
            theta = params.get('theta', 0)
            code.append(f"    qml.{pl_gate}({theta}, wires={qubits[0]})")
            
    code.extend([
        "    return qml.counts()",
        "",
        "result = circuit()",
        "print('Result:', result)"
    ])
    
    return "\n".join(code)

def circuit_to_cirq_code(circuit_data: dict) -> str:
    """Convert circuit JSON to Cirq Python code."""
    num_qubits = circuit_data.get('nQubits', 1)
    gates = circuit_data.get('gates', [])
    
    code = [
        "import cirq",
        "",
        f"qubits = cirq.LineQubit.range({num_qubits})",
        "circuit = cirq.Circuit()"
    ]
    
    gates_sorted = sorted(gates, key=lambda g: g.get('column', 0))
    
    gate_map = {
        'h': 'H', 'x': 'X', 'y': 'Y', 'z': 'Z',
        's': 'S', 't': 'T', 'cnot': 'CNOT', 'swap': 'SWAP', 'toffoli': 'TOFFOLI',
        'rx': 'rx', 'ry': 'ry', 'rz': 'rz'
    }
    
    for gate in gates_sorted:
        gate_type = gate.get('type').lower()
        qubits = gate.get('qubits', [])
        params = gate.get('params', {})
        
        if not qubits:
            continue
            
        cirq_gate = gate_map.get(gate_type)
        if not cirq_gate:
            continue
            
        if gate_type in ['h', 'x', 'y', 'z', 's', 't']:
            code.append(f"circuit.append(cirq.{cirq_gate}(qubits[{qubits[0]}]))")
        elif gate_type == 'cnot' and len(qubits) == 2:
            code.append(f"circuit.append(cirq.CNOT(qubits[{qubits[0]}], qubits[{qubits[1]}]))")
        elif gate_type == 'swap' and len(qubits) == 2:
            code.append(f"circuit.append(cirq.SWAP(qubits[{qubits[0]}], qubits[{qubits[1]}]))")
        elif gate_type == 'toffoli' and len(qubits) == 3:
            code.append(f"circuit.append(cirq.TOFFOLI(qubits[{qubits[0]}], qubits[{qubits[1]}], qubits[{qubits[2]}]))")
        elif gate_type in ['rx', 'ry', 'rz']:
            theta = params.get('theta', 0)
            code.append(f"circuit.append(cirq.{cirq_gate}({theta})(qubits[{qubits[0]}]))")
            
    code.extend([
        "circuit.append(cirq.measure(*qubits, key='result'))",
        "",
        "simulator = cirq.Simulator()",
        "result = simulator.run(circuit, repetitions=1024)",
        "print('Result:', result.histogram(key='result'))"
    ])
    
    return "\n".join(code)

def circuit_to_code(circuit_data: dict, backend: str = 'qiskit') -> str:
    """Convert circuit JSON to code for the specified backend."""
    converters = {
        'qiskit': circuit_to_qiskit_code,
        'pennylane': circuit_to_pennylane_code,
        'cirq': circuit_to_cirq_code
    }
    
    converter = converters.get(backend.lower())
    if not converter:
        raise ValueError(f"Unsupported backend: {backend}")
        
    return converter(circuit_data)
