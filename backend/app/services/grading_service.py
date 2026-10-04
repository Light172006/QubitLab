from app.models.challenge import Challenge
from app.schemas.circuit import CircuitDataSchema
from app.services.simulation.manager import simulation_manager

async def grade(circuit_data_dict: dict, validation_rules: dict, challenge: Challenge) -> tuple[int, bool, str]:
    """
    Returns (score, passed, feedback)
    """
    try:
        circuit_data = CircuitDataSchema(**circuit_data_dict)
    except Exception as e:
        return 0, False, f"Invalid circuit data format: {e}"
        
    feedback = []
    rules_passed = 0
    total_rules = 0
    
    # Check required gates
    if "required_gates" in validation_rules:
        total_rules += 1
        required = set(validation_rules["required_gates"])
        used = set(g.type.upper() for g in circuit_data.gates)
        missing = required - used
        if not missing:
            rules_passed += 1
            feedback.append("✅ Required gates used.")
        else:
            feedback.append(f"❌ Missing required gates: {', '.join(missing)}")
            
    # Check forbidden gates
    if "forbidden_gates" in validation_rules:
        total_rules += 1
        forbidden = set(validation_rules["forbidden_gates"])
        used = set(g.type.upper() for g in circuit_data.gates)
        invalid = forbidden & used
        if not invalid:
            rules_passed += 1
            feedback.append("✅ No forbidden gates used.")
        else:
            feedback.append(f"❌ Used forbidden gates: {', '.join(invalid)}")
            
    # Check max gates
    if "max_gates" in validation_rules:
        total_rules += 1
        max_gates = validation_rules["max_gates"]
        num_gates = len(circuit_data.gates)
        if num_gates <= max_gates:
            rules_passed += 1
            feedback.append(f"✅ Used {num_gates}/{max_gates} gates.")
        else:
            feedback.append(f"❌ Too many gates used: {num_gates} (max {max_gates}).")
            
    # Check expected output via simulation
    if "expected_output" in validation_rules:
        total_rules += 1
        expected = validation_rules["expected_output"]
        
        try:
            backend = simulation_manager.get_backend("qiskit")
            result = await backend.run_circuit(circuit_data, shots=1000)
            
            # Simple check: the most frequent state should match expected if expected is a single string
            if isinstance(expected, str):
                if not result.counts:
                    feedback.append("❌ Simulation yielded no counts.")
                else:
                    most_frequent = max(result.counts.items(), key=lambda x: x[1])[0]
                    if most_frequent == expected:
                        rules_passed += 1
                        feedback.append(f"✅ Circuit produced expected output: {expected}")
                    else:
                        feedback.append(f"❌ Circuit produced {most_frequent}, expected {expected}")
            # If dict mapping state to probability
            elif isinstance(expected, dict):
                tolerance = validation_rules.get("tolerance", 0.1)
                all_match = True
                
                # Compare expected probabilities
                total_shots = sum(result.counts.values()) if result.counts else 1
                for state, exp_prob in expected.items():
                    actual_prob = result.counts.get(state, 0) / total_shots
                    if abs(actual_prob - exp_prob) > tolerance:
                        all_match = False
                        feedback.append(f"❌ State {state} probability {actual_prob:.2f} differs from expected {exp_prob:.2f} (tol {tolerance}).")
                        break
                        
                if all_match:
                    rules_passed += 1
                    feedback.append("✅ Circuit produced expected probability distribution.")
        except Exception as e:
            feedback.append(f"❌ Simulation failed: {e}")
            
    if total_rules == 0:
        return challenge.points, True, "✅ No validation rules specified, full points awarded."
        
    pass_ratio = rules_passed / total_rules
    score = int(challenge.points * pass_ratio)
    passed = rules_passed == total_rules
    
    return score, passed, "\n".join(feedback)
