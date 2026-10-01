import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * B11: tutor streams were never cancelled. Clearing the 400ms debounce timer only
 * helps before a stream starts; once `api.explain` is iterating, a later circuit
 * change did not stop it, so tokens from a superseded circuit kept appending and
 * the final `setStreaming(false)` / `commitExplanation()` came from the stale run.
 *
 * The fix is a monotonic run token: a run may only write while it is still the
 * newest. These tests drive that with a gated generator.
 */

const makeFacts = (probabilities: Record<string, number>) => ({
  action: { type: 'add_gate' as const, gate: 'H' as const },
  num_qubits: 2,
  probabilities,
  prev_probabilities: {},
  amplitudes: { '00': { re: 1, im: 0 } },
  bloch: [{ q: 0, x: 0, y: 0, z: 1, purity: 1 }],
  entangled_qubits: [],
  changed_states: [],
  level: 'beginner' as const,
});

const simulate = vi.fn(async (_circuit: any, _shots?: number) => {
  const probabilities = { '00': 1 };
  return {
    probabilities,
    amplitudes: { '00': { re: 1, im: 0 } },
    bloch: [{ q: 0, x: 0, y: 0, z: 1, purity: 1 }],
    entangled_qubits: [],
    counts: null,
    diff: { changed: [] },
    backend_agreement: { with: 'cirq', tvd: 0, agree: true },
    facts: makeFacts(probabilities),
  };
});

/**
 * Each explain() call emits its first token immediately, then blocks until the
 * test releases it. That window is where a superseding circuit change lands.
 */
const gates: Array<() => void> = [];
let callIndex = 0;

async function* explain() {
  const id = ++callIndex;
  yield { type: 'token' as const, content: `run${id}:first ` };
  await new Promise<void>((resolve) => gates.push(resolve));
  yield { type: 'token' as const, content: `run${id}:stale ` };
  yield { type: 'done' as const };
}

vi.mock('../api/client', () => ({
  api: {
    getLessons: vi.fn(async () => []),
    simulate: (...args: any[]) => (simulate as any)(...args),
    parseCode: vi.fn(async () => ({ circuit: { version: 1, num_qubits: 2, gates: [] } })),
    circuitToCode: vi.fn(async () => ''),
    explain: (...args: any[]) => explain(...(args as [])),
    ask: async function* () { yield { type: 'done' as const }; },
  },
}));

// three.js cannot create a WebGL context in jsdom.
vi.mock('../components/state/BlochSphere', () => ({ BlochSphere: () => <div data-testid="bloch" /> }));
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }: any) => (
    <textarea aria-label="code" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

import Workspace from '../pages/Workspace';
import { useCircuitStore, useAuthStore, useTutorStore, useCodeStore, useUIStore } from '../store';

const empty: any = { version: 1, num_qubits: 2, gates: [] };
const withH: any = {
  version: 1,
  num_qubits: 2,
  gates: [{ id: 'g1', type: 'H', targets: [0], controls: [], column: 0 }],
};
const withX: any = {
  version: 1,
  num_qubits: 2,
  gates: [{ id: 'g2', type: 'X', targets: [0], controls: [], column: 1 }],
};

async function flush(rounds = 3) {
  for (let i = 0; i < rounds; i++) {
    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
      await Promise.resolve();
    });
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  simulate.mockClear();
  callIndex = 0;
  gates.length = 0;
  useCircuitStore.setState({ circuit: empty, history: [empty], historyIndex: 0 });
  useTutorStore.setState({ factsPacket: null, currentExplanation: '', messages: [], isStreaming: false });
  useCodeStore.setState({ code: '', syncStatus: 'synced', errors: [] });
  useUIStore.setState({ level: 'beginner', shots: 1024, leftRailOpen: true, rightRailOpen: true });
  useAuthStore.setState({ user: { id: 'u1', name: 'Test', role: 'student', token: 't' } });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('B11 superseded tutor streams are cancelled', () => {
  it('drops tokens from a stream that a newer circuit change replaced', async () => {
    render(
      <MemoryRouter>
        <Workspace />
      </MemoryRouter>
    );
    await flush();

    // First committed change starts run 1, which blocks inside explain().
    act(() => {
      useCircuitStore.setState({ circuit: withH, history: [empty, withH], historyIndex: 1 });
    });
    await flush();
    expect(callIndex).toBe(1);
    expect(useTutorStore.getState().currentExplanation).toBe('run1:first ');
    expect(gates).toHaveLength(1);

    // Second change starts run 2 and clears the explanation.
    act(() => {
      useCircuitStore.setState({ circuit: withX, history: [empty, withH, withX], historyIndex: 2 });
    });
    await flush();
    expect(callIndex).toBe(2);
    expect(useTutorStore.getState().currentExplanation).toBe('run2:first ');

    // Release the stale run 1. Its remaining tokens must never be written.
    await act(async () => {
      gates[0]();
      await Promise.resolve();
      await Promise.resolve();
    });
    await flush();

    console.log('explanation after releasing stale run:', useTutorStore.getState().currentExplanation);
    const afterStale = useTutorStore.getState().currentExplanation;
    expect(afterStale).not.toContain('run1:stale');
    expect(afterStale).toBe('run2:first ');

    // Releasing run 2 completes normally.
    await act(async () => {
      gates[1]();
      await Promise.resolve();
      await Promise.resolve();
    });
    await flush();

    const done = useTutorStore.getState();
    console.log('committed messages:', done.messages.length, '| streaming:', done.isStreaming);
    expect(done.isStreaming).toBe(false);
    // commitExplanation files the buffer into the scrollback and clears it.
    expect(done.currentExplanation).toBe('');
    // Exactly one committed message: the stale run never reached its commit.
    expect(done.messages).toHaveLength(1);
    expect(done.messages[0].text).toBe('run2:first run2:stale');
  });

  it('does not write to the tutor after the Workspace unmounts mid-stream', async () => {
    const view = render(
      <MemoryRouter>
        <Workspace />
      </MemoryRouter>
    );
    await flush();

    act(() => {
      useCircuitStore.setState({ circuit: withH, history: [empty, withH], historyIndex: 1 });
    });
    await flush();
    expect(callIndex).toBe(1);
    const beforeUnmount = useTutorStore.getState().currentExplanation;
    expect(beforeUnmount).toBe('run1:first ');

    view.unmount();

    await act(async () => {
      gates[0]();
      await Promise.resolve();
      await Promise.resolve();
    });
    await flush();

    const after = useTutorStore.getState();
    console.log('post-unmount explanation:', JSON.stringify(after.currentExplanation), '| streaming:', after.isStreaming);
    expect(after.currentExplanation).toBe('run1:first ');
    expect(after.isStreaming).toBe(true);
    expect(after.messages).toHaveLength(0);
  });
});
