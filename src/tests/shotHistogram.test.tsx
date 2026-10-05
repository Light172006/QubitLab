import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { simulateCircuit } from '../mock/simulator';
import { StatePanel } from '../components/state/StatePanel';
import { Circuit, Gate, GateType } from '../types';

// jsdom has no WebGL: the real sphere throws on mount (a real browser
// falls back via the ErrorBoundary). Not under test here.
vi.mock('../components/state/BlochSphere', () => ({
  BlochSphere: () => <div data-testid="bloch-sphere" />,
}));

const gate = (
  type: GateType,
  targets: number[],
  controls: number[] = [],
  column = 0
): Gate => ({ id: `g${Math.random()}`, type, targets, controls, column });

const measuredCircuit = (): Circuit => ({
  version: 1,
  num_qubits: 2,
  gates: [gate('H', [0], [], 0), gate('MEASURE', [0], [], 1)],
});

describe('BUG-01: shot results reach the Live State panel', () => {
  it('puts counts into the facts packet when a Measure exists', () => {
    const result = simulateCircuit(measuredCircuit(), 512);
    expect(result.facts.counts).not.toBeNull();
    const total = Object.values(result.facts.counts!).reduce((a, b) => a + b, 0);
    expect(total).toBe(512);
  });

  it('keeps counts null without a Measure gate', () => {
    const circuit: Circuit = {
      version: 1,
      num_qubits: 2,
      gates: [gate('H', [0], [], 0)],
    };
    const result = simulateCircuit(circuit, 512);
    expect(result.facts.counts).toBeNull();
  });

  it('renders the histogram instead of the hint on the Shots tab', async () => {
    const result = simulateCircuit(measuredCircuit(), 512);
    render(
      <StatePanel circuit={measuredCircuit()} facts={result.facts} bitOrder="qiskit" />
    );
    fireEvent.click(screen.getByRole('tab', { name: /Shots/ }));
    expect(screen.queryByText(/Add a Measure \(M\) gate/i)).toBeNull();
  });

  it('shows the hint on the Shots tab when there is no Measure', async () => {
    const circuit: Circuit = {
      version: 1,
      num_qubits: 2,
      gates: [gate('H', [0], [], 0)],
    };
    const result = simulateCircuit(circuit, 512);
    render(<StatePanel circuit={circuit} facts={result.facts} bitOrder="qiskit" />);
    fireEvent.click(screen.getByRole('tab', { name: /Shots/ }));
    expect(screen.getByText(/Add a Measure \(M\) gate/i)).toBeTruthy();
  });
});
