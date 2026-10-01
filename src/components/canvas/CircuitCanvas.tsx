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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      setDraggedGateType(null);
      return;
    }

    const gateType = active.id as string;
    const [, qubitStr, columnStr] = over.id.toString().split('-');
    const qubit = parseInt(qubitStr);
    const column = parseInt(columnStr);

    if (['CNOT', 'CZ'].includes(gateType)) {
      setPlacingTwoQubit({ gate: { id: `g${Date.now()}`, type: gateType as any, targets: [], controls: [], column }, control: qubit });
    } else {
      const newGate: Gate = {
        id: `g${Date.now()}`,
        type: gateType as any,
        targets: [qubit],
        controls: [],
        column,
      };
      const newCircuit = addGateToCircuit(circuit, newGate);
      onChange(newCircuit);
    }
    setDraggedGateType(null);
  };

  const handleCellClick = (qubit: number, _column: number) => {
    if (placingTwoQubit) {
      if (qubit === placingTwoQubit.control) {
        alert('A qubit cannot be both control and target. Pick a different wire.');
        return;
      }
      const newGate: Gate = {
        ...placingTwoQubit.gate,
        targets: [qubit],
        controls: [placingTwoQubit.control],
      };
      const newCircuit = addGateToCircuit(circuit, newGate);
      onChange(newCircuit);
      setPlacingTwoQubit(null);
    }
  };

  const hasMeasureAfter = (qubit: number, column: number) => {
    return circuit.gates.some(g =>
      g.targets.includes(qubit) &&
      g.type === 'MEASURE' &&
      g.column >= column
    );
  };

  const addGateToCircuit = (currentCircuit: Circuit, newGate: Gate): Circuit => {
    const existingAtPos = currentCircuit.gates.find(
      g => g.column === newGate.column && g.targets.some(t => newGate.targets.includes(t))
    );
    if (existingAtPos) return currentCircuit;

    if (hasMeasureAfter(newGate.targets[0], newGate.column)) {
      return currentCircuit;
    }

    return {
      ...currentCircuit,
      gates: [...currentCircuit.gates, newGate].sort((a, b) => a.column - b.column),
    };
  };

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
                    placingTwoQubit={placingTwoQubit}
                    draggedGateType={draggedGateType}
                    hasMeasureAfter={hasMeasureAfter}
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