import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Gate } from '../../types';
import { Trash2, GripVertical, Lock } from 'lucide-react';
import { gateFill, gateSymbol, gateText } from './gateStyles';

interface GateTileProps {
  gate: Gate;
  onRemove: (id: string) => void;
  isPlacingTarget?: boolean;
  disabled?: boolean;
}

const DISABLED_FILL = '#E5E7EB';
const DISABLED_TEXT = '#4B5563';
export const DISABLED_GATE_REASON = 'Gates cannot be added after a measurement on this wire';

export function GateTile({ gate, onRemove, isPlacingTarget, disabled }: GateTileProps) {
  const [showDelete, setShowDelete] = useState(false);
  // Draggable (not sortable) so a placed gate can be dropped on another cell,
  // which moves it. The canvas reads data.gateId to tell moves from placements.
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: gate.id,
    data: { gateId: gate.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.6 : 1,
  };

  // Disabled tiles stay readable: #4B5563 on #E5E7EB is 6.1:1.
  const fill = disabled ? DISABLED_FILL : gateFill(gate.type);
  const label = disabled ? DISABLED_TEXT : gateText(gate.type);
  const symbol = gateSymbol(gate.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative gate-tile ${disabled ? 'cursor-not-allowed' : ''} ${isPlacingTarget ? 'ring-2 ring-brand' : ''}`}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={
        disabled
          ? `${gate.type} gate on qubit ${gate.targets[0]}, column ${gate.column}. Locked: ${DISABLED_GATE_REASON}`
          : `${gate.type} gate on qubit ${gate.targets[0]}, column ${gate.column}`
      }
      aria-disabled={disabled}
      title={disabled ? DISABLED_GATE_REASON : `Drag to move, or press Delete to remove`}
      onMouseEnter={() => !disabled && setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <div
        className="flex items-center justify-center w-full h-10 rounded-lg font-mono font-bold text-sm"
        style={{ backgroundColor: fill, color: label }}
      >
        {gate.type === 'CNOT' && gate.controls.length > 0 && (
          <span className="absolute left-1 top-0.5 text-label" aria-hidden="true">●</span>
        )}
        {symbol}
      </div>

      {disabled && (
        <span className="absolute -bottom-2 -right-2 p-0.5 rounded-full bg-white text-muted" aria-hidden="true">
          <Lock className="w-3.5 h-3.5" />
        </span>
      )}

      {showDelete && !disabled && !isPlacingTarget && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(gate.id); }}
          className="absolute -top-2 -right-2 p-1 rounded-full bg-danger text-white"
          aria-label={`Remove ${gate.type} gate`}
          title={`Remove ${gate.type} gate`}
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}

      {!isDragging && !disabled && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
      )}    </div>
  );
}