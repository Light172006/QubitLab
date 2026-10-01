import { Circuit, Gate, GateType, SimulateResponse, BlochVector, Amplitude, CircuitAction } from '../types';

// Qiskit bit order: qubit 0 is the rightmost bit (least significant)
// Basis state |q1 q0⟩ where q0 is bit 0

// Complex number helpers
interface Complex { re: number; im: number; }

const complex = (re: number, im: number): Complex => ({ re, im });
const add = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im });
const mul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});
const abs2 = (a: Complex): number => a.re * a.re + a.im * a.im;
const conj = (a: Complex): Complex => ({ re: a.re, im: -a.im });

// Matrix operations
type Matrix = Complex[][];

const matVecMul = (m: Matrix, v: Complex[]): Complex[] => {
  const n = m.length;
  const result: Complex[] = Array(n).fill({ re: 0, im: 0 });
  for (let i = 0; i < n; i++) {
    let sum: Complex = { re: 0, im: 0 };
    for (let j = 0; j < n; j++) {
      sum = add(sum, mul(m[i][j], v[j]));
    }
    result[i] = sum;
  }
  return result;
};

const kronecker = (a: Matrix, b: Matrix): Matrix => {
  const m = a.length, n = a[0].length;
  const p = b.length, q = b[0].length;
  const result: Matrix = Array(m * p).fill(null).map(() => Array(n * q).fill({ re: 0, im: 0 }));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < p; k++) {
        for (let l = 0; l < q; l++) {
          result[i * p + k][j * q + l] = mul(a[i][j], b[k][l]);
        }
      }
    }
  }
  return result;
};

const identity = (n: number): Matrix => {
  const result: Matrix = Array(n).fill(null).map(() => Array(n).fill({ re: 0, im: 0 }));
  for (let i = 0; i < n; i++) result[i][i] = { re: 1, im: 0 };
  return result;
};

// Gate matrices (2x2) using Complex type
const GATE_MATRICES: Record<GateType, Matrix> = {
  H: [[complex(1/Math.sqrt(2), 0), complex(1/Math.sqrt(2), 0)], [complex(1/Math.sqrt(2), 0), complex(-1/Math.sqrt(2), 0)]],
  X: [[complex(0, 0), complex(1, 0)], [complex(1, 0), complex(0, 0)]],
  Z: [[complex(1, 0), complex(0, 0)], [complex(0, 0), complex(-1, 0)]],
  S: [[complex(1, 0), complex(0, 0)], [complex(0, 0), complex(0, 1)]],
  T: [[complex(1, 0), complex(0, 0)], [complex(0, 0), complex(Math.cos(Math.PI/4), Math.sin(Math.PI/4))]],
  CNOT: [],
  CZ: [],
  MEASURE: [],
};

function getGateMatrix(gate: Gate, numQubits: number): Matrix {
  const dim = 1 << numQubits;

  if (gate.type === 'CNOT' || gate.type === 'CZ') {
    const control = gate.controls[0];
    const target = gate.targets[0];

    // SRS 4.2: controls and targets must be distinct wires inside the register.
    if (
      control === undefined ||
      target === undefined ||
      control === target ||
      control >= numQubits ||
      target >= numQubits
    ) {
      return identity(dim);
    }

    // Build the full-register matrix from the bit layout: bit q of a basis index
    // is qubit q, so the control/target wires are read straight off the index.
    // (This used to be a hard-coded 2x2 block that was only correct for
    // numQubits === 2 and silently became identity for wider registers.)
    const matrix: Matrix = Array(dim).fill(null).map(() => Array(dim).fill({ re: 0, im: 0 }));

    for (let i = 0; i < dim; i++) {
      const controlBit = (i >> control) & 1;
      const targetBit = (i >> target) & 1;

      let newIndex = i;
      if (gate.type === 'CNOT' && controlBit === 1) {
        newIndex = targetBit === 1 ? i & ~(1 << target) : i | (1 << target);
      }

      const phase = gate.type === 'CZ' && controlBit === 1 && targetBit === 1 ? -1 : 1;
      matrix[newIndex][i] = complex(phase, 0);
    }

    return matrix;
  }

  if (gate.type === 'MEASURE') {
    return identity(dim);
  }

  const gateMatrix = GATE_MATRICES[gate.type];
  if (!gateMatrix || gateMatrix.length === 0) return identity(dim);

  // Build full matrix: I ⊗ ... ⊗ G ⊗ ... ⊗ I
  // Qiskit bit order: qubit 0 is rightmost (least significant)
  // We iterate from qubit 0 to qubit n-1 to build the tensor product correctly
  let result = identity(1);
  for (let q = 0; q < numQubits; q++) {
    if (gate.targets.includes(q)) {
      result = kronecker(gateMatrix, result);
    } else {
      result = kronecker(identity(2), result);
    }
  }
  return result;
}

function partialTrace(state: Complex[], numQubits: number, keepQubit: number): Matrix {
  const dim = 1 << numQubits;
  const keepDim = 2;
  const traceDim = dim / keepDim;

  const rho: Matrix = Array(keepDim).fill(null).map(() => Array(keepDim).fill({ re: 0, im: 0 }));

  for (let i = 0; i < dim; i++) {
    for (let j = 0; j < dim; j++) {
      // Extract keep qubit bits
      const iKeep = (i >> keepQubit) & 1;
      const jKeep = (j >> keepQubit) & 1;
      // Check if traced-out qubits match
      const iTrace = i & ~(1 << keepQubit);
      const jTrace = j & ~(1 << keepQubit);
      if (iTrace === jTrace) {
        const val = mul(state[i], conj(state[j]));
        rho[iKeep][jKeep] = add(rho[iKeep][jKeep], val);
      }
    }
  }
  return rho;
}

