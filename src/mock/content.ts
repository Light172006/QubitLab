import { Lesson, LessonStep, CheckSpec, Challenge } from '../types';
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

export function checkLessonStep(lessonId: string, stepId: string, circuit: any): { passed: boolean; message: string } {
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
    const tol = check.tol || 0.05;
    let passed = true;
    for (const [state, targetProb] of Object.entries(target)) {
      const actualProb = probs[state] || 0;
      if (Math.abs(actualProb - targetProb) > tol) {
        passed = false;
        break;
      }
    }
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

export function checkChallenge(challengeId: string, circuit: any): { passed: boolean; fidelity: number; message: string } {
  const challenges = getChallenges();
  const challenge = challenges.find(c => c.id === challengeId);
  if (!challenge) return { passed: false, fidelity: 0, message: 'Challenge not found' };

  const result = simulateCircuit(circuit, 1024);

  // Simplified fidelity check based on target state
  let fidelity = 0;
  let passed = false;

  if (challenge.id === 'CH1') {
    // |1⟩ - check if P(1) ≈ 1
    fidelity = result.probabilities['1'] || result.probabilities['01'] || result.probabilities['10'] || result.probabilities['11'] || 0;
    passed = fidelity >= 0.99;
  } else if (challenge.id === 'CH2') {
    // |+⟩ - check if P(0) ≈ P(1) ≈ 0.5
    const p0 = result.probabilities['0'] || result.probabilities['00'] || 0;
    const p1 = result.probabilities['1'] || result.probabilities['11'] || result.probabilities['01'] || result.probabilities['10'] || 0;
    fidelity = 1 - Math.abs(p0 - 0.5) - Math.abs(p1 - 0.5);
    passed = fidelity >= 0.99;
  } else if (challenge.id === 'CH3') {
    // Bell state - check if P(00) ≈ P(11) ≈ 0.5 and entangled
    const p00 = result.probabilities['00'] || 0;
    const p11 = result.probabilities['11'] || 0;
    fidelity = Math.min(p00, p11) * 2; // Simplified
    passed = fidelity >= 0.99 && result.entangled_qubits.length >= 2;
  }

  return {
    passed,
    fidelity,
    message: passed
      ? `Challenge passed! Fidelity: ${(fidelity * 100).toFixed(1)}%`
      : `Not yet. Fidelity: ${(fidelity * 100).toFixed(1)}%. Target: ${challenge.target_spec.state}`,
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