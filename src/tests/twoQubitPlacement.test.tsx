import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useTwoQubitPlacement } from '../components/canvas/useTwoQubitPlacement';

function Harness() {
  const [placing, setPlacing] = useTwoQubitPlacement();
  return (
    <div>
      <span data-testid="placing">
        {placing ? `${placing.gate.type}:${placing.control}` : 'none'}
      </span>
      <button
        type="button"
        onClick={() =>
          setPlacing({
            gate: { id: 'g1', type: 'CNOT', targets: [0], controls: [], column: 1 },
            control: 0,
          })
        }
      >
        start
      </button>
    </div>
  );
}

describe('C2 Escape cancels a pending two-qubit placement', () => {
  it('clears the pending gate on Escape', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('start'));
    expect(screen.getByTestId('placing').textContent).toBe('CNOT:0');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByTestId('placing').textContent).toBe('none');
  });

  it('ignores other keys', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('start'));
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(screen.getByTestId('placing').textContent).toBe('CNOT:0');
  });

  it('adds no listener while no placement is pending', () => {
    render(<Harness />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByTestId('placing').textContent).toBe('none');
  });
});
