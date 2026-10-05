import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DndContext, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { GatePalette } from '../components/canvas/GatePalette';
import { useCircuitStore } from '../store';
import { simulateCircuit } from '../mock/simulator';

/**
 * Keyboard placement rides entirely on dnd-kit's KeyboardSensor, so these tests
 * assert that nothing in the tile swallows keydown: the palette used to call a
 * no-op onGateSelect instead, which left the tile focusable but inert.
 */

/** The palette inside a real keyboard-driven DndContext, as the pages mount it. */
function KeyboardPalette() {
  const sensors = useSensors(useSensor(KeyboardSensor));
  return (
    <DndContext sensors={sensors} onDragStart={() => {}}>
      <GatePalette />
    </DndContext>
  );
}

describe('B12/B39 palette tiles are real, named, keyboard-operable buttons', () => {
  beforeEach(() => {
    useCircuitStore.setState({ circuit: { version: 1, num_qubits: 2, gates: [] } });
  });

  it('exposes a gate tile as a button with an accessible name', () => {
    render(<GatePalette />);
    const hadamard = screen.getByRole('button', { name: /Hadamard/ });
    expect(hadamard).toBeInTheDocument();
    expect(hadamard).toHaveAttribute('title', expect.stringContaining('drag onto a wire'));
    // The name must say how to place it without a mouse.
    expect(hadamard.getAttribute('aria-label')).toMatch(/Press Space to pick up/i);
    expect(hadamard.getAttribute('aria-label')).toMatch(/arrow keys/i);
  });

  it('does not use role=listitem, which cannot carry an accessible name', () => {
    const { container } = render(<GatePalette />);
    expect(container.querySelector('[role="listitem"]')).toBeNull();
    // Every tile is focusable in the tab order.
    const tiles = container.querySelectorAll('button.gate-palette-tile');
    expect(tiles.length).toBeGreaterThan(0);
    tiles.forEach((tile) => expect(tile).not.toHaveAttribute('disabled'));
  });

  it('names all eight gates', () => {
    render(<GatePalette />);
    for (const label of [/Hadamard/, /Pauli-X/, /Pauli-Z/, /phase 90|Phase pi\/2/i, /phase 45|Phase pi\/4/i, /CNOT/, /Controlled-Z/, /Measure/i]) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('actually starts a keyboard drag on Space', async () => {
    // The real end-to-end check: a DndContext with a KeyboardSensor, then Space.
    render(<KeyboardPalette />);
    const tile = screen.getByRole('button', { name: /Hadamard/ });

    // The tile dims itself while it is the active drag. dnd-kit's KeyboardSensor
    // matches on event.code ('Space'/'Enter'), not event.key.
    expect(tile).toHaveStyle({ opacity: '1' });
    fireEvent.keyDown(tile, { code: 'Space', key: ' ' });
    await waitFor(() => expect(tile).toHaveStyle({ opacity: '0.6' }));

    // Arrow keys then move the pending drag rather than doing nothing.
    fireEvent.keyDown(document, { code: 'ArrowRight', key: 'ArrowRight' });
    fireEvent.keyDown(document, { code: 'ArrowDown', key: 'ArrowDown' });
    expect(tile).toHaveStyle({ opacity: '0.6' });
  });

  it('leaves Escape to dnd-kit so a pick-up in progress can be cancelled', () => {
    render(<GatePalette />);
    const tile = screen.getByRole('button', { name: /Hadamard/ });
    // Must not throw, and must not commit a gate.
    fireEvent.keyDown(tile, { key: 'Escape' });
    expect(useCircuitStore.getState().circuit.gates).toHaveLength(0);
  });
});

describe('gate placement is refused only where it should be', () => {
  it('keeps the palette inert without a pointer or keyboard drag', () => {
    render(<GatePalette onGateSelect={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Hadamard/ }));
    // Clicking a tile must not silently place or mutate anything.
    expect(useCircuitStore.getState().circuit.gates).toHaveLength(0);
    expect(simulateCircuit(useCircuitStore.getState().circuit).probabilities['00']).toBeCloseTo(1, 6);
  });
});
