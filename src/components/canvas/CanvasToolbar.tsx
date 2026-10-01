import type { ReactNode } from 'react';
import { useUIStore } from '../../store';
import { ChevronLeft, ChevronRight, X, CheckCircle } from 'lucide-react';

interface CanvasToolbarProps {
  /** Mode-specific content on the left (canvas/code tabs, challenge title...). */
  leftContent?: ReactNode;
  /** Shots are only meaningful once the circuit contains a measurement. */
  hasMeasure: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
}

const SHOTS_OPTIONS = [128, 256, 512, 1024, 2048, 4096, 8192];

const CONTROL_CLASS =
  'px-2.5 py-1.5 text-sm text-text bg-white border border-gray-300 rounded-lg disabled:text-muted disabled:cursor-not-allowed disabled:bg-gray-100 focus:ring-2 focus:ring-brand focus:border-transparent';

const ICON_BUTTON_CLASS =
  'p-2 rounded-lg text-muted hover:bg-gray-100 hover:text-text transition-colors disabled:text-muted disabled:cursor-not-allowed';

/**
 * Toolbar above the canvas. Backend and Shots live here (not in the navbar) and are
 * grouped under "Simulation" so there is a single source for run settings.
 */
export function CanvasToolbar({
  leftContent,
  hasMeasure,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onReset,
}: CanvasToolbarProps) {
  const { backend, setBackend, shots, setShots } = useUIStore();
  const shotsDisabledReason = 'Add a Measure (M) gate to use shots';

  return (
    <div className="flex items-center gap-3 p-3 border-b border-gray-100 bg-white flex-wrap">
      {leftContent}

      <div className="flex-1" />

      <div className="flex items-center gap-4 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50">
        <span className="text-label font-semibold uppercase tracking-wide text-muted">Simulation</span>

        <label className="flex items-center gap-1.5" htmlFor="canvas-backend">
          <span className="text-label font-medium text-muted">Backend</span>
          <select
            id="canvas-backend"
            value={backend}
            onChange={(e) => setBackend(e.target.value as 'aer' | 'cirq' | 'compare')}
            className={CONTROL_CLASS}
            title="Simulate on the selected backend"
          >
            <option value="aer">Aer</option>
            <option value="cirq">Cirq</option>
            <option value="compare">Compare</option>
          </select>
        </label>

        {backend === 'compare' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-label rounded-full bg-green-tint text-green font-medium">
            <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
            Backends agree
          </span>
        )}

        {/* The wrapper carries the tooltip so it also shows over the disabled select. */}
        <span className="flex items-center gap-1.5" title={hasMeasure ? undefined : shotsDisabledReason}>
          <label className="flex items-center gap-1.5" htmlFor="canvas-shots">
            <span className="text-label font-medium text-muted">Shots</span>
            <select
              id="canvas-shots"
              value={shots}
              onChange={(e) => setShots(Number(e.target.value))}
              disabled={!hasMeasure}
              aria-describedby={hasMeasure ? undefined : 'canvas-shots-hint'}
              className={CONTROL_CLASS}
            >
              {SHOTS_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          {!hasMeasure && (
            <span id="canvas-shots-hint" className="sr-only">{shotsDisabledReason}</span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={ICON_BUTTON_CLASS}
          aria-label="Undo"
          title={canUndo ? 'Undo (Ctrl+Z)' : 'Nothing to undo'}
        >
          <ChevronLeft className="w-5 h-5" aria-hidden="true" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={ICON_BUTTON_CLASS}
          aria-label="Redo"
          title={canRedo ? 'Redo (Ctrl+Shift+Z)' : 'Nothing to redo'}
        >
          <ChevronRight className="w-5 h-5" aria-hidden="true" />
        </button>
        <button
          onClick={onReset}
          className={`${ICON_BUTTON_CLASS} hover:text-danger`}
          aria-label="Reset circuit"
          title="Reset the circuit to an empty state"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}