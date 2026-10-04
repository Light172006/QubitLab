import { Amplitude } from '../../types';

interface AmplitudeTableProps {
  amplitudes: Record<string, Amplitude>;
  probabilities: Record<string, number>;
  /** Intermediate level adds the raw real/imaginary parts. */
  level?: 'beginner' | 'intermediate';
}

export function AmplitudeTable({ amplitudes, probabilities, level = 'beginner' }: AmplitudeTableProps) {
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
                <td className="px-2 py-1.5 font-mono text-text">{state}</td>
                {level === 'intermediate' && (
                  <>
                    <td className="px-2 py-1.5 text-right font-mono text-text">{amp.re >= 0 ? '+' : ''}{amp.re.toFixed(4)}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-text">{amp.im >= 0 ? '+' : ''}{amp.im.toFixed(4)}</td>
                  </>
                )}
                <td className="px-2 py-1.5 text-right font-mono text-text">{magnitude.toFixed(4)}</td>
                <td className="px-2 py-1.5 text-right font-mono text-text">{phase.toFixed(1)}°</td>
                <td className="px-2 py-1.5 text-right font-mono font-semibold text-brand-text">{prob.toFixed(4)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
