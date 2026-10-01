import { describe, it, expect } from 'vitest';
import { simulateCircuit } from '../mock/simulator';
import type { Circuit, GateType } from '../types';

const gate = (type: GateType, targets: number[], controls: number[] = [], column = 0) => ({
  id: `${type}-${targets.join('')}-${controls.join('')}-${column}`,
  type,
  targets,
  controls,
  column,
});

const circ = (num_qubits: number, gates: ReturnType<typeof gate>[]): Circuit => ({
  version: 1,
  num_qubits,
  gates,
});

const probs = (c: Circuit) => simulateCircuit(c, 1024).probabilities;

describe('B1 two-qubit gates must work for any register size', () => {
  it('Bell state on 2 qubits is unchanged', () => {
    expect(probs(circ(2, [gate('H', [0], [], 0), gate('CNOT', [1], [0], 1)]))).toEqual({
      '00': expect.closeTo(0.5, 6),
      '11': expect.closeTo(0.5, 6),
    });
  });

  it('GHZ on 3 qubits -> 000 and 111 at 50%', () => {
    const c = circ(3, [
      gate('H', [0], [], 0),
      gate('CNOT', [1], [0], 1),
      gate('CNOT', [2], [1], 2),
    ]);
    const r = simulateCircuit(c, 1024);
    console.log('B1 GHZ probabilities', JSON.stringify(r.probabilities));
    expect(r.probabilities['000']).toBeCloseTo(0.5, 6);
    expect(r.probabilities['111']).toBeCloseTo(0.5, 6);
    expect(Object.keys(r.probabilities).sort()).toEqual(['000', '111']);
  });

  it('GHZ on 3 qubits entangles every qubit', () => {
    const c = circ(3, [
      gate('H', [0], [], 0),
      gate('CNOT', [1], [0], 1),
      gate('CNOT', [2], [1], 2),
    ]);
    const r = simulateCircuit(c, 1024);
    console.log('B1 GHZ entangled', JSON.stringify(r.entangled_qubits), 'bloch', JSON.stringify(r.bloch));
    expect(r.entangled_qubits).toEqual([0, 1, 2]);
    r.bloch.forEach((b) => {
      expect(Math.hypot(b.x, b.y, b.z)).toBeCloseTo(0, 6);
    });
  });

  it('CNOT on 3 qubits with a non-adjacent control wire', () => {
    // X(q2), H(q0), then CNOT with control q2 -> target q0: |100> + |101>
    const c = circ(3, [
      gate('X', [2], [], 0),
      gate('H', [0], [], 1),
      gate('CNOT', [0], [2], 2),
    ]);
    const r = simulateCircuit(c, 1024);
    console.log('B1 CNOT(control q2 -> target q0)', JSON.stringify(r.probabilities));
    expect(r.probabilities['100']).toBeCloseTo(0.5, 6);
    expect(r.probabilities['101']).toBeCloseTo(0.5, 6);
    expect(Object.keys(r.probabilities).sort()).toEqual(['100', '101']);
  });

  it('CNOT does nothing when the control wire is |0>', () => {
    const c = circ(3, [gate('H', [0], [], 0), gate('CNOT', [0], [2], 1)]);
    const r = simulateCircuit(c, 1024);
    console.log('B1 CNOT with control q2 in |0>', JSON.stringify(r.probabilities));
    expect(Object.keys(r.probabilities).sort()).toEqual(['000', '001']);
  });

  it('CNOT on 4 qubits: only the target flips', () => {
    // X(q1), H(q0), CNOT(control q0 -> target q1) on a 4-qubit register.
    // q1=1, q0=|+>: the |0011> branch has q0=1, so q1 flips back to 0.
    const c = circ(4, [
      gate('X', [1], [], 0),
      gate('H', [0], [], 1),
      gate('CNOT', [1], [0], 2),
    ]);
    const r = simulateCircuit(c, 1024);
    console.log('B1 4-qubit CNOT', JSON.stringify(r.probabilities));
    expect(r.probabilities['0010']).toBeCloseTo(0.5, 6);
    expect(r.probabilities['0001']).toBeCloseTo(0.5, 6);
    expect(Object.keys(r.probabilities).sort()).toEqual(['0001', '0010']);
  });

  it('CZ applies a phase on 3 qubits without changing probabilities', () => {
    const c = circ(3, [
      gate('H', [0], [], 0),
      gate('H', [1], [], 1),
      gate('CZ', [2], [1], 2),
    ]);
    const r = simulateCircuit(c, 1024);
    console.log('B1 CZ on 3 qubits', JSON.stringify(r.probabilities));
    // q2 is |0>, so CZ does nothing to the probabilities
    expect(r.probabilities['000']).toBeCloseTo(0.25, 6);
    expect(r.probabilities['010']).toBeCloseTo(0.25, 6);
  });

  it('CZ actually phases |11> on 3 qubits (amplitudes)', () => {
    const c = circ(3, [
      gate('X', [2], [], 0),
      gate('X', [1], [], 1),
      gate('H', [0], [], 2),
      gate('CZ', [0], [1], 3),
    ]);
    const r = simulateCircuit(c, 1024);
    // q2 = q1 = |1>, so CZ(control q0, target q1) phases the q0=|1> branch
    console.log('B1 CZ amplitudes', JSON.stringify(r.amplitudes));
    const states = Object.keys(r.amplitudes).sort();
    expect(states).toEqual(['110', '111']);
    expect(r.amplitudes['110'].re).toBeCloseTo(Math.SQRT1_2, 6);
    const im = r.amplitudes['111'].re;
    console.log('B1 CZ phase on |111> =', im.toFixed(6));
    expect(Math.abs(im)).toBeCloseTo(Math.SQRT1_2, 6);
    expect(im).toBeCloseTo(-Math.SQRT1_2, 6);
  });

  it('rejects a degenerate control == target as a no-op', () => {
    const c = circ(2, [gate('H', [0], [], 0), gate('CNOT', [0], [0], 1)]);
    const r = simulateCircuit(c, 1024);
    console.log('B1 CNOT with control==target', JSON.stringify(r.probabilities));
    expect(r.probabilities['00']).toBeCloseTo(0.5, 6);
    expect(r.probabilities['01']).toBeCloseTo(0.5, 6);
  });

  it('keeps single-qubit gates working on 3 qubits', () => {
    const c = circ(3, [gate('X', [2])]);
    const r = simulateCircuit(c, 1024);
    console.log('B1 X on q2 of 3', JSON.stringify(r.probabilities));
    expect(Object.keys(r.probabilities)).toEqual(['100']);
  });
});

