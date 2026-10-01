import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FactsPacket } from '../../types';
import { BlochSphere } from './BlochSphere';
import { AmplitudeTable } from './AmplitudeTable';
import { HistogramPanel } from './HistogramPanel';
import { ChevronDown, ChevronUp, BarChart2, Calculator, Layers } from 'lucide-react';

interface StatePanelProps {
  circuit: any;
  facts: FactsPacket | null;
  bitOrder: 'qiskit' | 'canvas';
}

export function StatePanel({ facts, bitOrder }: StatePanelProps) {
  const [showAmplitudes, setShowAmplitudes] = useState(false);
  const [showBloch, setShowBloch] = useState(true);

  if (!facts) {
    return (
      <div className="p-6 text-center text-muted">
        <BarChart2 className="w-12 h-12 mx-auto mb-3 text-muted" aria-hidden="true" />
        <p>Drag a gate onto a wire to begin</p>
        <p className="text-label mt-1">Try <span className="font-mono text-brand-text">H</span> on q0</p>
      </div>
    );
  }

  const probabilities = facts.probabilities;
  const prevProbabilities = facts.prev_probabilities || {};
  const entangledQubits = facts.entangled_qubits || [];
  const bloch = facts.bloch || [];

  const sortedStates = Object.entries(probabilities)
    .sort(([a], [b]) => {
      if (bitOrder === 'qiskit') return a.localeCompare(b);
      return b.localeCompare(a);
    })
    .filter(([stateKey, v]) => v > 0.001 || (prevProbabilities as any)[stateKey] > 0.001);

  const getBarColor = (_state: string) => {
    if (entangledQubits.length > 0) return '#6B4E8E';
    return '#0070C0';
  };

  const hasChanged = (stateKey: string) => {
    const prev = (prevProbabilities as any)[stateKey] || 0;
    const curr = probabilities[stateKey] || 0;
    return Math.abs(curr - prev) > 0.01;
  };

  return (
    <div className="p-4 space-y-6">
      {/* Probability Bars */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-text flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-brand" />
            Probabilities
          </h3>
          <span className="text-label font-medium text-muted">{Object.keys(probabilities).length} states</span>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
          {sortedStates.map(([state, prob]) => {
            const changed = hasChanged(state);
            return (
              <div
                key={state}
                className={`flex items-center gap-3 ${changed ? 'animate-pulse-once' : ''}`}
              >
                <span className="w-16 font-mono text-label text-text">{bitOrder === 'qiskit' ? state : state.split('').reverse().join('')}</span>
                <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden relative">
                  <div
                    className="h-full rounded transition-all duration-250"
                    style={{
                      width: `${prob * 100}%`,
                      backgroundColor: getBarColor(state),
                    }}
                  />
                  {changed && (
                    <div className="absolute inset-0 bg-white/50 animate-pulse-once pointer-events-none" />
                  )}
                </div>
                <span className="w-12 text-right font-mono text-label text-text">{prob.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
        <p className="text-label text-muted text-center mt-2">
          q1q0 — qubit 0 is the right-most bit (Qiskit order)
        </p>
      </section>

      {/* Bloch Spheres */}
      {showBloch && bloch.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-text flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple" aria-hidden="true" />
              Bloch Spheres
            </h3>
            <button
              onClick={() => setShowBloch(false)}
              className="p-1 rounded text-label font-medium text-muted hover:text-text" aria-label="Hide Bloch spheres"
            >
              <ChevronUp className="w-3.5 h-3.5 inline" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {bloch.map((b) => (
              <div key={b.q} className="flex-shrink-0 flex flex-col items-center">
                <BlochSphere bloch={b} isEntangled={entangledQubits.includes(b.q)} />
                <p className="text-label font-medium text-muted mt-1">q{b.q}</p>
                <p className="font-mono text-label text-muted">
                  ({b.x.toFixed(2)}, {b.y.toFixed(2)}, {b.z.toFixed(2)}) p={b.purity.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Amplitudes Table */}
      <section>
        <button
          onClick={() => setShowAmplitudes(!showAmplitudes)}
          className="flex items-center gap-2 w-full mb-3"
        >
          <h3 className="font-medium text-text flex items-center gap-2">
            <Calculator className="w-4 h-4 text-accent-text-teal" aria-hidden="true" />
            Amplitudes
          </h3>
          <span className="ml-auto">{showAmplitudes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
        </button>
        {showAmplitudes && (
          <AmplitudeTable amplitudes={facts.amplitudes} probabilities={probabilities} />
        )}
      </section>

      {/* Histogram (after measurement) */}
      {(facts as any).counts && Object.keys((facts as any).counts).length > 0 && (() => {
        const counts = (facts as any).counts as Record<string, number>;
        const totalShots = Object.values(counts).reduce((sum: number, val: number) => sum + val, 0);
        return (
          <section>
            <h3 className="font-medium text-text flex items-center gap-2 mb-3">
              <BarChart2 className="w-4 h-4 text-green" aria-hidden="true" />
              Measurement Histogram ({totalShots} shots)
            </h3>
            <HistogramPanel counts={counts} />
          </section>
        );
      })()}
    </div>
  );
}