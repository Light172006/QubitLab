import { useEffect, useState } from 'react';
import { Gate } from '../../types';

export interface TwoQubitPlacement {
  gate: Gate;
  control: number;
}

/**
 * Tracks a CNOT/CZ that is waiting for its target wire.
 * Escape cancels the flow, so no ghost gate is left behind
 * when the user changes their mind mid-flow.
 */
export function useTwoQubitPlacement() {
  const [placingTwoQubit, setPlacingTwoQubit] = useState<TwoQubitPlacement | null>(null);

  useEffect(() => {
    if (!placingTwoQubit) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPlacingTwoQubit(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [placingTwoQubit]);

  return [placingTwoQubit, setPlacingTwoQubit] as const;
}
