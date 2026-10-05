import { useState, type ReactNode } from 'react';
import { FactsPacket, Circuit } from '../../types';
import { BlochSphere } from './BlochSphere';
import { AmplitudeTable } from './AmplitudeTable';
import { HistogramPanel } from './HistogramPanel';
import { ChevronUp, BarChart2, Calculator, Layers, Eye, EyeOff, BarChart } from 'lucide-react';
import { fixed, labelForState } from '../../lib/format';

interface StatePanelProps {
  circuit?: Circuit;
  facts: FactsPacket | null;
  bitOrder: 'qiskit' | 'canvas';
  level?: 'beginner' | 'intermediate';
}

/** How many probability rows to show before the "Show all" toggle appears. */
const MAX_VISIBLE_ROWS = 8;

/** Card shell shared by every block in the grid. */
function Card({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col min-w-0 h-full p-4 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
        <h3 className="text-[14px] font-semibold text-text flex items-center gap-2 min-w-0">
          {icon}
          {title}
        </h3>
        {action}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {children}
      </div>
    </section>
  );
}

export function StatePanel({
  circuit,
  facts,
  bitOrder,
  level = 'beginner',
}: StatePanelProps) {
  const [showBloch, setShowBloch] = useState(true);
  const [showAllProbs, setShowAllProbs] = useState(false);
  const [probTab, setProbTab] = useState<'probs' | 'shots'>('probs');

  if (!facts) {
    const numQubits = circuit?.num_qubits ?? 2;
    const zeroState = '0'.repeat(numQubits);

    return (
      <div className="h-full flex flex-col items-center justify-center text-center text-muted bg-white border border-gray-200 rounded-lg p-6">
        <BarChart2 className="w-12 h-12 mb-3 text-muted" aria-hidden="true" />
        <p className="text-body text-text font-medium">Add a gate to see how the state changes.</p>
        <p className="text-label text-muted mt-1">
          Try <span className="font-mono text-brand-text">H</span> on q0
        </p>
        {/* Show the |0...0⟩ baseline bar even for an empty circuit. */}
        <div className="mt-4 max-w-xs mx-auto w-full">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-16 font-mono text-label text-text shrink-0">{zeroState}</span>
            <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden relative min-w-0">
              <div className="h-full rounded bg-brand" style={{ width: '100%' }} />
            </div>
            <span className="w-12 text-right font-mono text-label text-text shrink-0">1.00</span>
          </div>
          <p className="text-label text-muted mt-1">
            {bitOrder === 'qiskit'
              ? 'q1q0 — qubit 0 is the right-most bit (Qiskit order)'
              : 'q0q1 — qubit 0 is the left-most bit (Canvas order)'}
          </p>
        </div>
      </div>
    );
  }

  const probabilities = facts.probabilities;
  const prevProbabilities = facts.prev_probabilities || {};
  const entangledQubits = facts.entangled_qubits || [];
  const bloch = facts.bloch || [];
  const counts = (facts as FactsPacket & { counts?: Record<string, number> }).counts;
  const hasMeasure = !!counts && Object.keys(counts).length > 0;

  const sortedStates = Object.entries(probabilities)
    .sort(([a], [b]) => {
      if (bitOrder === 'qiskit') return a.localeCompare(b);
      return b.localeCompare(a);
    })
    .filter(([stateKey, v]) => v > 0.001 || (prevProbabilities as Record<string, number>)[stateKey] > 0.001);

  const visibleStates = showAllProbs ? sortedStates : sortedStates.slice(0, MAX_VISIBLE_ROWS);
  const hasMoreStates = sortedStates.length > MAX_VISIBLE_ROWS;

  const getBarColor = (_state: string) => {
    if (entangledQubits.length > 0) return '#6B4E8E';
    return '#0070C0';
  };

  const hasChanged = (stateKey: string) => {
    const prev = (prevProbabilities as Record<string, number>)[stateKey] || 0;
    const curr = probabilities[stateKey] || 0;
    return Math.abs(curr - prev) > 0.01;
  };

  const isZeroProb = (stateKey: string) => probabilities[stateKey] <= 0.001;

  // Shots tab content - computed outside the ternary to avoid nesting issues.
  const shotsTabContent = hasMeasure && counts ? (
    <HistogramPanel counts={counts} bitOrder={bitOrder} />
  ) : (
    <div className="text-center py-8 text-muted">
      <BarChart className="w-8 h-8 mx-auto mb-2" aria-hidden="true" />
      <p className="text-body text-text font-medium">Add a Measure (M) gate to see shot results</p>
    </div>
  );

  return (
    // Cards wrap responsively: two per row at 1440 with the dock open,
    // one column below 1100.
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', height: '100%', minHeight: 0 }}>
      {/* Card 1: Probabilities with tabs */}
      <Card
        title="Probabilities"
        icon={<BarChart2 className="w-4 h-4 text-brand" aria-hidden="true" />}
        action={
          <span className="text-label font-medium text-muted shrink-0">
            {Object.keys(probabilities).length} {Object.keys(probabilities).length === 1 ? 'state' : 'states'}
          </span>
        }
      >
        {/* Tabs */}
        <div className="flex gap-1 mb-3 shrink-0" role="tablist" aria-label="Probability view">
          <button
            role="tab"
            aria-selected={probTab === 'probs'}
            onClick={() => setProbTab('probs')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              probTab === 'probs'
                ? 'bg-navy text-white'
                : 'text-muted hover:text-text hover:bg-gray-100'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />
            Probabilities
          </button>
          <button
            role="tab"
            aria-selected={probTab === 'shots'}
            onClick={() => setProbTab('shots')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              probTab === 'shots'
                ? 'bg-navy text-white'
                : 'text-muted hover:text-text hover:bg-gray-100'
            }`}
          >
            <BarChart className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />
            Shots
          </button>
        </div>

        {probTab === 'probs' ? (
          <div className="space-y-2">
            {visibleStates.map(([state, prob]) => {
              const changed = hasChanged(state);
              const zeroProb = isZeroProb(state);
              return (
                <div
                  key={state}
                  className={`flex items-center gap-3 ${changed ? 'animate-pulse-once' : ''} ${zeroProb ? 'opacity-40' : ''}`}
                >
                  <span className="w-16 font-mono text-label text-text shrink-0">
                    {labelForState(state, bitOrder)}
                  </span>
                  <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden relative min-w-0">
                    <div
                      className="h-full rounded transition-all duration-300"
                      style={{
                        width: `${prob * 100}%`,
                        backgroundColor: getBarColor(state),
                      }}
                    />
                    {changed && (
                      <div className="absolute inset-0 bg-white/50 animate-pulse-once pointer-events-none" />
                    )}
                  </div>
                  <span className="w-12 text-right font-mono text-label text-text shrink-0">
                    {fixed(prob)}
                  </span>
                </div>
              );
            })}

            {hasMoreStates && (
              <button
                type="button"
                onClick={() => setShowAllProbs(!showAllProbs)}
                className="mt-2 inline-flex items-center gap-1 text-label font-medium text-brand-text hover:underline"
              >
                {showAllProbs ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                    Show fewer
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                    Show all {sortedStates.length}
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          /* Shots tab */
          shotsTabContent
        )}
      </Card>

      {/* Card 2: Amplitudes - always expanded */}
      <Card
        title="Amplitudes"
        icon={<Calculator className="w-4 h-4 text-accent-text-teal" aria-hidden="true" />}
      >
        <AmplitudeTable
          amplitudes={facts.amplitudes}
          probabilities={probabilities}
          level={level}
          bitOrder={bitOrder}
        />
      </Card>

      {/* Card 3: Bloch Spheres */}
      {showBloch && bloch.length > 0 && (
        <Card
          title="Bloch Spheres"
          icon={<Layers className="w-4 h-4 text-purple" aria-hidden="true" />}
          action={
            <button
              type="button"
              onClick={() => setShowBloch(false)}
              className="p-1 rounded text-label font-medium text-muted hover:text-text"
              aria-label="Hide Bloch spheres"
            >
              <ChevronUp className="w-3.5 h-3.5 inline" aria-hidden="true" />
            </button>
          }
        >
          {/* Wrapping grid: one sphere per qubit, wraps to multiple rows */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: '0.75rem' }}>
            {bloch.map((b) => (
              <div key={b.q} className="flex flex-col items-center text-center min-w-0">
                <BlochSphere
                  bloch={b}
                  isEntangled={entangledQubits.includes(b.q)}
                />
                <p className="text-label font-medium text-muted mt-1">q{b.q}</p>
                <p className="font-mono text-label text-muted break-words">
                  ({fixed(b.x)}, {fixed(b.y)}, {fixed(b.z)}) p={fixed(b.purity)}
                </p>
                {entangledQubits.includes(b.q) && (
                  <span className="mt-1 px-1.5 py-0.5 text-[11px] font-medium rounded-full bg-orange-tint text-accent-text-orange">
                    entangled
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
