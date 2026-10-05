import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  CircuitCanvas,
  isLockedByMeasure,
  removeGateFromCircuit,
  moveGateInCircuit,
  canPlaceTwoQubit,
} from '../components/canvas/CircuitCanvas';
import { GatePalette } from '../components/canvas/GatePalette';
import type { Circuit } from '../types';

const empty: Circuit = { version: 1, num_qubits: 2, gates: [] };
const withH: Circuit = {
  version: 1,
  num_qubits: 2,
  gates: [{ id: 'g1', type: 'H', targets: [0], controls: [], column: 0 }],
};
const withMeasureOnQ0: Circuit = {
  version: 1,
  num_qubits: 2,
  gates: [
    { id: 'g1', type: 'H', targets: [0], controls: [], column: 0 },
    { id: 'g2', type: 'MEASURE', targets: [0], controls: [], column: 2 },
  ],
};

function renderCanvas(circuit: Circuit) {
  const onChange = vi.fn();
  render(<CircuitCanvas circuit={circuit} onChange={onChange} numQubits={2} />);
  return onChange;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('B2 nothing may be placed after Measure on that wire', () => {
  it('locks the cells at and after the measurement, not the ones before it', () => {
    expect(isLockedByMeasure(withMeasureOnQ0, 0, 0)).toBe(false);
    expect(isLockedByMeasure(withMeasureOnQ0, 0, 1)).toBe(false);
    expect(isLockedByMeasure(withMeasureOnQ0, 0, 2)).toBe(true);
    expect(isLockedByMeasure(withMeasureOnQ0, 0, 5)).toBe(true);
  });

  it('leaves the other wire alone', () => {
    expect(isLockedByMeasure(withMeasureOnQ0, 1, 5)).toBe(false);
  });

  it('renders the lock hint only on the cells after the measurement', () => {
    renderCanvas(withMeasureOnQ0);
    // Every locked cell carries the "locked" suffix in its aria-label.
    const locked = screen
      .getAllByRole('gridcell')
      .filter((cell) => cell.getAttribute('aria-label')?.includes('locked'));
    // columns 2..9 on q0 only
    console.log('B2 locked cells:', locked.length);
    expect(locked).toHaveLength(8);
    expect(screen.getByRole('gridcell', { name: /^Qubit 0, column 5/ })).toHaveAttribute(
      'aria-label',
      expect.stringContaining('locked')
    );
    expect(screen.getByRole('gridcell', { name: /^Qubit 0, column 1/ }).getAttribute('aria-label')).not.toContain('locked');
    expect(screen.getByRole('gridcell', { name: /^Qubit 1, column 5/ }).getAttribute('aria-label')).not.toContain('locked');
  });
});

describe('B3 deleting a placed gate', () => {
  it('removes the gate from the circuit', () => {
    expect(removeGateFromCircuit(withH, 'g1')).toEqual(empty);
  });

  it('leaves the circuit untouched for an unknown id', () => {
    expect(removeGateFromCircuit(withH, 'nope')).toBe(withH);
  });

  it('wires the remove button to onChange', () => {
    const onChange = renderCanvas(withH);
    const tile = screen.getByRole('button', { name: /H gate on qubit 0/ });
    fireEvent.mouseEnter(tile);
    fireEvent.click(screen.getByRole('button', { name: /Remove H gate/ }));

    console.log('B3 onChange calls:', onChange.mock.calls.length);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual(empty);
  });
});

describe('C3 two-qubit placement checks both wires', () => {
  it('accepts a column free on both wires', () => {
    expect(canPlaceTwoQubit(withH, 0, 1, 1)).toBe(true);
  });

  it('rejects a column occupied on the control wire', () => {
    // H sits on q0 column 0: a CNOT controlled by q0
    // cannot also occupy column 0.
    expect(canPlaceTwoQubit(withH, 0, 1, 0)).toBe(false);
  });

  it('rejects a column occupied on the target wire', () => {
    const withXOnQ1: Circuit = {
      version: 1,
      num_qubits: 2,
      gates: [{ id: 'g1', type: 'X', targets: [1], controls: [], column: 0 }],
    };
    expect(canPlaceTwoQubit(withXOnQ1, 0, 1, 0)).toBe(false);
  });

  it('rejects the same wire as control and target', () => {
    expect(canPlaceTwoQubit(withH, 0, 0, 3)).toBe(false);
  });
});

describe('C2 candidate target cells highlight during placement', () => {
  it('highlights cells on every wire except the control', () => {
    const placing = {
      gate: { id: 'p1', type: 'CNOT' as const, targets: [0], controls: [], column: 1 },
      control: 0,
    };
    render(
      <CircuitCanvas circuit={empty} onChange={vi.fn()} numQubits={2} placingTwoQubit={placing} />
    );
    const controlCell = screen.getByRole('gridcell', { name: /^Qubit 0, column 1/ });
    const targetCell = screen.getByRole('gridcell', { name: /^Qubit 1, column 1/ });
    expect(targetCell.className).toContain('bg-brand-tint');
    expect(controlCell.className).not.toContain('bg-brand-tint');
  });

  it('highlights nothing when no placement is pending', () => {
    renderCanvas(empty);
    const cell = screen.getByRole('gridcell', { name: /^Qubit 1, column 1/ });
    expect(cell.className).not.toContain('bg-brand-tint');
  });
});

describe('B4 moving a placed gate', () => {
  it('moves a single-qubit gate to a new wire and column', () => {
    const moved = moveGateInCircuit(withH, 'g1', 1, 4);
    console.log('B4 moved:', JSON.stringify(moved.gates));
    expect(moved.gates[0].targets).toEqual([1]);
    expect(moved.gates[0].column).toBe(4);
    expect(moved).not.toBe(withH);
  });

  it('keeps the gate id', () => {
    expect(moveGateInCircuit(withH, 'g1', 1, 4).gates[0].id).toBe('g1');
  });

  it('refuses to move onto an occupied cell', () => {
    const twoGates: Circuit = {
      version: 1,
      num_qubits: 2,
      gates: [
        { id: 'g1', type: 'H', targets: [0], controls: [], column: 0 },
        { id: 'g2', type: 'X', targets: [1], controls: [], column: 0 },
      ],
    };
    expect(moveGateInCircuit(twoGates, 'g1', 1, 0)).toBe(twoGates);
  });

  it('refuses to move a gate to a cell blocked by a measurement', () => {
    expect(moveGateInCircuit(withMeasureOnQ0, 'g1', 0, 5)).toBe(withMeasureOnQ0);
  });

  it('moves a two-qubit gate by column only and keeps its wires', () => {
    const bell: Circuit = {
      version: 1,
      num_qubits: 2,
      gates: [
        { id: 'g1', type: 'H', targets: [0], controls: [], column: 0 },
        { id: 'g2', type: 'CNOT', targets: [1], controls: [0], column: 1 },
      ],
    };
    const moved = moveGateInCircuit(bell, 'g2', 0, 5);
    console.log('B4 bell moved:', JSON.stringify(moved.gates[1]));
    expect(moved.gates[1].column).toBe(5);
    expect(moved.gates[1].controls).toEqual([0]);
    expect(moved.gates[1].targets).toEqual([1]);
  });

  it('ignores an unknown gate id', () => {
    expect(moveGateInCircuit(withH, 'nope', 1, 3)).toBe(withH);
  });

  it('registers placed gates and palette gates as draggables in one context', () => {
    // The palette is a sibling of the canvas in the Workspace, so render both.
    render(
      <>
        <GatePalette onGateSelect={vi.fn()} />
        <CircuitCanvas circuit={withH} onChange={vi.fn()} numQubits={2} />
      </>
    );
    const placed = screen.getByRole('button', { name: /H gate on qubit 0/ });
    const palette = screen.getByRole('listitem', { name: /Pauli-X/ });
    console.log(
      'B4 aria-roledescription placed/palette:',
      placed.getAttribute('aria-roledescription'),
      '/',
      palette.getAttribute('aria-roledescription')
    );
    expect(placed).toHaveAttribute('aria-roledescription', 'draggable');
    expect(palette).toHaveAttribute('aria-roledescription', 'draggable');
  });

  it('keeps the circuit sorted by column', () => {
    const moved = moveGateInCircuit(withMeasureOnQ0, 'g2', 0, 1);
    console.log('B4 order after move:', JSON.stringify(moved.gates.map(g => [g.id, g.column])));
    expect(moved.gates.map(g => g.column)).toEqual([0, 1]);
  });
});
