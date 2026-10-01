import type { GateType } from '../../types';

/**
 * Single source for gate colours. Dark labels are mandatory on the orange and
 * teal fills - white text only reaches 2.2-2.6:1 there.
 */
export interface GateStyle {
  /** Tile fill. */
  fill: string;
  /** Label colour that clears 4.5:1 against `fill`. */
  label: string;
  /** Palette label. */
  symbol: string;
  description: string;
}

export const GATE_STYLES: Record<GateType, GateStyle> = {
  H: { fill: '#0070C0', label: '#FFFFFF', symbol: 'H', description: 'Hadamard - creates superposition' },
  X: { fill: '#6B4E8E', label: '#FFFFFF', symbol: 'X', description: 'Pauli-X - bit flip' },
  Z: { fill: '#F79646', label: '#111827', symbol: 'Z', description: 'Pauli-Z - phase flip' },
  S: { fill: '#F79646', label: '#111827', symbol: 'S', description: 'Phase pi/2' },
  T: { fill: '#F79646', label: '#111827', symbol: 'T', description: 'Phase pi/4' },
  CNOT: { fill: '#6B4E8E', label: '#FFFFFF', symbol: '⊕', description: 'CNOT - controlled-X' },
  CZ: { fill: '#4BACC6', label: '#111827', symbol: 'CZ', description: 'Controlled-Z' },
  MEASURE: { fill: '#4B5563', label: '#FFFFFF', symbol: 'M', description: 'Measurement (terminal)' },
};

/** Palette order, matching the drag handles students see first. */
export const GATE_ORDER: GateType[] = ['H', 'X', 'Z', 'S', 'T', 'CNOT', 'CZ', 'MEASURE'];

export const gateFill = (type: GateType): string => GATE_STYLES[type]?.fill ?? '#1F497D';
/** Glyph drawn on the tile (CNOT renders as ⊕). */
export const gateSymbol = (type: GateType): string => GATE_STYLES[type]?.symbol ?? type;
/** Tile label colour with the required contrast against the fill. */
export const gateText = (type: GateType): string => GATE_STYLES[type]?.label ?? '#FFFFFF';