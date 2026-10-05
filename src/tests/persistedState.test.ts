import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Regression cover for the workspace crash on a plain refresh.
 *
 * `useLessonStore` used to hold `completedSteps` as a `Set`, which zustand's
 * persist middleware writes out with JSON. `JSON.stringify(new Set())` is `{}`,
 * so the value rehydrated as a plain object and the first thing
 * LessonPlayer did - `completedIds.has(step.id)` - threw
 * "completedIds.has is not a function". The ErrorBoundary caught it, so every
 * student who opened the workspace twice saw only "Something went wrong".
 *
 * These tests feed the store the exact bytes the old code wrote, plus a few
 * hand-corrupted shapes, and require that none of them crash.
 */

const LESSON_KEY = 'qubitlab-lesson';

/** Load a fresh copy of the store module against whatever is in localStorage. */
async function freshStore() {
  vi.resetModules();
  return (await import('../store')).useLessonStore;
}

/** The circuit store, loaded fresh against the current localStorage. */
async function freshCircuitStore() {
  vi.resetModules();
  return (await import('../store')).useCircuitStore;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  vi.resetModules();
});

describe('A1/G1/G2 persisted lesson state rehydrates safely', () => {
  it('recovers from the {} payload the old Set implementation wrote', async () => {
    localStorage.setItem(LESSON_KEY, JSON.stringify({
      state: { currentLesson: null, currentStepIndex: 0, completedSteps: {} },
      version: 0,
    }));
    const store = await freshStore();
    expect(store.getState().completedSteps).toEqual([]);
  });

  it('recovers from an empty set written by the current implementation', async () => {
    localStorage.setItem(LESSON_KEY, JSON.stringify({
      state: { currentLesson: null, currentStepIndex: 0, completedSteps: {} },
      version: 0,
    }));
    const store = await freshStore();
    expect(() => store.getState().markStepComplete('L1S1')).not.toThrow();
    expect(store.getState().completedSteps).toEqual(['L1S1']);
  });

  it('round-trips real completions through JSON', async () => {
    const store = await freshStore();
    store.getState().markStepComplete('L1S1');
    store.getState().markStepComplete('L1S2');
    // Marking the same step twice must not double-count it.
    store.getState().markStepComplete('L1S1');
    expect(store.getState().completedSteps).toEqual(['L1S1', 'L1S2']);

    const rehydrated = await freshStore();
    expect(rehydrated.getState().completedSteps).toEqual(['L1S1', 'L1S2']);
  });

  it.each([
    ['null', null],
    ['a string', 'L1S1'],
    ['a number', 7],
    ['an array of non-strings', [1, 2, 3]],
    ['a nested object', { a: 1 }],
  ])('coerces %s instead of trusting it', async (_label, value) => {
    localStorage.setItem(LESSON_KEY, JSON.stringify({
      state: { currentLesson: null, currentStepIndex: 0, completedSteps: value },
      version: 0,
    }));
    const store = await freshStore();
    expect(Array.isArray(store.getState().completedSteps)).toBe(true);
    expect(() => store.getState().markStepComplete('L1S1')).not.toThrow();
    expect(store.getState().completedSteps).toEqual(['L1S1']);
  });

  it('drops non-string entries but keeps the valid ids', async () => {
    localStorage.setItem(LESSON_KEY, JSON.stringify({
      state: { currentLesson: null, currentStepIndex: 0, completedSteps: ['L1S1', 42, null, 'L1S2'] },
      version: 0,
    }));
    const store = await freshStore();
    expect(store.getState().completedSteps).toEqual(['L1S1', 'L1S2']);
  });

  it('survives a completely unparseable value', async () => {
    localStorage.setItem(LESSON_KEY, '{not json at all');
    const store = await freshStore();
    expect(store.getState().completedSteps).toEqual([]);
  });

  it('keeps a corrupt circuit payload from reaching the simulator', async () => {
    // qubitlab-circuit is the other store the workspace reads on mount.
    localStorage.setItem('qubitlab-circuit', JSON.stringify({ state: { circuit: null }, version: 0 }));
    const store = await freshCircuitStore();
    const circuit = store.getState().circuit;
    expect(Array.isArray(circuit.gates)).toBe(true);
    expect(typeof circuit.num_qubits).toBe('number');
  });

  it.each([
    ['a circuit with no gates array', { version: 1, num_qubits: 2 }],
    ['a circuit with no qubit count', { version: 1, gates: [] }],
    ['a history of non-circuits', { version: 1, num_qubits: 2, gates: [] }],
  ])('falls back to the initial circuit for %s', async (_label, circuit) => {
    localStorage.setItem(
      'qubitlab-circuit',
      JSON.stringify({ state: { circuit, history: ['nope'], historyIndex: 99 }, version: 0 })
    );
    const store = await freshCircuitStore();
    const state = store.getState();
    expect(Array.isArray(state.circuit.gates)).toBe(true);
    expect(typeof state.circuit.num_qubits).toBe('number');
    // historyIndex must stay inside history or undo walks off the end.
    expect(state.historyIndex).toBeGreaterThanOrEqual(0);
    expect(state.historyIndex).toBeLessThan(state.history.length);
  });
});