import { FactsPacket, TutorEvent } from '../types';

const TEMPLATE_EXPLANATIONS: Record<string, (facts: FactsPacket) => string> = {
  'H': (facts) => {
    const probs = facts.probabilities;
    const p0 = probs['0'] || probs['00'] || 0;
    const p1 = probs['1'] || probs['11'] || probs['01'] || probs['10'] || 0;
    if (facts.level === 'beginner') {
      return `H (Hadamard) puts the qubit into an equal superposition. You now have a ${(p0 * 100).toFixed(0)}% chance of measuring 0 and a ${(p1 * 100).toFixed(0)}% chance of measuring 1. The Bloch vector rotated to point along the X axis.`;
    }
    return `Hadamard gate applied: H|0⟩ = (|0⟩+|1⟩)/√2. Probabilities: P(0)=${p0.toFixed(4)}, P(1)=${p1.toFixed(4)}. Bloch vector: (1, 0, 0).`;
  },
  'X': (facts) => {
    if (facts.level === 'beginner') {
      return `X (Pauli-X) flips the qubit state. It acts like a classical NOT gate: |0⟩ becomes |1⟩ and vice versa. The Bloch vector rotated 180° around the X axis.`;
    }
    return `X gate applied: X|0⟩ = |1⟩. Probability of |1⟩ is 1.0. Bloch vector: (-1, 0, 0) — inverted on Z axis.`;
  },
  'Z': (facts) => {
    if (facts.level === 'beginner') {
      return `Z (Pauli-Z) flips the phase of the |1⟩ component. It leaves |0⟩ unchanged but adds a minus sign to |1⟩. On the Bloch sphere, this is a 180° rotation around the Z axis.`;
    }
    return `Z gate applied: Z|ψ⟩ flips the relative phase. Probabilities unchanged. Bloch vector Z component inverted.`;
  },
  'S': (facts) => {
    if (facts.level === 'beginner') {
      return `S adds a 90° phase shift to the |1⟩ component. It's the square root of Z. On the Bloch sphere, this rotates the vector 90° around the Z axis.`;
    }
    return `S gate applied: phase shift of π/2 on |1⟩. Bloch vector rotated 90° around Z axis.`;
  },
  'T': (facts) => {
    if (facts.level === 'beginner') {
      return `T adds a 45° phase shift to the |1⟩ component. It's the square root of S. On the Bloch sphere, this rotates the vector 45° around the Z axis.`;
    }
    return `T gate applied: phase shift of π/4 on |1⟩. Bloch vector rotated 45° around Z axis.`;
  },
  'CNOT': (facts) => {
    const entangled = facts.entangled_qubits.length > 0;
    if (facts.level === 'beginner') {
      if (entangled) {
        return `CNOT flips the target qubit only when the control is |1⟩. Since the control was in superposition, the pair is now entangled: you get |00⟩ or |11⟩ with 50% each. Neither qubit has a definite state alone — that's why the Bloch arrows shrank.`;
      }
      return `CNOT flips the target qubit only when the control is |1⟩. The control qubit determines whether the X gate is applied to the target.`;
    }
    return `CNOT applied with control on q${facts.action.controls?.[0]} and target on q${facts.action.targets?.[0]}. ${entangled ? 'Entanglement created.' : 'Classical correlation.'}`;
  },
  'CZ': (facts) => {
    if (facts.level === 'beginner') {
      return `CZ applies a phase flip (Z) to the target only when both qubits are |1⟩. It's symmetric — control and target are interchangeable.`;
    }
    return `CZ gate applied: controlled-Z phase flip. Symmetric in control/target.`;
  },
  'MEASURE': (facts) => {
    if (facts.level === 'beginner') {
      return `Measurement collapses the superposition to a definite outcome. Over many shots, you'll see the probabilities play out as a histogram.`;
    }
    return `Measurement in computational basis. State collapses to basis states with Born rule probabilities.`;
  },
};

const GENERIC_EXPLANATIONS: Record<string, (facts: FactsPacket) => string> = {
  'add_gate': (facts) => {
    const gate = facts.action.gate || 'gate';
    const template = TEMPLATE_EXPLANATIONS[gate];
    if (template) return template(facts);
    return `A ${gate} gate was applied. The state updated accordingly.`;
  },
  'remove_gate': () => `A gate was removed. The state reverted to the previous configuration.`,
  'move_gate': () => `A gate was moved to a different position. The circuit execution order changed.`,
  'reset': () => `The circuit was reset. All qubits are back in the |0⟩ state.`,
  'code_edit': () => `The code was updated and the circuit was regenerated.`,
};

/**
 * Off-topic guard for the ask box.
 *
 * The old keyword list contained the bare letters 'h', 'x', 'z', 's' and 't'
 * and matched with `includes`, so "what is the weather?" contained an 'h' and
 * was answered as a circuit question. Matching whole words against real
 * quantum vocabulary sends a weather question to the redirect while
 * "why does H give 50%" still gets a grounded answer.
 */
