import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GateType } from '../../types';
import { MousePointer2 } from 'lucide-react';
import { GATE_ORDER, GATE_STYLES } from './gateStyles';

interface GatePaletteProps {
  onGateSelect: (gate: GateType) => void;
}

function GateTileComponent({ gate, onGateSelect, hoveredGate, setHoveredGate }: {
  gate: GateType;
  onGateSelect: (gate: GateType) => void;
  hoveredGate: GateType | null;
  setHoveredGate: (gate: GateType | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: gate,
    data: { gateType: gate },
  });
  const style = GATE_STYLES[gate];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), opacity: isDragging ? 0.6 : 1 }}
      className={`relative gate-palette-tile group ${isDragging ? 'shadow-lg' : ''}`}
      {...attributes}
      {...listeners}
      role="listitem"
      aria-roledescription="draggable"
      tabIndex={0}
      aria-label={`${style.description}. Drag onto a wire, or press Enter to select.`}
      title={style.description}
      onMouseEnter={() => setHoveredGate(gate)}
      onMouseLeave={() => setHoveredGate(null)}
      onFocus={() => setHoveredGate(gate)}
      onBlur={() => setHoveredGate(null)}
      onClick={() => onGateSelect(gate)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onGateSelect(gate);
        }
      }}
    >
      <div
        className="flex items-center justify-center w-full h-11 rounded-lg font-mono font-bold text-base"
        style={{ backgroundColor: style.fill, color: style.label }}
      >
        {style.symbol}
      </div>
      {hoveredGate === gate && (
        <div className="absolute left-full top-0 ml-2 px-2 py-1.5 bg-gray-900 text-white text-label rounded shadow-lg whitespace-nowrap z-10">
          {style.description}
        </div>
      )}
      {isDragging && (
        <MousePointer2 className="absolute -top-2 -right-2 w-5 h-5 text-brand-text" aria-hidden="true" />
      )}
    </div>
  );
}

export function GatePalette({ onGateSelect }: GatePaletteProps) {
  const [hoveredGate, setHoveredGate] = useState<GateType | null>(null);

  return (
    <div className="w-full flex flex-col gap-2 p-2" role="list" aria-label="Gate palette">
      <p className="text-[12px] font-semibold text-muted uppercase tracking-wide px-1">Gates</p>
      {GATE_ORDER.map((gate) => (
        <GateTileComponent
          key={gate}
          gate={gate}
          onGateSelect={onGateSelect}
          hoveredGate={hoveredGate}
          setHoveredGate={setHoveredGate}
        />
      ))}
    </div>
  );
}