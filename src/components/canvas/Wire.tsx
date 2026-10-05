import { useDroppable } from '@dnd-kit/core';
import { Lock } from 'lucide-react';
import { Gate, Circuit } from '../../types';
import { GateTile } from './GateTile';
import { gateFill } from './gateStyles';

interface WireProps {
  qubit: number;
  numColumns: number;
  circuit: Circuit;
  onCellClick: (qubit: number, column: number) => void;
  onRemoveGate: (gateId: string) => void;
  placingTwoQubit: { gate: Gate; control: number } | null;
  draggedGateType: string | null;
  isLockedByMeasure: (qubit: number, column: number) => boolean;
}

function CellContent({ gate, isControl, isTarget, onRemove }: { gate: Gate; isControl: boolean; isTarget: boolean; onRemove: () => void }) {
  const colour = gateFill(gate.type);

  if (isControl) {
    return (
      <div className="relative" style={{ zIndex: 10 }}>
        <div className="flex items-center justify-center w-14 h-10">
          <div className="w-6 h-6 rounded-full border-2" style={{ borderColor: colour }}>
            <span className="text-label font-bold" style={{ color: colour }} aria-hidden="true">●</span>
          </div>
        </div>
        {gate.type === 'CNOT' && isTarget && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-full bg-gray-400" />
        )}
      </div>
    );
  }

  if (isTarget) {
    if (gate.type === 'CNOT') {
      return (
        <div className="relative" style={{ zIndex: 10 }}>
          <div className="flex items-center justify-center w-14 h-10">
            <svg className="w-8 h-8" viewBox="0 0 24 24" role="img" aria-label="CNOT target">
              <circle cx="12" cy="12" r="10" stroke={colour} strokeWidth="2" fill="none" />
              <line x1="12" y1="2" x2="12" y2="22" stroke={colour} strokeWidth="2" />
              <line x1="2" y1="12" x2="22" y2="12" stroke={colour} strokeWidth="2" />
            </svg>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-full bg-gray-400" />
        </div>
      );
    }
    if (gate.type === 'CZ') {
      return (
        <div className="relative" style={{ zIndex: 10 }}>
          <div className="flex items-center justify-center w-14 h-10">
            <div className="w-6 h-6 rounded-full border-2" style={{ borderColor: colour }}>
              <span className="text-label font-bold" style={{ color: colour }} aria-hidden="true">●</span>
            </div>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-full bg-gray-400" />
        </div>
      );
    }
    if (gate.type === 'MEASURE') {
      return (
        <div className="flex items-center justify-center w-14 h-10">
          <svg className="w-6 h-6 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" role="img" aria-label="Measurement">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
        </div>
      );
    }
    return <GateTile gate={gate} onRemove={onRemove} disabled={false} />;
  }

  return null;
}

function DroppableCell({
  qubit,
  column,
  canDrop,
  isPlacingTarget,
  onCellClick,
  children,
}: {
  qubit: number;
  column: number;
  canDrop: boolean;
  isPlacingTarget: boolean;
  onCellClick: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `cell-${qubit}-${column}` });
  const isDragOver = isOver && canDrop;

  return (
    <td
      ref={setNodeRef}
      className={`relative w-20 h-10 border-t border-gray-100 transition-colors ${
        canDrop ? '' : 'bg-gray-50'
      } ${isDragOver ? 'bg-brand-tint' : ''} ${isPlacingTarget ? 'bg-brand-tint' : ''}`}
      onClick={onCellClick}
      role="gridcell"
      aria-label={`Qubit ${qubit}, column ${column}${canDrop ? '' : ' (locked: measurement is terminal)'}`}
      tabIndex={-1}
    >
      <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <div className="w-full h-0.5 bg-gray-200" />
      </div>
      {!canDrop && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          title="Measurement is terminal"
        >
          <Lock className="w-3.5 h-3.5 text-muted" aria-label="Locked" />
        </div>
      )}
      {children}
    </td>
  );
}

export function Wire({
  qubit,
  numColumns,
  circuit,
  onCellClick,
  onRemoveGate,
  placingTwoQubit,
  draggedGateType,
  isLockedByMeasure,
}: WireProps) {
  const gatesOnWire = circuit.gates.filter(g => g.targets.includes(qubit) || g.controls.includes(qubit));
  const isControlTarget = placingTwoQubit && (placingTwoQubit.control === qubit || placingTwoQubit.gate.targets.includes(qubit));

  const renderCell = (column: number) => {
    const gate = gatesOnWire.find(g => g.column === column);
    const canDrop = !isLockedByMeasure(qubit, column);
    // Every cell on a non-control wire is a valid target
    // while a two-qubit gate awaits its target wire.
    const isPlacingTarget = !!placingTwoQubit && placingTwoQubit.control !== qubit;
    const handleClick = () => {
      if (placingTwoQubit) onCellClick(qubit, column);
    };

    return (
      <DroppableCell
        key={column}
        qubit={qubit}
        column={column}
        canDrop={canDrop}
        isPlacingTarget={isPlacingTarget}
        onCellClick={handleClick}
      >
        {gate ? (
          <CellContent
            gate={gate}
            isControl={gate.controls.includes(qubit)}
            isTarget={gate.targets.includes(qubit)}
            onRemove={() => onRemoveGate(gate.id)}
          />
        ) : null}
      </DroppableCell>
    );
  };

  return (
    <tr className={isControlTarget ? 'bg-brand-tint' : ''}>
      <th
        scope="row"
        className="w-16 text-right pr-3 font-mono text-label font-semibold uppercase tracking-wide text-muted sticky left-0 bg-white z-10 border-r border-gray-200"
      >
        <div className="flex items-center justify-between h-10">
          <span aria-hidden="true">|0⟩</span>
          <span className="text-label">q{qubit}</span>
        </div>
      </th>
      {Array.from({ length: numColumns }, (_, i) => renderCell(i))}
    </tr>
  );
}