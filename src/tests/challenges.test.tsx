import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { checkChallenge, getChallenges, checkLessonStep } from '../mock/content';
import { ChallengePanel, type ChallengePanelProps } from '../components/lessons/ChallengePanel';
import { Circuit, Gate, GateType } from '../types';

const gate = (
  type: GateType,
  targets: number[],
  controls: number[] = [],
  column = 0
): Gate => ({ id: `g${Math.random()}`, type, targets, controls, column });

const circ = (gates: Gate[], numQubits = 2): Circuit => ({
  version: 1,
  num_qubits: numQubits,
  gates,
});

describe('G3 challenge scoring', () => {
  it('scores a minimal solution without hints at 100', () => {
    const r = checkChallenge('CH1', circ([gate('X', [0], [], 0)]), 0);
    expect(r.passed).toBe(true);
    expect(r.score).toBe(100);
  });

  it('subtracts 10 per hint', () => {
    const r = checkChallenge('CH1', circ([gate('X', [0], [], 0)]), 1);
    expect(r.score).toBe(90);
    const r2 = checkChallenge('CH1', circ([gate('X', [0], [], 0)]), 3);
    expect(r2.score).toBe(70);
  });

  it('subtracts 5 per extra gate', () => {
    // H + X: two gates, minimal solution is one.
    const r = checkChallenge('CH1', circ([gate('H', [0], [], 0), gate('X', [0], [], 1)]), 0);
    expect(r.score).toBe(95);
  });

  it('floors the score at 10', () => {
    const r = checkChallenge('CH1', circ([gate('X', [0], [], 0)]), 20);
    expect(r.score).toBe(10);
  });
});

describe('G3 failure messages name the states', () => {
  it('reports per-state probabilities for the Bell challenge', () => {
    // H on q0 only: P(00)=0.5, P(11)=0.
    const r = checkChallenge('CH3', circ([gate('H', [0], [], 0)]), 0);
    expect(r.passed).toBe(false);
    expect(r.message).toMatch(/P\(00\) is 50%; target is 50%/);
    expect(r.message).toMatch(/P\(11\) is 0%; target is 50%/);
  });

  it('reports the |1⟩ probability for the |1⟩ challenge', () => {
    const r = checkChallenge('CH1', circ([gate('H', [0], [], 0)]), 0);
    expect(r.passed).toBe(false);
    expect(r.message).toMatch(/P\(1\) is 50%; target is 100%/);
  });

  it('does not let the Bell state satisfy the |+⟩ challenge', () => {
    // The old 1 - |p0-0.5| - |p1-0.5| metric scored P(00)=P(11)=0.5 as a pass.
    const bell = circ([gate('H', [0], [], 0), gate('CNOT', [1], [0], 1)]);
    const r = checkChallenge('CH2', bell, 0);
    expect(r.passed).toBe(false);
    expect(r.fidelity).toBeCloseTo(0.25, 6);
  });

  it('rejects a wider register that spreads |+⟩ across another qubit', () => {
    // |+> on q0 with q1 also in superposition is not the target state.
    const both = circ([gate('H', [0], [], 0), gate('H', [1], [], 1)]);
    expect(checkChallenge('CH2', both, 0).passed).toBe(false);
  });

  it('passes |1⟩, |+⟩ and Bell with real statevector fidelity', () => {
    expect(checkChallenge('CH1', circ([gate('X', [0], [], 0)]), 0).fidelity).toBeCloseTo(1, 6);
    expect(checkChallenge('CH2', circ([gate('H', [0], [], 0)]), 0).fidelity).toBeCloseTo(1, 6);
    expect(
      checkChallenge('CH3', circ([gate('H', [0], [], 0), gate('CNOT', [1], [0], 1)]), 0).fidelity
    ).toBeCloseTo(1, 6);
  });

  it('ignores global phase', () => {
    // Z|1> = -|1>: same state up to phase, so the challenge still passes.
    expect(checkChallenge('CH1', circ([gate('X', [0], [], 0), gate('Z', [0], [], 1)]), 0).passed).toBe(true);
  });

  it('does not penalise a terminal Measure as an extra gate', () => {
    const withMeasure = circ([gate('X', [0], [], 0), gate('MEASURE', [0], [], 1)]);
    expect(checkChallenge('CH1', withMeasure, 0).score).toBe(100);
  });

  it('refuses the Bell target on a one-qubit register instead of crashing', () => {
    const r = checkChallenge('CH3', circ([gate('H', [0], [], 0)], 1), 0);
    expect(r.passed).toBe(false);
    expect(r.message).toMatch(/needs 2 qubits/);
  });
});

describe('G1/G2 lesson steps use wire marginals, not raw state keys', () => {
  it('completes a single-wire step on a two-qubit register', () => {
    const r = checkLessonStep('L1', 'L1S1', circ([gate('H', [0], [], 0)]));
    expect(r.passed).toBe(true);
  });

  it('completes the interference step where the target is {0:0, 1:1}', () => {
    const hzh = circ([gate('H', [0], [], 0), gate('Z', [0], [], 1), gate('H', [0], [], 2)]);
    expect(checkLessonStep('L3', 'L3S1', hzh).passed).toBe(true);
  });

  it('still fails when the circuit does not match', () => {
    expect(checkLessonStep('L1', 'L1S4', circ([gate('H', [0], [], 0)])).passed).toBe(false);
  });
});

describe('G3 hints reveal one level at a time', () => {
  const challenge = getChallenges()[0];

  function renderPanel(hintsUsed: number[], result: ChallengePanelProps['result'] = null) {
    const onHint = vi.fn();
    render(
      <ChallengePanel
        challenge={challenge}
        attempts={0}
        hintsUsed={hintsUsed}
        result={result}
        onHint={onHint}
        onCheck={() => {}}
      />
    );
    return onHint;
  }

  it('offers only the first hint initially', () => {
    renderPanel([]);
    expect(screen.getByRole('button', { name: /Hint 1/ })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /Hint 2/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Hint 3/ })).toBeDisabled();
  });

  it('offers the next hint after one is used', () => {
    renderPanel([1]);
    expect(screen.getByRole('button', { name: /Hint 1/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Hint 2/ })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /Hint 3/ })).toBeDisabled();
  });

  it('reveals the hint through the panel', () => {
    const onHint = renderPanel([]);
    fireEvent.click(screen.getByRole('button', { name: /Hint 1/ }));
    expect(onHint).toHaveBeenCalledWith(1);
  });

  it('shows the score in the result banner', () => {
    renderPanel([], { passed: true, fidelity: 1, message: 'passed', score: 85 });
    expect(screen.getByText('Score: 85')).toBeTruthy();
  });
});
