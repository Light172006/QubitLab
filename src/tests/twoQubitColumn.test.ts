import { describe, it, expect } from 'vitest';
import {
  canPlaceTwoQubit,
  completeTwoQubitPlacement,
  rejectReasonForCell,
  isLockedByMeasure,
} from '../components/canvas/CircuitCanvas';
import type { Circuit, Gate } from '../types';

const gate = (
  id: string,
  type: Gate['type'],
  targets: number[],
  controls: number[] = [],
  column = 0
): Gate => ({ id, type, targets, controls, column });

const circ = (gates: Gate[], numQubits = 3): Circuit => ({ version: 1, num_qubits: numQubits, gates });

/** CNOT dropped on q0 at column 1, waiting for its target wire. */
const pending = { gate: gate('cnot', 'CNOT', [0], [], 1), control: 0 };

describe('B04 a two-qubit gate can never land in a different column', () => {
  it('refuses a target clicked in another column', () => {
    const circuit = circ([]);
    const result = completeTwoQubitPlacement(circuit, pending, 1, 3);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/column t=1/);
  });

  it('leaves the circuit untouched when the click is refused', () => {
    const circuit = circ([gate('a', 'H', [0], [], 0)]);
    const result = completeTwoQubitPlacement(circuit, pending, 1, 3);
    expect(result).toEqual({ ok: false, reason: expect.any(String) });
  });

  it('accepts a target in the control column', () => {
    const circuit = circ([]);
    const result = completeTwoQubitPlacement(circuit, pending, 1, 1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const cnot = result.circuit.gates[0];
      expect(cnot.controls).toEqual([0]);
      expect(cnot.targets).toEqual([1]);
      expect(cnot.column).toBe(1);
    }
  });

  it('refuses when the control column is occupied on the target wire', () => {
    // The original bug: q0 and q1 are both busy at column 1, and the check ran
    // against column 3, so the CNOT was committed on top of two existing gates.
    const circuit = circ([gate('a', 'H', [0], [], 1), gate('b', 'X', [1], [], 1)]);
    expect(canPlaceTwoQubit(circuit, 0, 1, 3)).toBe(true); // what the old code asked
    const result = completeTwoQubitPlacement(circuit, pending, 1, 1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/already occupied/);
    // And no two gates share a qubit in one column afterwards.
    for (const gate of circuit.gates) {
      const sharing = circuit.gates.filter(
        (other) =>
          other !== gate &&
          other.column === gate.column &&
          (other.targets.some((t) => gate.targets.includes(t)) ||
            other.controls.some((c) => gate.targets.includes(c)) ||
            other.controls.some((c) => gate.controls.includes(c)))
      );
      expect(sharing).toHaveLength(0);
    }
  });

  it('refuses the control wire as its own target', () => {
    const result = completeTwoQubitPlacement(circ([]), pending, 0, 1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/already the control/);
  });

  it('refuses when a measurement sits between the control and the target', () => {
    // Measure on q1 at column 0 makes column 1 terminal on that wire.
    const circuit = circ([gate('m', 'MEASURE', [1], [], 0)]);
    const result = completeTwoQubitPlacement(circuit, pending, 1, 1);
    expect(result.ok).toBe(false);
  });

  it('works for CZ as well as CNOT', () => {
    const placement = { gate: gate('cz', 'CZ', [0], [], 2), control: 0 };
    const result = completeTwoQubitPlacement(circ([]), placement, 2, 2);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.circuit.gates[0].type).toBe('CZ');
  });
});

describe('B13 an invalid drop explains itself', () => {
  it('names the measurement that blocks a cell', () => {
    const circuit = circ([gate('m', 'MEASURE', [0], [], 2)]);
    expect(rejectReasonForCell(circuit, 0, 2)).toMatch(/measurement/);
    expect(rejectReasonForCell(circuit, 0, 3)).toMatch(/measurement/);
    // Before the measurement the wire is still open.
    expect(rejectReasonForCell(circuit, 0, 1)).toBeNull();
    // The other wire is unaffected.
    expect(rejectReasonForCell(circuit, 1, 3)).toBeNull();
  });

  it('names the gate that already occupies a cell', () => {
    const circuit = circ([gate('h', 'H', [1], [], 4)]);
    expect(rejectReasonForCell(circuit, 1, 4)).toMatch(/already holds a gate/);
    expect(rejectReasonForCell(circuit, 1, 5)).toBeNull();
  });

  it('allows an empty, unlocked cell', () => {
    expect(rejectReasonForCell(circ([]), 1, 3)).toBeNull();
  });

  it('agrees with isLockedByMeasure', () => {
    const circuit = circ([gate('m', 'MEASURE', [0], [], 2)]);
    expect(isLockedByMeasure(circuit, 0, 2)).toBe(true);
    expect(rejectReasonForCell(circuit, 0, 2)).not.toBeNull();
  });
});