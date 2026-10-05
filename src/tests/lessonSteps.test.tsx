import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { LessonPlayer, marginalProbabilities, stepCheckPassed } from '../components/lessons/LessonPlayer';
import { useLessonStore } from '../store';
import { getLessons } from '../mock/content';
import type { FactsPacket } from '../types';

/** H on q0 of a 2-qubit circuit: q0 is in superposition, q1 stays |0⟩. */
const hOnQ0: FactsPacket = {
  action: { type: 'add_gate' as const, gate: 'H' as const, targets: [0], controls: [] },
  num_qubits: 2,
  probabilities: { '00': 0.5, '01': 0.5 },
  prev_probabilities: {},
  amplitudes: { '00': { re: 0.7071, im: 0 }, '01': { re: 0.7071, im: 0 } },
  bloch: [
    { q: 0, x: 1, y: 0, z: 0, purity: 1 },
    { q: 1, x: 0, y: 0, z: 1, purity: 1 },
  ],
  entangled_qubits: [],
  changed_states: ['01'],
  level: 'beginner',
};

/** Bell state: H on q0 then CNOT(0->1). */
const bell: FactsPacket = {
  action: { type: 'add_gate' as const, gate: 'CNOT' as const, targets: [1], controls: [0] },
  num_qubits: 2,
  probabilities: { '00': 0.5, '11': 0.5 },
  prev_probabilities: {},
  amplitudes: { '00': { re: 0.7071, im: 0 }, '11': { re: 0.7071, im: 0 } },
  bloch: [
    { q: 0, x: 0, y: 0, z: 0, purity: 0.5 },
    { q: 1, x: 0, y: 0, z: 0, purity: 0.5 },
  ],
  entangled_qubits: [0, 1],
  changed_states: ['11'],
  level: 'beginner',
};

/** Untouched |00⟩. */
const empty: FactsPacket = {
  action: { type: 'reset' as const },
  num_qubits: 2,
  probabilities: { '00': 1 },
  prev_probabilities: {},
  amplitudes: { '00': { re: 1, im: 0 } },
  bloch: [
    { q: 0, x: 0, y: 0, z: 1, purity: 1 },
    { q: 1, x: 0, y: 0, z: 1, purity: 1 },
  ],
  entangled_qubits: [],
  changed_states: [],
  level: 'beginner',
};

const lessons = getLessons();
const superposition = lessons.find((l) => l.id === 'L1')!;
const entanglement = lessons.find((l) => l.id === 'L2')!;

beforeEach(() => {
  useLessonStore.setState({
    currentLesson: null,
    currentStepIndex: 0,
    completedSteps: new Set(),
  });
});

describe('marginalProbabilities', () => {
  it('marginalizes a qubit in Qiskit order (q0 is right-most)', () => {
    const marginal = marginalProbabilities(hOnQ0, 0);
    expect(marginal['0']).toBeCloseTo(0.5, 5);
    expect(marginal['1']).toBeCloseTo(0.5, 5);
  });

  it('leaves an untouched qubit at |0⟩', () => {
    const marginal = marginalProbabilities(hOnQ0, 1);
    expect(marginal['0']).toBeCloseTo(1, 5);
    expect(marginal['1']).toBeCloseTo(0, 5);
  });
});

describe('stepCheckPassed', () => {
  it('detects H on qubit 0 (L1S1)', () => {
    expect(stepCheckPassed(superposition.steps[0], hOnQ0)).toBe(true);
    expect(stepCheckPassed(superposition.steps[0], empty)).toBe(false);
  });

  it('detects the full four-way distribution (L1S4)', () => {
    const twoH: FactsPacket = {
      ...hOnQ0,
      probabilities: { '00': 0.25, '01': 0.25, '10': 0.25, '11': 0.25 },
    };
    expect(stepCheckPassed(superposition.steps[3], twoH)).toBe(true);
    expect(stepCheckPassed(superposition.steps[3], hOnQ0)).toBe(false);
  });

  it('detects entanglement (L2S2)', () => {
    expect(stepCheckPassed(entanglement.steps[1], bell)).toBe(true);
    expect(stepCheckPassed(entanglement.steps[1], hOnQ0)).toBe(false);
  });

  it('detects the Bell correlation after measurement (L2S3)', () => {
    expect(stepCheckPassed(entanglement.steps[2], bell)).toBe(true);
  });
});

