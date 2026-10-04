import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { FactsPacket } from '../types';

/**
 * The StatePanel is a wrapping grid (Probabilities | Amplitudes | Bloch
 * Spheres) with responsive behaviour. Amplitudes are always expanded and
 * the histogram lives behind the Shots tab.
 */

vi.mock('../components/state/BlochSphere', () => ({
  BlochSphere: ({ bloch }: { bloch: { q: number } }) => (
    <div role="img" aria-label={`Bloch sphere for qubit ${bloch.q}`} />
  ),
}));

const { StatePanel } = await import('../components/state/StatePanel');

function facts(overrides: Partial<FactsPacket> = {}): FactsPacket {
  return {
    action: { type: 'reset' },
    num_qubits: 2,
    probabilities: { '00': 0.5, '11': 0.5 },
    prev_probabilities: {},
    amplitudes: {
      '00': { re: 0.7071, im: 0 },
      '11': { re: 0.7071, im: 0 },
    },
    bloch: [
      { q: 0, x: 0, y: 0, z: 1, purity: 1 },
      { q: 1, x: 0, y: 0, z: -1, purity: 1 },
    ],
    entangled_qubits: [0, 1],
    changed_states: [],
    level: 'beginner',
    ...overrides,
  } as FactsPacket;
}

describe('StatePanel card grid', () => {
  it('lays the cards out in a responsive grid', () => {
    const { container } = render(
      <StatePanel facts={facts()} bitOrder="qiskit" />
    );

    const grid = container.firstElementChild as HTMLElement;
    expect(grid.style.display).toBe('grid');
    // Cards wrap responsively instead of being pinned to three columns.
    expect(grid.style.gridTemplateColumns).toBe('repeat(auto-fit, minmax(300px, 1fr))');
    expect(grid.style.gap).toBe('16px');
  });

  it('renders three cards: Probabilities, Amplitudes, Bloch Spheres', () => {
    render(<StatePanel facts={facts()} bitOrder="qiskit" />);

    // Card titles are headings; "Probabilities" also labels a tab button.
    expect(screen.getByRole('heading', { name: 'Probabilities' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Bloch Spheres' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Amplitudes' })).toBeTruthy();
    // The histogram is conditional: an unmeasured circuit must not show a
    // placeholder card for it.
    expect(screen.queryByText(/Add a Measure \(M\) gate/)).toBeNull();
  });

  it('shows the histogram only once shots exist', () => {
    const { rerender } = render(<StatePanel facts={facts()} bitOrder="qiskit" />);

    fireEvent.click(screen.getByRole('tab', { name: 'Shots' }));
    expect(screen.getByText(/Add a Measure \(M\) gate/)).toBeTruthy();

    rerender(
      <StatePanel
        facts={facts({ counts: { '00': 512, '11': 488 } } as Partial<FactsPacket>)}
        bitOrder="qiskit"
      />
    );
    // The empty-shot prompt is replaced by the histogram chart.
    expect(screen.queryByText(/Add a Measure \(M\) gate/)).toBeNull();
    expect(
      document.querySelector('.recharts-wrapper, .recharts-responsive-container')
    ).toBeTruthy();
  });

  it('puts every Bloch sphere in a wrapping grid', () => {
    const { container } = render(<StatePanel facts={facts()} bitOrder="qiskit" />);

    // Bloch spheres sit in an inline wrapping grid (no utility class)
    const wrappingGrids = Array.from(container.querySelectorAll<HTMLElement>('div')).filter(
      (el) => (el.style.gridTemplateColumns || '').includes('minmax(96px')
    );
    expect(wrappingGrids.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('img')).toHaveLength(2);
  });

  it('always shows the amplitude table expanded (no collapse control)', () => {
    render(<StatePanel facts={facts()} bitOrder="qiskit" level="beginner" />);

    // Amplitude table should always be visible now (no collapse)
    expect(screen.getByRole('table')).toBeTruthy();

    // Magnitude is a first-class column
    expect(screen.getByText('Magnitude')).toBeTruthy();
    expect(screen.getByText('Phase (°)')).toBeTruthy();
    expect(screen.getByText('|α|²')).toBeTruthy();
  });

  it('shows the empty-state prompt with |00⟩ baseline before any gate is placed', () => {
    render(<StatePanel facts={null} bitOrder="qiskit" />);
    expect(screen.getByText('Add a gate to see how the state changes.')).toBeTruthy();
    // Should show |00⟩ baseline bar
    expect(screen.getByText('00')).toBeTruthy();
    expect(screen.getByText('1.00')).toBeTruthy();
  });

  it('drops basis states that have collapsed to zero probability', () => {
    const { container } = render(
      <StatePanel
        facts={facts({ probabilities: { '00': 1, '01': 0, '10': 0, '11': 0 } })}
        bitOrder="qiskit"
      />
    );

    // Only |00⟩ should be shown
    const rowLabels = Array.from(
      container.querySelectorAll('.w-16.font-mono.text-label')
    ).map((el) => el.textContent);
    expect(rowLabels).toEqual(['00']);
  });

  it('shows Probabilities and Shots tabs', () => {
    render(<StatePanel facts={facts()} bitOrder="qiskit" />);

    expect(screen.getByRole('tab', { name: 'Probabilities' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Shots' })).toBeTruthy();
  });

  it('shows dimmed zero-probability rows that were previously non-zero', () => {
    const { container } = render(
      <StatePanel
        facts={facts({
          probabilities: { '00': 0.5, '01': 0, '10': 0, '11': 0.5 },
          prev_probabilities: { '00': 0.5, '01': 0.5, '10': 0, '11': 0.5 },
        })}
        bitOrder="qiskit"
      />
    );

    // Zero-probability rows survive the filter via prev_probabilities and are dimmed.
    const zeroProbRows = container.querySelectorAll('.opacity-40');
    expect(zeroProbRows.length).toBe(1);
    expect(zeroProbRows[0].textContent).toContain('01');
  });
});