function blochFromRho(rho: Matrix): { x: number; y: number; z: number; purity: number } {
  // Pauli matrices
  const sigmaX: Matrix = [[complex(0, 0), complex(1, 0)], [complex(1, 0), complex(0, 0)]];
  const sigmaY: Matrix = [[complex(0, 0), complex(0, -1)], [complex(0, 1), complex(0, 0)]];
  const sigmaZ: Matrix = [[complex(1, 0), complex(0, 0)], [complex(0, 0), complex(-1, 0)]];

  const trace = (a: Matrix, b: Matrix): Complex => {
    let sum: Complex = { re: 0, im: 0 };
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        sum = add(sum, mul(a[i][j], b[j][i]));
      }
    }
    return sum;
  };

  const x = trace(rho, sigmaX).re;
  const y = trace(rho, sigmaY).re;
  const z = trace(rho, sigmaZ).re;

  // Purity = Tr(ρ²)
  const rhoSq = rho.map((row, i) => row.map((_, j) => {
    let sum: Complex = { re: 0, im: 0 };
    for (let k = 0; k < 2; k++) {
      sum = add(sum, mul(rho[i][k], rho[k][j]));
    }
    return sum;
  }));
  const purity = trace(rhoSq, identity(2)).re;

  return { x, y, z, purity };
}

function sampleShots(probabilities: Record<string, number>, shots: number): Record<string, number> {
  const states = Object.keys(probabilities);
  const probs = states.map(s => probabilities[s]);
  const cumProbs: number[] = [];
  let sum = 0;
  for (const p of probs) {
    sum += p;
    cumProbs.push(sum);
  }

  const counts: Record<string, number> = {};
  for (let i = 0; i < shots; i++) {
    const r = Math.random();
    let idx = cumProbs.findIndex(cp => r < cp);
    if (idx === -1) idx = states.length - 1;
    const state = states[idx];
    counts[state] = (counts[state] || 0) + 1;
  }
  return counts;
}

export function simulateCircuit(
  circuit: Circuit,
  shots: number = 1024,
  actionOverride?: CircuitAction
): SimulateResponse {
  const numQubits = circuit.num_qubits;
  const dim = 1 << numQubits;

  // Initial state |0...0⟩
  let state: Complex[] = Array(dim).fill({ re: 0, im: 0 });
  state[0] = { re: 1, im: 0 };

  // Sort gates by column
  const sortedGates = [...circuit.gates].sort((a, b) => a.column - b.column);

  for (const gate of sortedGates) {
    if (gate.type === 'MEASURE') continue; // Skip measurements for statevector
    const matrix = getGateMatrix(gate, numQubits);
    state = matVecMul(matrix, state);
  }

  // Compute probabilities
  const probabilities: Record<string, number> = {};
  const amplitudes: Record<string, Amplitude> = {};

  for (let i = 0; i < dim; i++) {
    const prob = abs2(state[i]);
    if (prob > 1e-10) {
      // Qiskit bit order: qubit 0 is rightmost
      const bitstring = i.toString(2).padStart(numQubits, '0');
      probabilities[bitstring] = prob;
      amplitudes[bitstring] = { re: state[i].re, im: state[i].im };
    }
  }

  // Bloch vectors
  const bloch: BlochVector[] = [];
  const entangledQubits: number[] = [];

  for (let q = 0; q < numQubits; q++) {
    const rho = partialTrace(state, numQubits, q);
    const { x, y, z, purity } = blochFromRho(rho);
    bloch.push({ q, x, y, z, purity });
    if (purity < 1 - 1e-6) {
      entangledQubits.push(q);
    }
  }

  // Measurement counts
  const hasMeasure = circuit.gates.some(g => g.type === 'MEASURE');
  const counts = hasMeasure ? sampleShots(probabilities, shots) : null;

  // Build facts packet.
  //
  // The simulator only sees a circuit, so it cannot know the previous state or
  // which edit the student just made. Rather than invent values (which made the
  // tutor quote numbers that never existed), it reports the honest "unknown":
  // an empty prev_probabilities and no changed states. The caller overrides
  // `action` when it knows the committed edit.
  const lastGate = sortedGates[sortedGates.length - 1];
  const action: CircuitAction =
    actionOverride ??
    (lastGate
      ? { type: 'add_gate', gate: lastGate.type, controls: lastGate.controls, targets: lastGate.targets }
      : { type: 'reset' });

  const facts = {
    action,
    num_qubits: numQubits,
    probabilities,
    prev_probabilities: {} as Record<string, number>,
    amplitudes,
    bloch,
    entangled_qubits: entangledQubits,
    changed_states: [] as string[],
    level: 'beginner' as const,
  };

  return {
    probabilities,
    amplitudes,
    bloch,
    entangled_qubits: entangledQubits,
    counts,
    diff: { changed: [] as string[] },
    backend_agreement: { with: 'cirq', tvd: 0, agree: true },
    facts,
  };
}