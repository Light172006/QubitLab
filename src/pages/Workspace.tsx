import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import { useCircuitStore, useUIStore, useLessonStore, useChallengeStore, useTutorStore, useCodeStore } from '../store';
import { api } from '../api/client';
import {
  CircuitCanvas,
  isCellFree,
  moveGateInCircuit,
  removeGateFromCircuit,
} from '../components/canvas/CircuitCanvas';
import { CanvasToolbar } from '../components/canvas/CanvasToolbar';
import { GatePalette } from '../components/canvas/GatePalette';
import { StateDashboard } from '../components/state/StateDashboard';
import { TutorDrawer } from '../components/tutor/TutorDrawer';
import { CodeEditor } from '../components/canvas/CodeEditor';
import { LessonPlayer } from '../components/lessons/LessonPlayer';
import { TopBar } from '../components/common/TopBar';
import { Gate, GateType } from '../types';
import { ChevronLeft, ChevronRight, Code, LayoutGrid } from 'lucide-react';

const COLUMNS = 10;

/**
 * Basis states whose probability moved by more than the panel's
 * 0.01 highlight threshold, in the current distribution's order.
 * Drives the changed-state pulse and the dimmed zero rows; the
 * simulator cannot know the previous state, so the workspace
 * derives the diff from its own last snapshot.
 */
export function computeStateDiff(
  prev: Record<string, number>,
  next: Record<string, number>
): string[] {
  const changed = new Set<string>();
  for (const [state, prob] of Object.entries(next)) {
    if (Math.abs(prob - (prev[state] || 0)) > 0.01) changed.add(state);
  }
  // States that vanished from the distribution come last,
  // in the previous distribution's order.
  const disappeared: string[] = [];
  for (const state of Object.keys(prev)) {
    if (!(state in next) && prev[state] > 0.01) {
      changed.add(state);
      disappeared.push(state);
    }
  }
  return [...Object.keys(next).filter((state) => changed.has(state)), ...disappeared];
}

function sortableKeyboardCoordinates(event: KeyboardEvent) {
  const { key } = event;
  if (key === 'ArrowRight') return { x: 50, y: 0 };
  if (key === 'ArrowLeft') return { x: -50, y: 0 };
  if (key === 'ArrowDown') return { x: 0, y: 50 };
  if (key === 'ArrowUp') return { x: 0, y: -50 };
  return undefined;
}

