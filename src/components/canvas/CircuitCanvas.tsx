import { useState } from 'react';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { Gate, Circuit, GateType } from '../../types';
import { Wire } from './Wire';
import { GatePalette } from './GatePalette';

interface CircuitCanvasProps {
  circuit: Circuit;
  onChange: (circuit: Circuit) => void;
  numQubits: number;
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

export function removeGateFromCircuit(circuit: Circuit, gateId: string): Circuit {
  if (!circuit.gates.some((gate) => gate.id === gateId)) return circuit;
  return { ...circuit, gates: circuit.gates.filter((gate) => gate.id !== gateId) };
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

function sortableKeyboardCoordinates(event: KeyboardEvent) {
  const { key } = event;
  if (key === 'ArrowRight') return { x: 50, y: 0 };
  if (key === 'ArrowLeft') return { x: -50, y: 0 };
  if (key === 'ArrowDown') return { x: 0, y: 50 };
  if (key === 'ArrowUp') return { x: 0, y: -50 };
  return undefined;
}

export function CircuitCanvas({ circuit, onChange, numQubits }: CircuitCanvasProps) {
  const [placingTwoQubit, setPlacingTwoQubit] = useState<{ gate: Gate; control: number } | null>(null);
  const [draggedGateType, setDraggedGateType] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (_event: DragStartEvent) => {
    // Drag start handled by dnd-kit
  };

  const commit = (gates: Gate[]) => {
    onChange({ ...circuit, gates: [...gates].sort((a, b) => a.column - b.column) });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      setDraggedGateType(null);
      return;
    }

    const [, qubitStr, columnStr] = over.id.toString().split('-');
    const qubit = parseInt(qubitStr);
    const column = parseInt(columnStr);

    // A placed gate was dragged: move it instead of creating a new one.
    const movedGateId = active.data.current?.gateId as string | undefined;
    if (movedGateId) {
      const next = moveGateInCircuit(circuit, movedGateId, qubit, column);
      if (next !== circuit) onChange(next);
      return;
    }

    // A palette gate was dragged: place it.
    const gateType = active.data.current?.gateType as GateType | undefined;
    if (!gateType) return;
    if (!isCellFree(circuit, qubit, column)) return;

    const newGate: Gate = {
      id: `g${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      type: gateType,
      targets: [qubit],
      controls: [],
      column,
    };

    if (gateType === 'CNOT' || gateType === 'CZ') {
      setPlacingTwoQubit({ gate: newGate, control: qubit });
    } else {
      commit([...circuit.gates, newGate]);
    }
    setDraggedGateType(null);
  };

  const handleCellClick = (qubit: number, column: number) => {
    if (!placingTwoQubit) return;
    if (qubit === placingTwoQubit.control) {
      alert('A qubit cannot be both control and target. Pick a different wire.');
      return;
    }
    if (!isCellFree(circuit, qubit, column)) return;
    commit([...circuit.gates, { ...placingTwoQubit.gate, targets: [qubit], controls: [placingTwoQubit.control] }]);
    setPlacingTwoQubit(null);
  };

  const handleRemoveGate = (gateId: string) => {
    const next = removeGateFromCircuit(circuit, gateId);
    if (next !== circuit) onChange(next);
  };

  const isLocked = (wire: number, column: number) => isLockedByMeasure(circuit, wire, column);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto">
        <div className="flex gap-4">
          <GatePalette onGateSelect={() => {}} />
          <div className="flex-1 min-w-0">
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
                    onCellClick={handleCellClick}
                    onRemoveGate={handleRemoveGate}
                    placingTwoQubit={placingTwoQubit}
                    draggedGateType={draggedGateType}
                    isLockedByMeasure={isLocked}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DndContext>
  );
}