describe('B12 simulator-side facts grounding', () => {
  it('reports real controls and targets for the two-qubit action', () => {
    const c = circ(2, [gate('H', [0], [], 0), gate('CNOT', [1], [0], 1)]);
    const { facts } = simulateCircuit(c, 1024);
    console.log('B12 action', JSON.stringify(facts.action));
    expect(facts.action.type).toBe('add_gate');
    expect(facts.action.gate).toBe('CNOT');
    expect(facts.action.controls).toEqual([0]);
    expect(facts.action.targets).toEqual([1]);
  });

  it('does not fabricate previous probabilities', () => {
    const c = circ(2, [gate('H', [0], [], 0)]);
    const { facts } = simulateCircuit(c, 1024);
    console.log('B12 prev_probabilities', JSON.stringify(facts.prev_probabilities));
    // The simulator has no previous state; inventing one would make the tutor lie.
    expect(facts.prev_probabilities).toEqual({});
  });

  it('does not fabricate changed states', () => {
    const c = circ(2, [gate('H', [0], [], 0)]);
    const { facts, diff } = simulateCircuit(c, 1024);
    console.log('B12 changed_states', JSON.stringify(facts.changed_states), 'diff', JSON.stringify(diff));
    expect(facts.changed_states).toEqual([]);
    expect(diff.changed).toEqual([]);
  });

  it('has no action gate for an empty circuit', () => {
    const { facts } = simulateCircuit(circ(2, []), 1024);
    console.log('B12 empty action', JSON.stringify(facts.action));
    expect(facts.action.gate).toBeUndefined();
  });
});
