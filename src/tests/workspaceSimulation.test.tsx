import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

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

const makeResponse = (probabilities: Record<string, number> = { '00': 1 }) => ({
  probabilities,
  amplitudes: { '00': { re: 1, im: 0 } },
  bloch: [{ q: 0, x: 0, y: 0, z: 1, purity: 1 }],
  entangled_qubits: [],
  counts: null,
  diff: { changed: [] },
  backend_agreement: { with: 'cirq', tvd: 0, agree: true },
  facts: makeFacts(probabilities),
});

type ParseResult = { circuit: any } | { errors: Array<{ line: number; code: string; message: string }> };

const simulate = vi.fn(async (_circuit: any, _shots?: number) => makeResponse());
const parseCode = vi.fn(async (_code: string): Promise<ParseResult> => ({
  errors: [{ line: 1, code: 'x', message: 'boom' }],
}));

vi.mock('../api/client', () => ({
  api: {
    getLessons: vi.fn(async () => []),
    simulate: (...args: any[]) => (simulate as any)(...args),
    parseCode: (...args: any[]) => (parseCode as any)(...args),
    circuitToCode: vi.fn(async () => ''),
    explain: async function* () { yield { type: 'done' as const }; },
    ask: async function* () { yield { type: 'done' as const }; },
  },
}));

// three.js cannot create a WebGL context in jsdom.
vi.mock('../components/state/BlochSphere', () => ({ BlochSphere: () => <div data-testid="bloch" /> }));
// Monaco loads from a CDN at runtime; a plain textarea drives onChange instead.
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

async function flush(rounds = 3) {
  // Two chained debounces (parse -> simulate) need more than one advance.
  for (let i = 0; i < rounds; i++) {
    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
      await Promise.resolve();
    });
  }
}

function renderWorkspace() {
  useAuthStore.setState({ user: { id: 'u1', name: 'Test', role: 'student', token: 't' } });
  return render(
    <MemoryRouter>
      <Workspace />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  simulate.mockClear();
  parseCode.mockClear();
  useCircuitStore.setState({ circuit: empty, history: [empty], historyIndex: 0 });
  useTutorStore.setState({ factsPacket: null, currentExplanation: '', messages: [], isStreaming: false });
  useCodeStore.setState({ code: '', syncStatus: 'synced', errors: [] });
  useUIStore.setState({ level: 'beginner', shots: 1024, leftRailOpen: true, rightRailOpen: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('B5 undo/redo/reset must resimulate', () => {
  it('does not simulate the untouched circuit on mount', async () => {
    renderWorkspace();
    await flush();
    console.log('B5 simulate calls on mount:', simulate.mock.calls.length);
    expect(simulate.mock.calls.length).toBe(0);
  });

  it('recomputes the state panel when the circuit changes in the store', async () => {
    renderWorkspace();
    await flush();
    simulate.mockClear();

    act(() => {
      useCircuitStore.setState({ circuit: withH, history: [empty, withH], historyIndex: 1 });
    });
    await flush();

    console.log('B5 simulate calls after a committed circuit change:', simulate.mock.calls.length);
    expect(simulate.mock.calls.length).toBe(1);
    expect(simulate.mock.calls[0][0]).toEqual(withH);
    expect(useTutorStore.getState().factsPacket).not.toBeNull();
  });

  it('undo() recomputes the state panel', async () => {
    renderWorkspace();
    act(() => {
      useCircuitStore.setState({ circuit: withH, history: [empty, withH], historyIndex: 1 });
    });
    await flush();
    simulate.mockClear();

    act(() => useCircuitStore.getState().undo());
    await flush();

    console.log('B5 simulate calls after undo():', simulate.mock.calls.length);
    expect(simulate.mock.calls.length).toBe(1);
    expect(simulate.mock.calls[0][0]).toEqual(empty);
  });

  it('reset() recomputes the state panel', async () => {
    renderWorkspace();
    act(() => {
      useCircuitStore.setState({ circuit: withH, history: [withH], historyIndex: 0 });
    });
    await flush();
    simulate.mockClear();

    act(() => useCircuitStore.getState().reset());
    await flush();

    console.log('B5 simulate calls after reset():', simulate.mock.calls.length);
    expect(simulate.mock.calls.length).toBe(1);
  });
});

describe('B6 a code edit must resimulate', () => {
  async function typeCode(code: string) {
    fireEvent.click(screen.getByRole('button', { name: /code/i }));
    // Synchronous lookup: findBy* deadlocks under fake timers.
    const editor = screen.getByLabelText('code');
    fireEvent.change(editor, { target: { value: code } });
    await flush();
  }

  it('simulates the parsed circuit and updates the state panel', async () => {
    const parsed = {
      version: 1,
      num_qubits: 2,
      gates: [{ id: 'p0', type: 'H', targets: [0], controls: [], column: 0 }],
    };
    parseCode.mockResolvedValueOnce({ circuit: parsed });
    renderWorkspace();
    await flush();
    simulate.mockClear();

    await typeCode('qc.h(0)');

    console.log('B6 parseCode calls:', parseCode.mock.calls.length, '| simulate calls:', simulate.mock.calls.length);
    expect(parseCode.mock.calls.length).toBe(1);
    expect(simulate.mock.calls.length).toBe(1);
    expect(simulate.mock.calls[0][0]).toEqual(parsed);
    expect(useTutorStore.getState().factsPacket).not.toBeNull();
    expect(useCodeStore.getState().syncStatus).toBe('synced');
  });

  it('leaves the last valid circuit untouched when the code is invalid', async () => {
    renderWorkspace();
    act(() => {
      useCircuitStore.setState({ circuit: withH, history: [withH], historyIndex: 0 });
    });
    await flush();
    simulate.mockClear();
    parseCode.mockResolvedValueOnce({ errors: [{ line: 2, code: 'qc.zz(0)', message: 'Unsupported gate method: zz' }] });

    await typeCode('qc.zz(0)');

    console.log('B6 invalid: simulate calls:', simulate.mock.calls.length, '| errors:', JSON.stringify(useCodeStore.getState().errors));
    expect(useCircuitStore.getState().circuit).toEqual(withH);
    expect(simulate.mock.calls.length).toBe(0);
    expect(useCodeStore.getState().syncStatus).toBe('error');
    expect(useCodeStore.getState().errors[0].line).toBe(2);
  });
});
