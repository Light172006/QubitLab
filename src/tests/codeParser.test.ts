import { describe, it, expect } from 'vitest';
import { parseCode, toCode } from '../mock/codeParser';
import { GateType } from '../types';

describe('Code Parser', () => {
  it('parses simple H gate', () => {
    const code = `
from qiskit import QuantumCircuit
qc = QuantumCircuit(2, 2)
qc.h(0)
`;
    const result = parseCode(code);
    expect('circuit' in result).toBe(true);
    if ('circuit' in result) {
      expect(result.circuit.num_qubits).toBe(2);
      expect(result.circuit.gates).toHaveLength(1);
      expect(result.circuit.gates[0].type).toBe('H');
      expect(result.circuit.gates[0].targets).toEqual([0]);
    }
  });

  it('parses H + CNOT', () => {
    const code = `
from qiskit import QuantumCircuit
qc = QuantumCircuit(2, 2)
qc.h(0)
qc.cx(0, 1)
`;
    const result = parseCode(code);
    expect('circuit' in result).toBe(true);
    if ('circuit' in result) {
      expect(result.circuit.gates).toHaveLength(2);
      expect(result.circuit.gates[0].type).toBe('H');
      expect(result.circuit.gates[1].type).toBe('CNOT');
      expect(result.circuit.gates[1].controls).toEqual([0]);
      expect(result.circuit.gates[1].targets).toEqual([1]);
    }
  });

  it('parses measure', () => {
    const code = `
from qiskit import QuantumCircuit
qc = QuantumCircuit(2, 2)
qc.h(0)
qc.measure(0, 0)
`;
    const result = parseCode(code);
    expect('circuit' in result).toBe(true);
    if ('circuit' in result) {
      const measureGate = result.circuit.gates.find(g => g.type === 'MEASURE');
      expect(measureGate).toBeDefined();
      expect(measureGate?.targets).toEqual([0]);
    }
  });

  it('reports error for unsupported gate', () => {
    const code = `
from qiskit import QuantumCircuit
qc = QuantumCircuit(2, 2)
qc.rx(0.5, 0)
`;
    const result = parseCode(code);
    expect('errors' in result).toBe(true);
    if ('errors' in result) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Unsupported');
    }
  });

  it('reports error for CNOT with wrong args', () => {
    const code = `
from qiskit import QuantumCircuit
qc = QuantumCircuit(2, 2)
qc.cx(0)
`;
    const result = parseCode(code);
    expect('errors' in result).toBe(true);
    if ('errors' in result) {
      expect(result.errors[0].message).toContain('two qubit arguments');
    }
  });

  it('toCode generates correct Qiskit code', () => {
    const circuit = {
      version: 1,
      num_qubits: 2,
      gates: [
        { id: 'g1', type: 'H' as GateType, targets: [0], controls: [], column: 0 },
        { id: 'g2', type: 'CNOT' as GateType, targets: [1], controls: [0], column: 1 },
        { id: 'g3', type: 'MEASURE' as GateType, targets: [0], controls: [], column: 2 },
        { id: 'g4', type: 'MEASURE' as GateType, targets: [1], controls: [], column: 2 },
      ],
    };
    const code = toCode(circuit);
    expect(code).toContain('qc.h(0)');
    expect(code).toContain('qc.cx(0, 1)');
    expect(code).toContain('qc.measure(0, 0)');
    expect(code).toContain('qc.measure(1, 1)');
  });
});