describe('G1 manual completion is a two-hint fallback', () => {
  function renderStep() {
    const onStepComplete = vi.fn();
    useLessonStore.setState({
      currentLesson: superposition,
      currentStepIndex: 0,
      completedSteps: new Set(),
    });
    render(
      <LessonPlayer
        lesson={superposition}
        currentStepIndex={0}
        onStepChange={() => {}}
        onStepComplete={onStepComplete}
        circuit={{ version: 1, num_qubits: 2, gates: [] }}
        facts={empty}
      />
    );
    return onStepComplete;
  }

  it('hides Mark Complete until two hints are used', () => {
    renderStep();
    expect(screen.queryByText('Mark Complete')).toBeNull();
    expect(screen.getByText('Get a hint')).toBeTruthy();
  });

  it('reveals hints one at a time', () => {
    renderStep();
    fireEvent.click(screen.getByText('Get a hint'));
    expect(screen.getByText(/Watch the Live State panel/)).toBeTruthy();
    expect(screen.queryByText('Mark Complete')).toBeNull();

    fireEvent.click(screen.getByText('Hint 2'));
    expect(screen.getByText(/completes automatically/)).toBeTruthy();
    expect(screen.getByText('Mark Complete')).toBeTruthy();
  });

  it('marks the step complete from the fallback button', () => {
    const onStepComplete = renderStep();
    fireEvent.click(screen.getByText('Get a hint'));
    fireEvent.click(screen.getByText('Hint 2'));
    fireEvent.click(screen.getByText('Mark Complete'));
    expect(onStepComplete).toHaveBeenCalledWith('L1S1');
  });

  it('stops offering hints after two', () => {
    renderStep();
    fireEvent.click(screen.getByText('Get a hint'));
    fireEvent.click(screen.getByText('Hint 2'));
    expect(screen.getByText('No more hints')).toBeTruthy();
  });
});

describe('LessonPlayer auto-detection', () => {
  it('completes the current step the moment the circuit satisfies it', () => {
    const onStepComplete = vi.fn();
    useLessonStore.setState({
      currentLesson: superposition,
      currentStepIndex: 0,
      completedSteps: new Set(),
    });

    render(
      <LessonPlayer
        lesson={superposition}
        currentStepIndex={0}
        onStepChange={() => {}}
        onStepComplete={onStepComplete}
        circuit={{ version: 1, num_qubits: 2, gates: [] }}
        facts={hOnQ0}
      />
    );

    expect(onStepComplete).toHaveBeenCalledWith('L1S1');
    expect(screen.getByText('Detected in your circuit')).toBeTruthy();
  });

  it('does not complete a step the circuit does not satisfy', () => {
    const onStepComplete = vi.fn();
    render(
      <LessonPlayer
        lesson={superposition}
        currentStepIndex={0}
        onStepChange={() => {}}
        onStepComplete={onStepComplete}
        circuit={{ version: 1, num_qubits: 2, gates: [] }}
        facts={empty}
      />
    );

    expect(onStepComplete).not.toHaveBeenCalled();
    expect(screen.getByText('Build the circuit to complete this step')).toBeTruthy();
  });

  it('counts completed steps from the store, not the current index', () => {
    useLessonStore.setState({
      currentLesson: superposition,
      // Two steps behind us, both completed in the store.
      currentStepIndex: 2,
      completedSteps: new Set(['L1S1', 'L1S2']),
    });

    render(
      <LessonPlayer
        lesson={superposition}
        currentStepIndex={2}
        onStepChange={() => {}}
        onStepComplete={() => {}}
        circuit={{ version: 1, num_qubits: 2, gates: [] }}
        facts={empty}
      />
    );

    expect(screen.getByText('2 / 4 steps')).toBeTruthy();
    expect(screen.getByText('Completed Steps (2)')).toBeTruthy();
  });
});
