def validate_circuit(circuit_data: dict) -> tuple[bool, list[str]]:
    """Validate circuit data. Returns (is_valid, error_messages)."""
    errors = []
    
    n_qubits = circuit_data.get('nQubits', 0)
    if not isinstance(n_qubits, int) or n_qubits < 1 or n_qubits > 30:
        errors.append("Invalid number of qubits.")
        
    gates = circuit_data.get('gates', [])
    if not isinstance(gates, list):
        errors.append("Gates must be a list.")
        return False, errors
        
    occupied_positions = set()
    
    for i, gate in enumerate(gates):
        qubits = gate.get('qubits', [])
        column = gate.get('column', -1)
        gate_type = gate.get('type')
        
        if not gate_type:
            errors.append(f"Gate at index {i} missing type.")
            
        for q in qubits:
            if not isinstance(q, int) or q < 0 or q >= n_qubits:
                errors.append(f"Gate {gate_type} at index {i} references invalid qubit {q}.")
                
            pos = (column, q)
            if pos in occupied_positions:
                errors.append(f"Overlapping gates at column {column}, qubit {q}.")
            occupied_positions.add(pos)
            
        if len(qubits) != len(set(qubits)):
            errors.append(f"Gate {gate_type} at index {i} references duplicate qubits.")
            
    return len(errors) == 0, errors

def normalize_circuit(circuit_data: dict) -> dict:
    """Normalize circuit data (sort gates by column, assign IDs if missing)."""
    import uuid
    
    normalized = circuit_data.copy()
    gates = normalized.get('gates', []).copy()
    
    for gate in gates:
        if 'id' not in gate:
            gate['id'] = str(uuid.uuid4())
            
    normalized['gates'] = sorted(gates, key=lambda g: g.get('column', 0))
    return normalized
