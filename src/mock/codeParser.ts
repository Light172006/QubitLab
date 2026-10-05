import { Circuit, Gate, GateType } from '../types';

interface ParseResult {
  circuit: Circuit;
}

interface ParseError {
  errors: Array<{ line: number; code: string; message: string }>;
}

type ParseReturn = ParseResult | ParseError;

const SUPPORTED_GATES: GateType[] = ['H', 'X', 'Z', 'S', 'T', 'CNOT', 'CZ', 'MEASURE'];
const GATE_METHODS: Record<GateType, string> = {
  H: 'h',
  X: 'x',
  Z: 'z',
  S: 's',
  T: 't',
  CNOT: 'cx',
  CZ: 'cz',
  MEASURE: 'measure',
};

export function parseCode(code: string): ParseReturn {
  const lines = code.split('\n');
  let numQubits = 2;
  let numClbits = 2;
  const gates: Gate[] = [];
  let gateCounter = 0;
  let column = 0;

  const errors: Array<{ line: number; code: string; message: string }> = [];

  // Qubit/clbit indices must address the register;
  // out-of-range or non-integer arguments are errors.
  const qubitInRange = (q: number) => Number.isInteger(q) && q >= 0 && q < numQubits;
  const clbitInRange = (c: number) => Number.isInteger(c) && c >= 0 && c < numClbits;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i].trim();

    if (!line || line.startsWith('#') || line.startsWith('//')) continue;

    // Only the canonical Qiskit import is supported; every
    // other import is an error, never a silent skip.
    if (line.startsWith('import ') || line.startsWith('from ')) {
      if (line === 'from qiskit import QuantumCircuit') continue;
      errors.push({
        line: lineNum,
        code: line,
        message: 'Unsupported import (only "from qiskit import QuantumCircuit" is supported)',
      });
      continue;
    }

    // QuantumCircuit instantiation (with or without variable assignment)
    const qcMatch = line.match(/(?:(\w+)\s*=\s*)?QuantumCircuit\s*\(\s*(\d+)\s*(?:,\s*(\d+))?\s*\)/);
    if (qcMatch) {
      numQubits = parseInt(qcMatch[2]);
      numClbits = qcMatch[3] ? parseInt(qcMatch[3]) : numQubits;
      continue;
    }

    // Gate calls: qc.h(0), qc.cx(0, 1), qc.measure([0,1], [0,1])
    const gateMatch = line.match(/qc\.(\w+)\s*\(([^)]*)\)/);
    if (gateMatch) {
      const method = gateMatch[1];
      const argsStr = gateMatch[2].trim();

      // Find gate type
      let gateType: GateType | null = null;
      for (const [type, m] of Object.entries(GATE_METHODS)) {
        if (m === method) {
          gateType = type as GateType;
          break;
        }
      }

      if (!gateType) {
        errors.push({ line: lineNum, code: line, message: `Unsupported gate method: ${method}` });
        continue;
      }

      // Parse arguments
      let args: number[] = [];
      try {
        // Handle simple integer literals
        if (argsStr.includes('[')) {
          // Array arguments like [0,1]
          const arrayMatch = argsStr.match(/\[([^\]]+)\]/);
          if (arrayMatch) {
            args = arrayMatch[1].split(',').map(s => parseInt(s.trim()));
          }
        } else {
          // Simple integer arguments
          args = argsStr.split(',').map(s => parseInt(s.trim()));
        }
      } catch {
        errors.push({ line: lineNum, code: line, message: 'Arguments must be integer literals' });
        continue;
      }

      // Validate arguments
      if (gateType === 'MEASURE') {
        // Handle both measure(q, c) and measure([q], [c]) formats
        let qubitArg: number | null = null;
        let clbitArg: number | null = null;
        
        if (argsStr.includes('[')) {
          // Array format: measure([0,1], [0,1])
          const arrayMatches = argsStr.match(/\[([^\]]+)\]/g);
          if (arrayMatches && arrayMatches.length >= 2) {
            const qubits = arrayMatches[0].slice(1, -1).split(',').map(s => parseInt(s.trim()));
            const clbits = arrayMatches[1].slice(1, -1).split(',').map(s => parseInt(s.trim()));
            const valid =
              qubits.length === clbits.length &&
              qubits.every(qubitInRange) &&
              clbits.every(clbitInRange);
            if (!valid) {
              errors.push({ line: lineNum, code: line, message: `measure needs matching qubit and clbit lists inside the register (0..${numQubits - 1})` });
              continue;
            }
            for (let idx = 0; idx < qubits.length; idx++) {
              gates.push({
                id: `g${gateCounter++}`,
                type: 'MEASURE',
                targets: [qubits[idx]],
                controls: [],
                column: column++,
              });
            }
            continue;
          }
        } else {
          // Simple format: measure(q, c)
          const simpleArgs = argsStr.split(',').map(s => parseInt(s.trim()));
          if (simpleArgs.length === 2) {
            if (!qubitInRange(simpleArgs[0]) || !clbitInRange(simpleArgs[1])) {
              errors.push({ line: lineNum, code: line, message: `measure needs qubit and clbit arguments inside the register (0..${numQubits - 1})` });
              continue;
            }
            qubitArg = simpleArgs[0];
            clbitArg = simpleArgs[1];
            gates.push({
              id: `g${gateCounter++}`,
              type: 'MEASURE',
              targets: [qubitArg],
              controls: [],
              column: column++,
            });
            continue;
          }
        }
        errors.push({ line: lineNum, code: line, message: 'measure needs qubit and clbit arguments' });
        continue;
      }

      if (['CNOT', 'CZ'].includes(gateType)) {
        if (args.length !== 2 || !qubitInRange(args[0]) || !qubitInRange(args[1])) {
          errors.push({ line: lineNum, code: line, message: `${gateType} needs two qubit arguments (control, target) between 0 and ${numQubits - 1}` });
          continue;
        }
        gates.push({
          id: `g${gateCounter++}`,
          type: gateType,
          targets: [args[1]],
          controls: [args[0]],
          column: column++,
        });
      } else {
        if (args.length !== 1 || !qubitInRange(args[0])) {
          errors.push({ line: lineNum, code: line, message: `${gateType} needs one qubit argument between 0 and ${numQubits - 1}` });
          continue;
        }
        gates.push({
          id: `g${gateCounter++}`,
          type: gateType,
          targets: [args[0]],
          controls: [],
          column: column++,
        });
      }
      continue;
    }

    // Variable assignment or other statements
    if (line.includes('=') && !line.includes('==')) {
      // Allow simple variable assignments
      continue;
    }

    // Unknown statement
    errors.push({ line: lineNum, code: line, message: 'Unsupported statement (only QuantumCircuit and gate calls allowed)' });
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    circuit: {
      version: 1,
      num_qubits: numQubits,
      gates: gates.sort((a, b) => a.column - b.column),
    },
  };
}

export function toCode(circuit: Circuit): string {
  const lines: string[] = [
    'from qiskit import QuantumCircuit',
    `qc = QuantumCircuit(${circuit.num_qubits}, ${circuit.num_qubits})`,
    '',
  ];

  const sortedGates = [...circuit.gates].sort((a, b) => a.column - b.column);

  if (sortedGates.length === 0) {
    lines.push('# Try: qc.h(0)');
  }

  for (const gate of sortedGates) {
    const method = GATE_METHODS[gate.type];
    if (gate.type === 'MEASURE') {
      lines.push(`qc.measure(${gate.targets[0]}, ${gate.targets[0]})`);
    } else if (['CNOT', 'CZ'].includes(gate.type)) {
      lines.push(`qc.${method}(${gate.controls[0]}, ${gate.targets[0]})`);
    } else {
      lines.push(`qc.${method}(${gate.targets[0]})`);
    }
  }

  return lines.join('\n');
}