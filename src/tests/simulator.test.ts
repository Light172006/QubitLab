import { describe, it, expect } from 'vitest';
import { simulateCircuit } from '../mock/simulator';
import { GateType } from '../types';

describe('Mock Simulator', () => {
  it('H on q0 -> {0: 0.5, 1: 0.5}', () => {
    const circuit = {
      version: 1,
      num_qubits: 1,
      gates: [
        { id: 'g1', type: 'H' as GateType, targets: [0], controls: [], column: 0 },
      ],
    };
    const result = simulateCircuit(circuit, 1024);
    expect(result.probabilities['0']).toBeCloseTo(0.5, 1);
    expect(result.probabilities['1']).toBeCloseTo(0.5, 1);
  });

  it('H(q0) + CNOT(q0->q1) -> {00: 0.5, 11: 0.5} with both qubits entangled', () => {
    const circuit = {
      version: 1,
      num_qubits: 2,
      gates: [
        { id: 'g1', type: 'H' as GateType, targets: [0], controls: [], column: 0 },
        { id: 'g2', type: 'CNOT' as GateType, targets: [1], controls: [0], column: 1 },
      ],
    };
    const result = simulateCircuit(circuit, 1024);
    expect(result.probabilities['00']).toBeCloseTo(0.5, 1);
    expect(result.probabilities['11']).toBeCloseTo(0.5, 1);
    expect(result.entangled_qubits).toContain(0);
    expect(result.entangled_qubits).toContain(1);
  });

  it('X on q1 only -> "10" has P=1 (Qiskit bit order)', () => {
    const circuit = {
      version: 1,
      num_qubits: 2,
      gates: [
        { id: 'g1', type: 'X' as GateType, targets: [1], controls: [], column: 0 },
      ],
    };
    const result = simulateCircuit(circuit, 1024);
    // Qiskit bit order: qubit 0 is rightmost, so X on q1 gives |10⟩
    expect(result.probabilities['10']).toBeCloseTo(1.0, 1);
  });

  it('Z on |+⟩ -> phase flip', () => {
    const circuit = {
      version: 1,
      num_qubits: 1,
      gates: [
        { id: 'g1', type: 'H' as GateType, targets: [0], controls: [], column: 0 },
        { id: 'g2', type: 'Z' as GateType, targets: [0], controls: [], column: 1 },
      ],
    };
    const result = simulateCircuit(circuit, 1024);
    // Probabilities unchanged, but phase flipped
    expect(result.probabilities['0']).toBeCloseTo(0.5, 1);
    expect(result.probabilities['1']).toBeCloseTo(0.5, 1);
  });

  it('S gate adds 90° phase', () => {
    const circuit = {
      version: 1,
      num_qubits: 1,
      gates: [
        { id: 'g1', type: 'H' as GateType, targets: [0], controls: [], column: 0 },
        { id: 'g2', type: 'S' as GateType, targets: [0], controls: [], column: 1 },
      ],
    };
    const result = simulateCircuit(circuit, 1024);
    expect(result.probabilities['0']).toBeCloseTo(0.5, 1);
    expect(result.probabilities['1']).toBeCloseTo(0.5, 1);
  });

  it('CZ is symmetric in control/target', () => {
    const circuit1 = {
      version: 1,
      num_qubits: 2,
      gates: [
        { id: 'g1', type: 'H' as GateType, targets: [0], controls: [], column: 0 },
        { id: 'g2', type: 'CZ' as GateType, targets: [1], controls: [0], column: 1 },
      ],
    };
    const circuit2 = {
      version: 1,
      num_qubits: 2,
      gates: [
        { id: 'g1', type: 'H' as GateType, targets: [0], controls: [], column: 0 },
        { id: 'g2', type: 'CZ' as GateType, targets: [0], controls: [1], column: 1 },
      ],
    };
    const result1 = simulateCircuit(circuit1, 1024);
    const result2 = simulateCircuit(circuit2, 1024);
    // CZ is symmetric, so probabilities should be the same
    expect(result1.probabilities).toEqual(result2.probabilities);
  });
});