import { Lesson, LessonStep, CheckSpec, Challenge, Circuit, FactsPacket } from '../types';
import { simulateCircuit } from './simulator';

export function getLessons(): Lesson[] {
  return [
    {
      id: 'L1',
      title: 'Superposition',
      order: 1,
      description: 'Learn how the Hadamard gate creates superposition',
      steps: [
        {
          id: 'L1S1',
          lesson_id: 'L1',
          order: 1,
          instruction: 'Drag an H gate onto qubit 0 to create superposition',
          check_spec: { type: 'probability', qubit_state: '0', target: { '0': 0.5, '1': 0.5 }, tol: 0.05 },
          tutor_context: 'The H gate rotates |0⟩ to the equator of the Bloch sphere, creating an equal superposition.',
        },
        {
          id: 'L1S2',
          lesson_id: 'L1',
          order: 2,
          instruction: 'Add a measurement to see the probabilities',
          check_spec: { type: 'probability', target: { '0': 0.5, '1': 0.5 }, tol: 0.05 },
          tutor_context: 'Measurement collapses the superposition. Over many shots, you should see ~50/50.',
        },
        {
          id: 'L1S3',
          lesson_id: 'L1',
          order: 3,
          instruction: 'Try adding an X gate before the H gate',
          check_spec: { type: 'probability', target: { '0': 0.5, '1': 0.5 }, tol: 0.05 },
          tutor_context: 'X|0⟩ = |1⟩, then H|1⟩ = (|0⟩-|1⟩)/√2. Still 50/50 but with a phase difference.',
        },
        {
          id: 'L1S4',
          lesson_id: 'L1',
          order: 4,
          instruction: 'Add an H gate on qubit 1 as well',
          check_spec: { type: 'probability', target: { '00': 0.25, '01': 0.25, '10': 0.25, '11': 0.25 }, tol: 0.05 },
          tutor_context: 'Two independent superpositions give four equally likely outcomes.',
        },
      ],
    },
    {
      id: 'L2',
      title: 'Entanglement',
      order: 2,
      description: 'Create and understand the Bell state',
      steps: [
        {
          id: 'L2S1',
          lesson_id: 'L2',
          order: 1,
          instruction: 'Start with H on qubit 0',
          check_spec: { type: 'probability', target: { '0': 0.5, '1': 0.5 }, tol: 0.05 },
          tutor_context: 'First, create superposition on the control qubit.',
        },
        {
          id: 'L2S2',
          lesson_id: 'L2',
          order: 2,
          instruction: 'Add a CNOT with qubit 0 as control and qubit 1 as target',
          check_spec: { type: 'entangled', qubits: [0, 1] },
          tutor_context: 'CNOT entangles the qubits. The state becomes (|00⟩+|11⟩)/√2 — the Bell state Φ⁺.',
        },
        {
          id: 'L2S3',
          lesson_id: 'L2',
          order: 3,
          instruction: 'Measure both qubits to see the correlation',
          check_spec: { type: 'probability', target: { '00': 0.5, '11': 0.5 }, tol: 0.05 },
          tutor_context: 'Measurement shows perfect correlation: both qubits always give the same result.',
        },
        {
          id: 'L2S4',
          lesson_id: 'L2',
          order: 4,
          instruction: 'Notice the Bloch vectors have shrunk — this indicates entanglement',
          check_spec: { type: 'entangled', qubits: [0, 1] },
          tutor_context: 'Entangled qubits have mixed reduced states. Their Bloch vectors have length < 1.',
        },
      ],
    },
    {
      id: 'L3',
      title: 'Interference',
      order: 3,
      description: 'Explore quantum interference with phase gates',
      steps: [
        {
          id: 'L3S1',
          lesson_id: 'L3',
          order: 1,
          instruction: 'Apply H to qubit 0, then Z, then H again',
          check_spec: { type: 'probability', target: { '0': 0, '1': 1 }, tol: 0.05 },
          tutor_context: 'HZH = X. The Z phase flip in the middle causes constructive interference for |1⟩.',
        },
        {
          id: 'L3S2',
          lesson_id: 'L3',
          order: 2,
          instruction: 'Replace Z with S and observe the result',
          check_spec: { type: 'probability', target: { '0': 0.5, '1': 0.5 }, tol: 0.05 },
          tutor_context: 'HS|+⟩ creates a different superposition with a 90° phase shift.',
        },
        {
          id: 'L3S3',
          lesson_id: 'L3',
          order: 3,
          instruction: 'Try H, T, H and compare with H, S, H',
          check_spec: { type: 'probability', target: { '0': 0.5, '1': 0.5 }, tol: 0.05 },
          tutor_context: 'T adds a 45° phase. H-T-H shows how phase gates affect interference patterns.',
        },
      ],
    },
  ];
}

