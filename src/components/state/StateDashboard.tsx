import { FactsPacket, Circuit } from '../../types';
import { StatePanel } from './StatePanel';

interface StateDashboardProps {
  circuit?: Circuit;
  facts: FactsPacket | null;
  bitOrder: 'qiskit' | 'canvas';
  level?: 'beginner' | 'intermediate';
}

/**
 * The Live State section that fills the space below the circuit in the
 * centre column.
 *
 * A thin layout wrapper only: the card contents, the probability maths and
 * the Bloch rendering all live in StatePanel, so this stays a landmark
 * the tests can find by `aria-label="Live state"`.
 */
export function StateDashboard({
  circuit,
  facts,
  bitOrder,
  level = 'beginner',
}: StateDashboardProps) {
  return (
    <section aria-label="Live state" className="flex flex-col h-full min-h-0 bg-surface">
      <header className="flex items-center justify-between gap-2 px-4 pt-3 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-body font-semibold text-text">Live State</h2>
        </div>
        <p className="text-label text-muted text-center shrink-0">
          {bitOrder === 'qiskit'
            ? 'q1q0 — qubit 0 is the right-most bit (Qiskit order)'
            : 'q0q1 — qubit 0 is the left-most bit (Canvas order)'}
        </p>
      </header>

      {/* Live State content fills all remaining height */}
      <div className="flex-1 min-h-0 overflow-hidden px-4 pb-4">
        <StatePanel
          circuit={circuit}
          facts={facts}
          bitOrder={bitOrder}
          level={level}
        />
      </div>
    </section>
  );
}
