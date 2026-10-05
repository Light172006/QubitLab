import { useState } from 'react';
import { Gate, Circuit, GateType } from '../../types';
import { Wire } from './Wire';

interface CircuitCanvasProps {
  circuit: Circuit;
  onChange: (circuit: Circuit) => void;
  numQubits: number;
  /** Set by the Workspace's DndContext while a palette gate is dragged. */
  draggedGateType?: string | null;
  /** Two-qubit gate waiting for its target wire (chosen in Workspace). */
  placingTwoQubit?: { gate: Gate; control: number } | null;
  /** Called when the user picks the target wire for a two-qubit gate. */
  onCellClick?: (qubit: number, column: number) => void;
  /** Called when a placed gate's remove button is clicked. */
  onRemoveGate?: (gateId: string) => void;
}

const COLUMNS = 10;

/**
 * SRS 4.2: nothing may be placed at or after a MEASURE on the same wire.
 * (Previously compared with `>=` the other way round, which locked the cells
 * *before* the measurement and left everything after it droppable.)
 */
export function isLockedByMeasure(circuit: Circuit, wire: number, column: number): boolean {
  return circuit.gates.some(
    (gate) => gate.type === 'MEASURE' && gate.targets.includes(wire) && gate.column <= column
  );
}

/** Any gate (1- or 2-qubit) already occupying this cell. */
function isOccupied(circuit: Circuit, wire: number, column: number, ignoreId?: string): boolean {
  return circuit.gates.some(
    (gate) =>
      gate.id !== ignoreId &&
      gate.column === column &&
      (gate.targets.includes(wire) || gate.controls.includes(wire))
  );
}

/** A cell accepts a gate when it is empty and not blocked by an earlier measurement. */
export function isCellFree(circuit: Circuit, wire: number, column: number, ignoreId?: string): boolean {
  return !isLockedByMeasure(circuit, wire, column) && !isOccupied(circuit, wire, column, ignoreId);
}

/**
 * A two-qubit gate fits in a column when BOTH wires are free
 * there. The control wire must be checked too: the user picks
 * it first, but it occupies the same column as the target.
 */
export function canPlaceTwoQubit(
  circuit: Circuit,
  control: number,
  target: number,
  column: number
): boolean {
  if (control === target) return false;
  return isCellFree(circuit, control, column) && isCellFree(circuit, target, column);
}

export function removeGateFromCircuit(circuit: Circuit, gateId: string): Circuit {
  if (!circuit.gates.some((gate) => gate.id === gateId)) return circuit;
  return { ...circuit, gates: circuit.gates.filter(g => g.id !== gateId) };
}

/**
 * Move an already placed gate to another cell. Single-qubit gates follow the
 * dropped wire; CNOT/CZ keep their wires and only shift column, because moving
 * one end of a two-qubit gate is ambiguous.
 */
export function moveGateInCircuit(
  circuit: Circuit,
  gateId: string,
  wire: number,
  column: number
): Circuit {
  const gate = circuit.gates.find((g) => g.id === gateId);
  if (!gate) return circuit;

  const isTwoQubit = gate.controls.length > 0;
  const affectedWires = isTwoQubit ? [gate.controls[0], gate.targets[0]] : [wire];
  if (!affectedWires.every((w) => isCellFree(circuit, w, column, gateId))) return circuit;

  const gates = circuit.gates
    .map((g) =>
      g.id === gateId
        ? { ...g, column, targets: isTwoQubit ? g.targets : [wire], controls: g.controls }
        : g
    )
    .sort((a, b) => a.column - b.column);

  return { ...circuit, gates };
}

/**
 * Presentational: renders the wire grid. The DndContext, the gate palette and
 * the drag/commit handlers live in the Workspace so the palette can sit in its
 * own column next to the canvas and the Live State below it.
 */
export function CircuitCanvas({
  circuit,
  onChange,
  numQubits,
  draggedGateType = null,
  placingTwoQubit = null,
  onCellClick = () => {},
  // Standalone use (tests): deleting a placed gate falls back to onChange.
  onRemoveGate = (gateId: string) => {
    const next = removeGateFromCircuit(circuit, gateId);
    if (next !== circuit) onChange(next);
  },
}: CircuitCanvasProps) {
  void draggedGateType;
  const isLocked = (wire: number, column: number) => isLockedByMeasure(circuit, wire, column);

  return (
    <table className="circuit-canvas min-w-max" role="grid" aria-label="Quantum circuit">
      <thead>
        <tr>
          <th className="w-16 text-right pr-3 font-mono text-label font-semibold uppercase tracking-wide text-muted" scope="col">Wire</th>
          {Array.from({ length: COLUMNS }, (_, i) => (
            <th
              key={i}
              className="w-20 text-center font-mono text-label font-semibold uppercase tracking-wide text-muted"
              scope="col"
            >
              t={i}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: numQubits }, (_, q) => (
          <Wire
            key={q}
            qubit={q}
            numColumns={COLUMNS}
            circuit={circuit}
            onCellClick={onCellClick}
            onRemoveGate={onRemoveGate}
            placingTwoQubit={placingTwoQubit}
            draggedGateType={draggedGateType}
            isLockedByMeasure={isLocked}
          />
        ))}
      </tbody>
    </table>
  );
}
