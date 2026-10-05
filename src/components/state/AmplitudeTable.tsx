import { Amplitude } from '../../types';
import { signedFixed, degrees, fixed, labelForState } from '../../lib/format';

interface AmplitudeTableProps {
  amplitudes: Record<string, Amplitude>;
  probabilities: Record<string, number>;
  /** Intermediate level adds the raw real/imaginary parts. */
  level?: 'beginner' | 'intermediate';
  /** Relabels the basis states; the values are identical either way. */
  bitOrder?: 'qiskit' | 'canvas';
}

export function AmplitudeTable({ amplitudes, probabilities, level = 'beginner', bitOrder = 'qiskit' }: AmplitudeTableProps) {
  const rows = Object.entries(amplitudes)
    .filter(([, amp]) => Math.abs(amp.re) > 0.001 || Math.abs(amp.im) > 0.001)
    .sort(([a], [b]) => a.localeCompare(b));

  if (rows.length === 0) {
    return <p className="text-sm text-muted text-center py-4">No significant amplitudes</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-label border border-gray-200 rounded-lg overflow-hidden">
        <caption className="sr-only">State amplitudes, phases and probabilities</caption>
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th scope="col" className="px-2 py-1.5 text-left font-semibold text-muted">State</th>
            {level === 'intermediate' && (
              <>
                <th scope="col" className="px-2 py-1.5 text-right font-semibold text-muted">Real</th>
                <th scope="col" className="px-2 py-1.5 text-right font-semibold text-muted">Imag</th>
              </>
            )}
            <th scope="col" className="px-2 py-1.5 text-right font-semibold text-muted">Magnitude</th>
            <th scope="col" className="px-2 py-1.5 text-right font-semibold text-muted">Phase (°)</th>
            <th scope="col" className="px-2 py-1.5 text-right font-semibold text-muted">|α|²</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([state, amp]) => {
            const phase = Math.atan2(amp.im, amp.re) * 180 / Math.PI;
            const magnitude = Math.hypot(amp.re, amp.im);
            const prob = probabilities[state] || 0;
            return (
              <tr key={state} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-2 py-1.5 font-mono text-text">{labelForState(state, bitOrder)}</td>
                {level === 'intermediate' && (
                  <>
                    <td className="px-2 py-1.5 text-right font-mono text-text">{signedFixed(amp.re)}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-text">{signedFixed(amp.im)}</td>
                  </>
                )}
                <td className="px-2 py-1.5 text-right font-mono text-text">{fixed(magnitude, 4)}</td>
                <td className="px-2 py-1.5 text-right font-mono text-text">{degrees(phase)}</td>
                <td className="px-2 py-1.5 text-right font-mono font-semibold text-brand-text">{fixed(prob, 4)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