export function getChallenges(): Challenge[] {
  return [
    {
      id: 'CH1',
      title: 'Prepare |1⟩',
      target_spec: { type: 'statevector', state: '|1⟩' },
      max_hints: 3,
      hints: [
        'Think about what gate flips |0⟩ to |1⟩',
        'The X gate (Pauli-X) acts like a quantum NOT gate',
        'Solution: Apply X gate to qubit 0',
      ],
    },
    {
      id: 'CH2',
      title: 'Prepare |+⟩',
      target_spec: { type: 'statevector', state: '|+⟩ = (|0⟩+|1⟩)/√2' },
      max_hints: 3,
      hints: [
        'The |+⟩ state is an equal superposition of |0⟩ and |1⟩',
        'The Hadamard gate H creates superposition from |0⟩',
        'Solution: Apply H gate to qubit 0',
      ],
    },
    {
      id: 'CH3',
      title: 'Prepare Bell State |Φ⁺⟩',
      target_spec: { type: 'statevector', state: '|Φ⁺⟩ = (|00⟩+|11⟩)/√2' },
      max_hints: 3,
      hints: [
        'The Bell state requires two qubits and entanglement',
        'First create superposition on one qubit, then use CNOT to entangle',
        'Solution: H on qubit 0, then CNOT with qubit 0 as control and qubit 1 as target',
      ],
    },
  ];
}

/**
 * Marginal probability of one qubit, keyed '0'/'1'.
 *
 * Qiskit order: qubit 0 is the right-most bit of a state key. Lesson steps and
 * challenge targets are written against a single wire ('0'/'1'), so they must be
 * compared with a marginal - looking the key up directly always misses once the
 * register is wider than one qubit.
 */
export function qubitMarginal(
  probabilities: Record<string, number>,
  numQubits: number,
  qubit: number
): Record<string, number> {
  const position = numQubits - 1 - qubit;
  const out: Record<string, number> = { '0': 0, '1': 0 };
  for (const [state, prob] of Object.entries(probabilities)) {
    const bit = state[position] === '1' ? '1' : '0';
    out[bit] = (out[bit] || 0) + prob;
  }
  return out;
}

/**
 * Checks a probability target written against either a single wire
 * (`{'0': 0.5, '1': 0.5}`) or the full distribution (`{'00': 0.5, '11': 0.5}`).
 * Single-wire targets are satisfied when ANY qubit's marginal matches, so a
 * step does not silently become impossible on a wider register.
 */
export function probabilitiesMatch(
  probabilities: Record<string, number>,
  numQubits: number,
  target: Record<string, number>,
  tol: number
): boolean {
  const keys = Object.keys(target);
  const onOneWire = keys.every((k) => k === '0' || k === '1');
  if (onOneWire) {
    for (let q = 0; q < numQubits; q++) {
      const marginal = qubitMarginal(probabilities, numQubits, q);
      if (Object.entries(target).every(([bit, value]) => Math.abs((marginal[bit] ?? 0) - value) <= tol)) {
        return true;
      }
    }
    return false;
  }
  if (keys.every((k) => k.length === numQubits)) {
    return Object.entries(target).every(([k, value]) => Math.abs((probabilities[k] ?? 0) - value) <= tol);
  }
  return false;
}

export function checkLessonStep(lessonId: string, stepId: string, circuit: Circuit): { passed: boolean; message: string } {
  const lessons = getLessons();
  const lesson = lessons.find(l => l.id === lessonId);
  if (!lesson) return { passed: false, message: 'Lesson not found' };

  const step = lesson.steps.find(s => s.id === stepId);
  if (!step) return { passed: false, message: 'Step not found' };

  // Simulate circuit to get state
  const result = simulateCircuit(circuit, 1024);
  const probs = result.probabilities;

  const check = step.check_spec;

  if (check.type === 'probability') {
    const target = check.target || {};
    const tol = check.tol ?? 0.05;
    const passed = probabilitiesMatch(probs, circuit.num_qubits, target, tol);
    return {
      passed,
      message: passed
        ? 'Step completed!'
        : `Probabilities don't match target. Expected ${JSON.stringify(target)}, got ${JSON.stringify(probs)}`,
    };
  }

  if (check.type === 'entangled') {
    const entangled = result.entangled_qubits;
    const required = check.qubits || [];
    const passed = required.every(q => entangled.includes(q));
    return {
      passed,
      message: passed ? 'Entanglement detected!' : `Required qubits ${required.join(', ')} not entangled. Entangled: ${entangled.join(', ')}`,
    };
  }

  return { passed: false, message: 'Unknown check type' };
}

/** Gate count that solves each challenge with no hints. MEASURE gates are free. */
const MINIMAL_GATES: Record<string, number> = { CH1: 1, CH2: 1, CH3: 2 };

/** Widest register each target needs: CH3 is a two-qubit Bell pair. */
const CHALLENGE_MIN_QUBITS: Record<string, number> = { CH1: 1, CH2: 1, CH3: 2 };

