import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { MousePointer2 } from 'lucide-react';
import { GATE_ORDER, GATE_STYLES } from './gateStyles';
import type { GateType } from '../../types';

export interface GatePaletteProps {
  /** Reserved for a future click-to-place mode. Placement today is by drag, or
   *  by pressing Space on the tile and moving it with the arrow keys. */
  onGateSelect?: (gate: GateType) => void;
}

interface GateTileProps {
  gate: GateType;
  hovered: boolean;
  onHover: (gate: GateType | null) => void;
}

/**
 * One palette tile.
 *
 * A real <button>, not a div with role="listitem": aria-label is not a
 * supported attribute on listitem, so these tiles had no accessible name in a
 * browser - only the title tooltip said what they were.
 *
 * Keyboard placement rides on dnd-kit's KeyboardSensor (Space to pick up,
 * arrows to move over the grid, Space to drop), so the tile must not swallow
 * keydown. The previous handler called a no-op onGateSelect instead, which made
 * keyboard placement impossible.
 */
function GateTile({ gate, hovered, onHover }: GateTileProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${gate}`,
    data: { gateType: gate },
  });
  const style = GATE_STYLES[gate];

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), opacity: isDragging ? 0.6 : 1 }}
      className={`relative gate-palette-tile ${isDragging ? 'shadow-lg' : ''}`}
      {...attributes}
      {...listeners}
      onKeyDown={(event) => {
        // Hand every key except Escape back to dnd-kit's keyboard activator.
        if (event.key !== 'Escape') listeners?.onKeyDown?.(event);
      }}
      aria-label={`${style.description}. Press Space to pick up, then use the arrow keys to move it over the circuit and Space again to drop.`}
      title={`${style.description} — drag onto a wire, or press Space and use the arrow keys`}
      onMouseEnter={() => onHover(gate)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(gate)}
      onBlur={() => onHover(null)}
    >
      <div
        className="flex items-center justify-center w-full h-11 rounded-lg font-mono font-bold text-base"
        style={{ backgroundColor: style.fill, color: style.label }}
      >
        {style.symbol}
      </div>
      {hovered && (
        <div className="absolute left-full top-0 ml-2 px-2 py-1.5 bg-gray-900 text-white text-label rounded shadow-lg whitespace-nowrap z-10">
          {style.description}
        </div>
      )}
      {isDragging && (
        <MousePointer2 className="absolute -top-2 -right-2 w-5 h-5 text-brand-text" aria-hidden="true" />
      )}
    </button>
  );
}

export function GatePalette({ onGateSelect }: GatePaletteProps) {
  const [hoveredGate, setHoveredGate] = useState<GateType | null>(null);
  void onGateSelect;

  return (
    <div className="w-full flex flex-col gap-2 p-2" role="group" aria-label="Gate palette">
      <p className="text-[12px] font-semibold text-muted uppercase tracking-wide px-1">Gates</p>
      {GATE_ORDER.map((gate) => (
        <GateTile
          key={gate}
          gate={gate}
          hovered={hoveredGate === gate}
          onHover={setHoveredGate}
        />
      ))}
    </div>
  );
}