export default function Workspace() {
  const navigate = useNavigate();
  const { circuit, setCircuit, undo, redo, reset, historyIndex, history } = useCircuitStore();
  const { level, bitOrder, leftRailOpen, setLeftRailOpen } = useUIStore();
  const { currentLesson, currentStepIndex, setCurrentLesson, setCurrentStep, markStepComplete } = useLessonStore();
  const { currentChallenge, setCurrentChallenge } = useChallengeStore();
  const {
    factsPacket,
    setFactsPacket,
    setStreaming,
    appendExplanation,
    setFallback,
    commitExplanation,
    pushQuestion,
    clearExplanation,
  } = useTutorStore();
  const { code, syncStatus, setCode, setSyncStatus, errors, setErrors } = useCodeStore();
  const [activeTab, setActiveTab] = useState<'canvas' | 'code'>('canvas');
  const [codeTimeout, setCodeTimeout] = useState<ReturnType<typeof setTimeout>>();
  const isFirstRun = useRef(true);
  const runIdRef = useRef(0);
  /** Last simulated distribution, for the changed-state diff. */
  const prevProbabilitiesRef = useRef<Record<string, number>>({});
  const [placingTwoQubit, setPlacingTwoQubit] = useState<{ gate: Gate; control: number } | null>(null);
  const [draggedGateType, setDraggedGateType] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    api.getLessons().then((lessons) => {
      if (lessons.length > 0 && !currentLesson) {
        setCurrentLesson(lessons[0]);
      }
    });
  }, [currentLesson, setCurrentLesson]);

  /**
   * Simulation is driven by the circuit in the store, so every committed change
   * (gate drop, undo, redo, reset, code edit) refreshes the state panel and the
   * tutor. The initial mount is skipped so an untouched circuit stays silent.
   */
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    // Only the newest run may write to the tutor. Superseded runs stop at their
    // next checkpoint instead of interleaving tokens from a stale circuit.
    const runId = ++runIdRef.current;
    const isStale = () => runIdRef.current !== runId;
    // Committed edits are discrete events: simulate immediately so the
    // Live State panels update within the 100ms budget. Code edits are
    // already debounced in handleCodeChange.
    void (async () => {
      const result = await api.simulate(circuit, useUIStore.getState().shots);
      if (isStale()) return;
      // The diff needs the previous distribution, which only the
      // workspace holds: attach it plus the changed states.
      const prevProbabilities = prevProbabilitiesRef.current;
      const facts = {
        ...result.facts,
        prev_probabilities: prevProbabilities,
        changed_states: computeStateDiff(prevProbabilities, result.probabilities),
      };
      prevProbabilitiesRef.current = result.probabilities;
      setFactsPacket(facts);
      clearExplanation();
      setStreaming(true);
      for await (const event of api.explain(facts, level)) {
        if (isStale()) return;
        if (event.type === 'token') appendExplanation(event.content || '');
        else if (event.type === 'fallback') setFallback(true);
        else if (event.type === 'done') break;
      }
      if (isStale()) return;
      setStreaming(false);
      // Files this explanation into the tutor scrollback, open drawer or not.
      commitExplanation();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circuit]);

  // Unmounting mid-stream would otherwise keep appending to a store nobody reads.
  useEffect(() => () => { runIdRef.current += 1; }, []);

  const handleCircuitChange = (newCircuit: typeof circuit) => {
    setCircuit(newCircuit);
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (codeTimeout) clearTimeout(codeTimeout);
    const timeout = setTimeout(async () => {
      try {
        const result = await api.parseCode(newCode);
        if ('circuit' in result) {
          // setCircuit triggers the simulation effect above.
          setCircuit(result.circuit);
          setSyncStatus('synced');
          setErrors([]);
        } else {
          setSyncStatus('error');
          setErrors(result.errors);
        }
      } catch (e) {
        setSyncStatus('error');
        setErrors([{ line: 0, code: '', message: 'Parse failed' }]);
      }
    }, 400);
    setCodeTimeout(timeout);
  };

  const syncCodeToCanvas = async () => {
    try {
      const newCode = await api.circuitToCode(circuit);
      setCode(newCode);
      setSyncStatus('synced');
      setErrors([]);
    } catch (e) {
      console.error(e);
    }
  };

  const hasMeasure = circuit.gates.some((gate) => gate.type === 'MEASURE');

  const tabButtonClass = (tab: 'canvas' | 'code') =>
    `inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      activeTab === tab ? 'bg-navy text-white' : 'text-muted hover:text-text hover:bg-gray-100'
    }`;

  const handleDragStart = (event: DragStartEvent) => {
    const gateType = event.active.data.current?.gateType as GateType | undefined;
    setDraggedGateType(gateType ?? null);
  };

  const commit = (gates: Gate[]) => {
    setCircuit({ ...circuit, gates: [...gates].sort((a, b) => a.column - b.column) });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedGateType(null);
    if (!over) return;

    const [, qubitStr, columnStr] = over.id.toString().split('-');
    const qubit = parseInt(qubitStr);
    const column = parseInt(columnStr);

    // A placed gate was dragged: move it instead of creating a new one.
    const movedGateId = active.data.current?.gateId as string | undefined;
    if (movedGateId) {
      const next = moveGateInCircuit(circuit, movedGateId, qubit, column);
      if (next !== circuit) setCircuit(next);
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
      // Two-qubit gates need a target wire picked next.
      setPlacingTwoQubit({ gate: newGate, control: qubit });
    } else {
      commit([...circuit.gates, newGate]);
    }
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
    if (next !== circuit) setCircuit(next);
  };

  return (
    <div className="h-screen bg-surface flex flex-col overflow-hidden">
      <TopBar
        level={level}
        setLevel={(l) => useUIStore.getState().setLevel(l)}
        bitOrder={bitOrder}
        setBitOrder={(o) => useUIStore.getState().setBitOrder(o)}
        onSandboxClick={() => {
          useLessonStore.getState().resetLesson();
          useChallengeStore.getState().resetChallenge();
          navigate('/workspace');
        }}
      />

      {/* relative: the tutor drawer anchors here, below the navbar */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Left Rail */}
        <aside className={`${leftRailOpen ? 'w-72' : 'w-16'} flex-shrink-0 bg-white border-r border-gray-200 flex flex-col transition-all duration-200`}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            {leftRailOpen && currentLesson && (
              <div className="flex-1 min-w-0">
                <p className="text-label font-semibold uppercase tracking-wide text-muted">
                  Lesson {currentLesson.order}
                </p>
                <h3 className="font-medium text-text truncate">{currentLesson.title}</h3>
                <p className="text-label text-muted mt-1">
                  Step {currentStepIndex + 1} of {currentLesson.steps?.length || 0}
                </p>
              </div>
            )}
            <button
              onClick={() => setLeftRailOpen(!leftRailOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 text-muted hover:text-text transition-colors"
              aria-label={leftRailOpen ? 'Collapse lesson panel' : 'Expand lesson panel'}
              title={leftRailOpen ? 'Collapse lesson panel' : 'Expand lesson panel'}
            >
              {leftRailOpen ? <ChevronLeft className="w-5 h-5" aria-hidden="true" /> : <ChevronRight className="w-5 h-5" aria-hidden="true" />}
            </button>
          </div>

          {leftRailOpen && currentLesson && (
            <LessonPlayer
              lesson={currentLesson}
              currentStepIndex={currentStepIndex}
              onStepChange={setCurrentStep}
              onStepComplete={markStepComplete}
              circuit={circuit}
              facts={factsPacket}
            />
          )}

          {leftRailOpen && currentChallenge && (
            <div className="p-4 border-t border-gray-200">
              <p className="text-label font-semibold uppercase tracking-wide text-muted mb-2">Challenge</p>
              <h3 className="font-medium text-text mb-2">{currentChallenge.title}</h3>
              <p className="text-body text-muted">Target: {currentChallenge.target_spec.state}</p>
            </div>
          )}
        </aside>

        {/* Center: toolbar, then the canvas/code row and the Live State row */}
        <main aria-label="Circuit and live state" className="flex-1 min-w-0 min-h-0 flex flex-col">
          <CanvasToolbar
            leftContent={
              <div className="flex items-center gap-2" role="group" aria-label="Editor mode">
                <button
                  onClick={() => setActiveTab('canvas')}
                  aria-pressed={activeTab === 'canvas'}
                  className={tabButtonClass('canvas')}
                >
                  <LayoutGrid className="w-4 h-4" aria-hidden="true" /> Canvas
                </button>
                <button
                  onClick={() => setActiveTab('code')}
                  aria-pressed={activeTab === 'code'}
                  className={tabButtonClass('code')}
                >
                  <Code className="w-4 h-4" aria-hidden="true" /> Code
                </button>
              </div>
            }
            hasMeasure={hasMeasure}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            onUndo={undo}
            onRedo={redo}
            onReset={() => { if (confirm('Reset circuit?')) reset(); }}
          />

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div
              className={`flex-1 min-h-0 grid grid-rows-[auto_1fr] overflow-hidden ${
                activeTab === 'canvas' ? 'grid-cols-[120px_1fr]' : 'grid-cols-1fr'
              }`}
            >
              {/* Left: Compact Gate Palette - spans both rows (hidden in Code mode) */}
              {activeTab === 'canvas' && (
                <div className="row-span-2 flex flex-col bg-white border-r border-gray-200 overflow-hidden">
                  <GatePalette onGateSelect={() => {}} />
                </div>
              )}

              {/* Right column: Circuit (top) + Live State (bottom) */}
              <div className="flex flex-col min-w-0 min-h-0 overflow-hidden">
                {/* Circuit area (Canvas) / Editor area (Code) - row 1, natural height */}
                <div
                  className={`shrink-0 overflow-x-auto ${activeTab === 'canvas' ? 'p-4 pb-2' : 'p-4'}`}
                  role="region"
                  aria-label={activeTab === 'canvas' ? 'Circuit' : 'Code editor'}
                >
                  {activeTab === 'canvas' ? (
                    <CircuitCanvas
                      circuit={circuit}
                      onChange={handleCircuitChange}
                      numQubits={circuit.num_qubits}
                      draggedGateType={draggedGateType}
                      placingTwoQubit={placingTwoQubit}
                      onCellClick={handleCellClick}
                      onRemoveGate={handleRemoveGate}
                    />
                  ) : (
                    <div className="h-[clamp(260px,40vh,440px)] min-h-[260px] max-h-[440px] w-full relative flex">
                      <CodeEditor
                        code={code}
                        onChange={handleCodeChange}
                        syncStatus={syncStatus}
                        errors={errors}
                        onSync={syncCodeToCanvas}
                      />
                    </div>
                  )}
                </div>

                {/* Live State - fills ALL remaining height (row 2) */}
                <StateDashboard
                  circuit={circuit}
                  facts={factsPacket}
                  bitOrder={bitOrder}
                  level={level}
                />
              </div>
            </div>
          </DndContext>
        </main>

        {/* Non-modal tutor drawer: overlays the canvas, which stays interactive */}
        <TutorDrawer
          onAsk={async (question) => {
            if (!factsPacket) return;
            // Shares the run token with the simulation effect: a newer circuit or a
            // newest question supersedes this stream.
            const runId = ++runIdRef.current;
            const isStale = () => runIdRef.current !== runId;
            pushQuestion(question);
            setStreaming(true);
            clearExplanation();
            for await (const event of api.ask(question, factsPacket, level)) {
              if (isStale()) return;
              if (event.type === 'token') appendExplanation(event.content || '');
              else if (event.type === 'fallback') setFallback(true);
              else if (event.type === 'done') break;
            }
            if (isStale()) return;
            setStreaming(false);
            commitExplanation();
          }}
        />
      </div>
    </div>
  );
}