/**
 * Target states as basis-state indices in Qiskit order (bit q of the index is
 * qubit q, so index 1 is |...01> = qubit 0 excited).
 */
const CHALLENGE_TARGET_INDICES: Record<string, number[]> = {
  CH1: [1],
  CH2: [0, 1],
  CH3: [0, 3],
};

/** Qubits that actually carry gates, i.e. ignoring terminal MEASURE gates. */
function gateCount(circuit: Circuit): number {
  return circuit.gates.filter((gate) => gate.type !== 'MEASURE').length;
}

/**
 * |<psi|phi>|^2 against the challenge's target, which is a uniform superposition
 * of CHALLENGE_TARGET_INDICES. Global phase cancels in the modulus, so no phase
 * convention is needed - and because the comparison is a genuine statevector
 * overlap, a Bell state no longer satisfies the |+> challenge.
 */
function fidelityWithTarget(facts: FactsPacket, targetIndices: number[]): number {
  const dim = 1 << facts.num_qubits;
  const scale = 1 / Math.sqrt(targetIndices.length);
  let re = 0;
  let im = 0;
  for (const index of targetIndices) {
    if (index >= dim) return 0;
    const amplitude = facts.amplitudes[index.toString(2).padStart(facts.num_qubits, '0')];
    if (!amplitude) continue;
    // conj(<psi_i>) * phi_i, with phi_i real.
    re += amplitude.re * scale;
    im -= amplitude.im * scale;
  }
  return re * re + im * im;
}

/**
 * Which quantities to name when a challenge fails. Each entry is the label the
 * student sees, the actual value and the target value. Single-qubit targets
 * report the wire marginal, so '1' means "qubit 0 is 1" at any register width.
 */
function failureReport(facts: FactsPacket, challengeId: string) {
  const probs = facts.probabilities;
  const q0 = qubitMarginal(probs, facts.num_qubits, 0);
  const pct = (value: number) => `${(value * 100).toFixed(0)}%`;

  if (challengeId === 'CH1') {
    return [{ label: '1', actual: q0['1'], target: 1 }];
  }
  if (challengeId === 'CH2') {
    return [
      { label: '0', actual: q0['0'], target: 0.5 },
      { label: '1', actual: q0['1'], target: 0.5 },
    ];
  }
  return [
    { label: '00', actual: probs['00'] ?? 0, target: 0.5 },
    { label: '11', actual: probs['11'] ?? 0, target: 0.5 },
  ];
}

export function checkChallenge(
  challengeId: string,
  circuit: Circuit,
  hintsUsed = 0
): { passed: boolean; fidelity: number; message: string; score: number } {
  const challenges = getChallenges();
  const challenge = challenges.find(c => c.id === challengeId);
  if (!challenge) {
    return { passed: false, fidelity: 0, message: 'Challenge not found', score: 0 };
  }

  const result = simulateCircuit(circuit, 1024);
  const facts = result.facts;

  // Score never depends on passing: max(10, 100 - 10/hint - 5/extra gate).
  const extraGates = Math.max(0, gateCount(circuit) - (MINIMAL_GATES[challengeId] ?? 0));
  const score = Math.max(10, 100 - 10 * hintsUsed - 5 * extraGates);

  const needsQubits = CHALLENGE_MIN_QUBITS[challengeId] ?? 1;
  if (circuit.num_qubits < needsQubits) {
    return {
      passed: false,
      fidelity: 0,
      score,
      message: `This target needs ${needsQubits} qubits, but the circuit has ${circuit.num_qubits}. Add qubits in the Code tab.`,
    };
  }

  const fidelity = fidelityWithTarget(facts, CHALLENGE_TARGET_INDICES[challengeId]);
  const passed = fidelity >= 0.99;

  if (passed) {
    return {
      passed: true,
      fidelity,
      score,
      message: `Challenge passed! Fidelity: ${(fidelity * 100).toFixed(1)}%. Score: ${score}`,
    };
  }

  const detail = failureReport(facts, challengeId)
    .map((entry) => `Your P(${entry.label}) is ${(entry.actual * 100).toFixed(0)}%; target is ${(entry.target * 100).toFixed(0)}%.`)
    .join(' ');
  return {
    passed: false,
    fidelity,
    score,
    message: `Not yet. ${detail} Fidelity ${(fidelity * 100).toFixed(1)}% (need 99%). Target: ${challenge.target_spec.state}`,
  };
}

export function getHint(challengeId: string, hintLevel: number): string {
  const challenges = getChallenges();
  const challenge = challenges.find(c => c.id === challengeId);
  if (!challenge || hintLevel < 1 || hintLevel > challenge.hints.length) {
    return 'No hint available';
  }
  return challenge.hints[hintLevel - 1];
}