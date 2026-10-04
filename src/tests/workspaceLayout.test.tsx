import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const simulate = vi.fn(async () => ({
  probabilities: { '00': 1 },
  amplitudes: { '00': { re: 1, im: 0 } },
  bloch: [{ q: 0, x: 0, y: 0, z: 1, purity: 1 }],
  entangled_qubits: [],
  counts: null,
  diff: { changed: [] },
  backend_agreement: { with: 'cirq', tvd: 0, agree: true },
  facts: {
    action: { type: 'reset' as const },
    num_qubits: 2,
    probabilities: { '00': 1 },
    prev_probabilities: {},
    amplitudes: { '00': { re: 1, im: 0 } },
    bloch: [{ q: 0, x: 0, y: 0, z: 1, purity: 1 }],
    entangled_qubits: [],
    changed_states: [],
    level: 'beginner' as const,
  },
}));

vi.mock('../api/client', () => ({
  api: {
    getLessons: vi.fn(async () => []),
    simulate: (...args: any[]) => (simulate as any)(...args),
    parseCode: vi.fn(async (_code: string) => ({ errors: [{ line: 1, code: 'x', message: 'boom' }] })),
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
import { useCircuitStore, useAuthStore, useUIStore } from '../store';

beforeEach(() => {
  vi.useFakeTimers();
  simulate.mockClear();
  useAuthStore.setState({ user: { id: 'u1', name: 'Test', role: 'student', token: 't' } });
  useCircuitStore.setState({
    circuit: { version: 1, num_qubits: 2, gates: [] },
    history: [{ version: 1, num_qubits: 2, gates: [] }],
    historyIndex: 0,
  });
  useUIStore.setState({ level: 'beginner', shots: 1024, leftRailOpen: true });
});

afterEach(() => {
  vi.useRealTimers();
});

function renderWorkspace() {
  return render(
    <MemoryRouter>
      <Workspace />
    </MemoryRouter>
  );
}

describe('Workspace layout', () => {
  it('lands the Live State in the centre column, not a right rail', () => {
    const { container } = renderWorkspace();

    const main = screen.getByRole('main', { name: 'Circuit and live state' });
    const liveState = screen.getByLabelText('Live state');
    // The Live State section is inside the centre column...
    expect(main.contains(liveState)).toBe(true);
    // ...and no right state rail exists anymore.
    expect(screen.queryByLabelText('Collapse state panel')).toBeNull();
    expect(container.querySelector('aside[aria-label="State"]')).toBeNull();
  });

  it('stacks toolbar, circuit and Live State in the centre column', () => {
    const { container } = renderWorkspace();

    const main = screen.getByRole('main', { name: 'Circuit and live state' });
    const grid = screen.getByRole('grid', { name: 'Quantum circuit' });
    const liveState = screen.getByLabelText('Live state');
    const circuitFirst = Boolean(
      grid.compareDocumentPosition(liveState) & Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(circuitFirst).toBe(true);

    // The centre column is a CSS grid with two rows: circuit (auto) and
    // Live State (1fr). jsdom does not load Tailwind, so assert on the
    // utility class rather than the computed style.
    const gridHost = (liveState as HTMLElement).closest<HTMLElement>('.grid');
    expect(gridHost).toBeTruthy();
    expect(gridHost!.className).toContain('grid-rows-[auto_1fr]');
    expect(container.contains(main)).toBe(true);
  });

  it('shows the gate palette on the Canvas tab and hides it on the Code tab', () => {
    renderWorkspace();

    const palette = screen.getByRole('list', { name: 'Gate palette' });
    expect(palette).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /code/i }));
    expect(screen.queryByRole('list', { name: 'Gate palette' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /canvas/i }));
    expect(screen.getByRole('list', { name: 'Gate palette' })).toBeTruthy();
  });

  it('gives the Code editor a definite height', () => {
    const { container } = renderWorkspace();

    fireEvent.click(screen.getByRole('button', { name: /code/i }));
    const region = screen.getByRole('region', { name: 'Code editor' });
    // The wrapper carries the clamp, so Monaco has a definite height to
    // fill instead of collapsing to 0px.
    const wrapper = region.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('min-h-[260px]');
    expect(wrapper.className).toContain('h-[clamp(260px,40vh,440px)]');
    expect(wrapper.className).toContain('max-h-[440px]');
    // The real height is verified in the browser suite; jsdom has no
    // layout engine.
    expect(container.contains(region)).toBe(true);
  });

  it('groups Backend and Shots once under Simulation', () => {
    renderWorkspace();

    expect(screen.getByLabelText('Backend')).toBeTruthy();
    expect(screen.getByLabelText('Shots')).toBeTruthy();
    expect(screen.getAllByText('Simulation')).toHaveLength(1);
  });
});
