/**
 * Number formatting for the Live State readouts.
 *
 * Two failure modes the raw `toFixed` calls produced:
 *
 *  - negative zero. Simulator arithmetic on a state like H-T-H leaves
 *    bloch.x at -1.1e-16, and `(-1.1e-16).toFixed(2)` is "-0.00". Anything
 *    that rounds to zero is snapped to +0 first.
 *  - NaN / Infinity reaching the DOM. A non-finite value renders as an
 *    em dash instead, so a bad number is visibly wrong rather than a
 *    plausible-looking one.
 */

/** Snap anything that would round to zero, so no format can emit "-0". */
function snap(value: number, digits: number): number {
  const threshold = 0.5 * Math.pow(10, -digits);
  return Math.abs(value) < threshold ? 0 : value;
}

export function fixed(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '—';
  return snap(value, digits).toFixed(digits);
}

/** Real/imaginary amplitude part with an explicit sign: "+0.7071". */
export function signedFixed(value: number, digits = 4): string {
  if (!Number.isFinite(value)) return '—';
  const snapped = snap(value, digits);
  return `${snapped >= 0 ? '+' : ''}${snapped.toFixed(digits)}`;
}

/** Phase in degrees. */
export function degrees(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '—';
  return `${snap(value, digits).toFixed(digits)}°`;
}

/** A probability rendered as a whole-number percentage. */
export function percent(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '—';
  return `${snap(value * 100, digits).toFixed(digits)}%`;
}

/**
 * Reorder basis-state labels for the bit-order toggle. The simulator always
 * reports Qiskit order (qubit 0 is the right-most bit); canvas order is the
 * same strings read the other way. This only relabels - the physics, the
 * probabilities and the amplitudes are untouched.
 */
export function labelForState(state: string, bitOrder: 'qiskit' | 'canvas'): string {
  return bitOrder === 'qiskit' ? state : state.split('').reverse().join('');
}