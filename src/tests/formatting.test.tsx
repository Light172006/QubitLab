import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fixed, signedFixed, degrees, percent, labelForState } from '../lib/format';
import { AmplitudeTable, histogramData } from '../components/state';
import { simulateCircuit } from '../mock/simulator';
import type { Circuit, Gate } from '../types';

const gate = (type: Gate['type'], targets: number[], controls: number[] = [], column = 0): Gate => ({
  id: `${type}${targets.join('')}${column}`, type, targets, controls, column,
});
const circ = (gates: Gate[], numQubits = 2): Circuit => ({ version: 1, num_qubits: numQubits, gates });

describe('B6 no -0, NaN or "-0.0000" reaches the readout', () => {
  it('snaps negative zero for every formatter', () => {
    for (const digits of [1, 2, 3, 4]) {
      const zero = (0).toFixed(digits);
      expect(fixed(-1.1e-16, digits)).toBe(zero);
      expect(signedFixed(-1.1e-16, digits)).toBe(`+${zero}`);
      expect(degrees(-1.1e-16, digits)).toBe(`${zero}°`);
    }
    // A value that genuinely rounds to zero loses its sign...
    expect(fixed(-0.0001)).toBe('0.00');
    expect(fixed(-1e-6)).toBe('0.00');
    expect(signedFixed(-1e-6)).toBe('+0.0000');
    // ...but one that does not keeps it, at every precision.
    expect(signedFixed(-0.0001)).toBe('-0.0001');
    // ...and one that does not keep its sign but is still "-0.00"-free.
    expect(fixed(-0.5)).toBe('-0.50');
    expect(signedFixed(-0.5)).toBe('-0.5000');
  });

  it('renders non-finite values visibly rather than as NaN', () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(fixed(bad)).not.toMatch(/NaN|Infinity/);
      expect(signedFixed(bad)).not.toMatch(/NaN|Infinity/);
      expect(degrees(bad)).not.toMatch(/NaN|Infinity/);
      expect(percent(bad)).not.toMatch(/NaN|Infinity/);
    }
  });

  it('keeps real precision', () => {
    expect(fixed(0.4999)).toBe('0.50');
    expect(signedFixed(0.7071067811865476)).toBe('+0.7071');
    expect(degrees(45)).toBe('45.0°');
    expect(percent(0.25)).toBe('25%');
    expect(percent(0.5, 1)).toBe('50.0%');
  });

  it('finds no bad value anywhere in a circuit that produces one', () => {
    // H,T,H is the circuit that produced bloch.x = -1.1e-16.
    const result = simulateCircuit(circ([gate('H', [0], [], 0), gate('T', [0], [], 1), gate('H', [0], [], 2)]));
    const texts = [
      ...result.bloch.flatMap((b) => [fixed(b.x), fixed(b.y), fixed(b.z), fixed(b.purity)]),
      ...Object.values(result.amplitudes).flatMap((a) => [signedFixed(a.re), signedFixed(a.im)]),
      ...Object.values(result.probabilities).map((p) => fixed(p)),
    ];
    expect(texts.filter((t) => /(^|\s)-\s*0(\.0+)?(°)?$/.test(t) || /NaN|Infinity/.test(t))).toEqual([]);
    // The float noise really is there, so the guard is doing something.
    expect(result.bloch[0].x).toBeLessThan(0);
    expect(fixed(result.bloch[0].x)).toBe('0.00');
  });
});

/** "0.00" for two digits, "0.0" for one, "0.0000" for four. */
const snap = (digits: number) => (0).toFixed(digits);

describe('B3 the bit-order toggle relabels without touching the physics', () => {
  it('reads a state the other way round for canvas order', () => {
    expect(labelForState('01', 'qiskit')).toBe('01');
    expect(labelForState('01', 'canvas')).toBe('10');
    expect(labelForState('110', 'canvas')).toBe('011');
    expect(labelForState('0001', 'canvas')).toBe('1000');
  });

  it('flips the amplitude table labels', () => {
    const result = simulateCircuit(circ([gate('X', [0], [], 0)]));
    const amps = result.amplitudes;

    const { unmount } = render(
      <AmplitudeTable amplitudes={amps} probabilities={result.probabilities} bitOrder="qiskit" />
    );
    expect(screen.getByText('01')).toBeInTheDocument();
    unmount();

    render(<AmplitudeTable amplitudes={amps} probabilities={result.probabilities} bitOrder="canvas" />);
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.queryByText('01')).toBeNull();
  });

  it('shows the same magnitude, phase and probability in both orders', () => {
    const result = simulateCircuit(circ([gate('X', [0], [], 0), gate('T', [0], [], 1)]));
    const props = { amplitudes: result.amplitudes, probabilities: result.probabilities };

    const first = render(<AmplitudeTable {...props} bitOrder="qiskit" />);
    const qiskitRow = first.container.querySelector('tbody tr')?.textContent;
    first.unmount();

    const second = render(<AmplitudeTable {...props} bitOrder="canvas" />);
    const canvasRow = second.container.querySelector('tbody tr')?.textContent;

    // Only the first cell (the label) differs.
    expect(qiskitRow?.slice(2)).toBe(canvasRow?.slice(2));
  });

  it('flips the histogram axis labels without reordering the bars', () => {
    // jsdom gives the chart a 0x0 box, so this asserts the data mapping the
    // chart is built from rather than the rendered SVG.
    const counts = { '01': 512, '10': 512, '00': 8 };

    expect(histogramData(counts, 'qiskit').map((d) => d.state)).toEqual(['00', '01', '10']);
    expect(histogramData(counts, 'canvas').map((d) => d.state)).toEqual(['00', '10', '01']);
  });

  it('keeps the same shot counts in both orders', () => {
    const counts = { '00': 300, '11': 724 };
    const qiskit = histogramData(counts, 'qiskit');
    const canvas = histogramData(counts, 'canvas');

    expect(qiskit.map((d) => d.count)).toEqual([300, 724]);
    expect(canvas.map((d) => d.count)).toEqual(qiskit.map((d) => d.count));
    expect(canvas.map((d) => d.state).sort()).toEqual(qiskit.map((d) => d.state).sort());
  });
});