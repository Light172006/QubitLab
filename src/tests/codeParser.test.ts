import { describe, it, expect } from 'vitest';
import { parseCode, toCode } from '../mock/codeParser';

describe('E3 unsupported syntax is an error, never silent', () => {
  it('accepts the canonical Qiskit import (round-trip)', () => {
    const r = parseCode(
      'from qiskit import QuantumCircuit\nqc = QuantumCircuit(2)\nqc.h(0)'
    );
    expect('circuit' in r).toBe(true);
  });

  it('rejects other imports with a 1-based line number', () => {
    const r = parseCode('import math\nqc = QuantumCircuit(2)');
    if ('circuit' in r) throw new Error('expected errors');
    expect(r.errors[0].line).toBe(1);
    expect(r.errors[0].message).toMatch(/import/i);
  });

  it('rejects from-imports other than the canonical one', () => {
    const r = parseCode(
      'from qiskit import QuantumCircuit, Aer\nqc = QuantumCircuit(2)'
    );
    if ('circuit' in r) throw new Error('expected errors');
    expect(r.errors[0].line).toBe(1);
  });

  it('rejects loops', () => {
    const r = parseCode(
      'qc = QuantumCircuit(2)\nfor i in range(2):\n    qc.h(i)'
    );
    if ('circuit' in r) throw new Error('expected errors');
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('rejects unsupported method calls', () => {
    const r = parseCode('qc = QuantumCircuit(2)\nqc.draw()');
    if ('circuit' in r) throw new Error('expected errors');
    expect(r.errors[0].message).toMatch(/Unsupported gate method: draw/);
  });
});

describe('E3 qubit indices are validated', () => {
  it('rejects an out-of-range qubit index', () => {
    const r = parseCode('qc = QuantumCircuit(2)\nqc.h(5)');
    if ('circuit' in r) throw new Error('expected errors');
    expect(r.errors[0].line).toBe(2);
    expect(r.errors[0].message).toMatch(/h/i);
  });

  it('rejects a negative qubit index', () => {
    const r = parseCode('qc = QuantumCircuit(2)\nqc.x(-1)');
    if ('circuit' in r) throw new Error('expected errors');
    expect(r.errors[0].line).toBe(2);
  });

  it('rejects non-integer arguments', () => {
    const r = parseCode('qc = QuantumCircuit(2)\nqc.h(i)');
    if ('circuit' in r) throw new Error('expected errors');
    expect(r.errors[0].line).toBe(2);
  });

  it('rejects out-of-range CNOT control and target', () => {
    const r = parseCode('qc = QuantumCircuit(2)\nqc.cx(0, 7)');
    if ('circuit' in r) throw new Error('expected errors');
    expect(r.errors[0].line).toBe(2);
  });

  it('rejects a measure clbit outside the register', () => {
    const r = parseCode('qc = QuantumCircuit(2)\nqc.measure(0, 5)');
    if ('circuit' in r) throw new Error('expected errors');
    expect(r.errors[0].line).toBe(2);
  });

  it('accepts indices inside the register', () => {
    const r = parseCode(
      'qc = QuantumCircuit(3)\nqc.h(2)\nqc.cx(0, 2)\nqc.measure(2, 2)'
    );
    if ('errors' in r) throw new Error('expected a circuit');
    expect(r.circuit.gates).toHaveLength(3);
  });
});

describe('E2 toCode output', () => {
  it('appends the # Try hint for an empty circuit', () => {
    const code = toCode({ version: 1, num_qubits: 2, gates: [] });
    expect(code).toContain('# Try: qc.h(0)');
  });

  it('does not append the hint when gates exist', () => {
    const code = toCode({
      version: 1,
      num_qubits: 2,
      gates: [{ id: 'g1', type: 'H', targets: [0], controls: [], column: 0 }],
    });
    expect(code).not.toContain('# Try:');
  });
});