const QUANTUM_TERMS = new RegExp(
  [
    '\\bqubits?\\b', '\\bgates?\\b', '\\bhadamard\\b', '\\bpauli\\b', '\\bcnot\\b', '\\bcz\\b',
    '\\bswap\\b', '\\bmeasure\\w*\\b', '\\bentangl\\w*\\b', '\\bsuperposition\\b',
    '\\bphase\\b', '\\bamplitude\\b', '\\bprobabilit\\w*\\b', '\\bcircuit\\b', '\\bquantum\\b',
    '\\bbloch\\b', '\\bket\\b', '\\bbra\\b', '\\bstatevector\\b', '\\bshots?\\b',
    '\\bteleport\\w*\\b', '\\binterference\\b', '\\breversible\\b', '\\bbackend\\b',
    '\\bsimulat\\w*\\b', '\\bq\\d+\\b', '\\bnot\\b', '\\bstabilis[er]+\\b', '\\bstate\\b',
    // Bare gate letters, but only as whole words. No space in the class: a
    // space is a word boundary on both sides, so "\b \b" matches any space.
    '\\b[hxzs]\\b', '\\br[xyz]\\b',
  ].join('|'),
  'i'
);

export function isOffTopic(question: string): boolean {
  return !QUANTUM_TERMS.test(question);
}

/** Splits text into stream-sized chunks, preserving word boundaries. */
function chunkWords(text: string, size = 3): string[] {
  const words = text.split(' ');
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += size) {
    chunks.push(words.slice(i, i + size).join(' ') + ' ');
  }
  return chunks;
}

/** A question the tutor cannot use: say so and point back at the circuit. */
function askRedirect(facts: FactsPacket, level: 'beginner' | 'intermediate'): string {
  const head = level === 'beginner'
    ? 'I am a circuit tutor, so I cannot help with that one.'
    : 'That question is outside circuit simulation, which is the scope I cover.';
  return `${head} I can explain the state of this ${facts.num_qubits}-qubit circuit, or how a specific gate changed it. For example: "why does q0 sit at 50%?" or "what did that last gate do?"`;
}

export async function* generateExplanation(facts: FactsPacket, _level: 'beginner' | 'intermediate'): AsyncGenerator<TutorEvent> {
  // Simulate LLM delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Mock mode has no tutor backend, so this template stream *is* the fallback
  // path. The old code picked it at random (Math.random() < 0.2) while emitting
  // byte-identical text either way, which made the Offline badge appear at
  // random and mean nothing. Reporting the path truthfully keeps it a signal.
  const template = GENERIC_EXPLANATIONS[facts.action.type] || (() => 'The circuit was modified.');
  const explanation = template(facts);

  yield { type: 'fallback', content: explanation, is_fallback: true };

  // Stream the explanation
  const words = explanation.split(' ');
  for (let i = 0; i < words.length; i += 3) {
    yield { type: 'token', content: words.slice(i, i + 3).join(' ') + ' ' };
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  yield { type: 'done' };
}

export async function* answerQuestion(question: string, facts: FactsPacket, level: 'beginner' | 'intermediate'): AsyncGenerator<TutorEvent> {
  await new Promise(resolve => setTimeout(resolve, 1000));

  const q = question.toLowerCase();

  if (isOffTopic(q)) {
    for (const chunk of chunkWords(askRedirect(facts, level))) {
      yield { type: 'token', content: chunk };
      await new Promise(resolve => setTimeout(resolve, 40));
    }
    yield { type: 'done' };
    return;
  }

  // Simple grounded answers based on facts
  let answer = '';

  if (q.includes('why') && (q.includes('arrow') || q.includes('bloch') || q.includes('shrink'))) {
    if (facts.entangled_qubits.length > 0) {
      answer = `The Bloch vectors shrunk because the qubits became entangled. When qubits are entangled, each individual qubit is in a mixed state (not pure), so its Bloch vector has length < 1. The purity values are: ${facts.bloch.map(b => `q${b.q}=${b.purity.toFixed(2)}`).join(', ')}.`;
    } else {
      answer = `The Bloch vector length is ${facts.bloch[0]?.purity.toFixed(2) || '1.00'}. It shrinks when the qubit is in a mixed state or entangled.`;
    }
  } else if (q.includes('probabilit') || q.includes('50') || q.includes('chance')) {
    const probs = Object.entries(facts.probabilities).map(([s, p]) => `${s}: ${(p * 100).toFixed(0)}%`).join(', ');
    answer = `The current probabilities are: ${probs}. These come from the Born rule: probability = |amplitude|².`;
  } else if (q.includes('entangl')) {
    if (facts.entangled_qubits.length > 0) {
      answer = `Yes, qubits ${facts.entangled_qubits.join(', ')} are entangled. Their joint state cannot be written as a product of individual states. The fidelity with a separable state would be < 1.`;
    } else {
      answer = `No entanglement detected currently. All qubits have purity ≈ 1. Try adding a CNOT after a Hadamard to create entanglement.`;
    }
  } else if (q.includes('what') && (q.includes('gate') || q.includes('did'))) {
    const gate = facts.action.gate || 'the last gate';
    answer = `The last action was: ${facts.action.type} with ${gate}. This transformed the state from the previous probabilities to the current ones.`;
  } else {
    answer = `Based on the current state: ${Object.keys(facts.probabilities).length} basis states have non-zero probability. Qubits ${facts.entangled_qubits.join(', ') || 'none'} are entangled. What specifically would you like to know?`;
  }

  if (level === 'beginner') {
    answer = answer.replace(/fidelity/gi, 'overlap').replace(/mixed state/gi, 'not a definite state').replace(/Born rule/gi, 'probability rule');
  }

  for (const chunk of chunkWords(answer)) {
    yield { type: 'token', content: chunk };
    await new Promise(resolve => setTimeout(resolve, 40));
  }

  yield { type: 'done' };
}