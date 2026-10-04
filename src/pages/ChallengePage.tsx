import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { useChallengeStore, useCircuitStore, useUIStore, useTutorStore } from '../store';
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
import { TopBar } from '../components/common/TopBar';
import { ChallengePanel } from '../components/lessons/ChallengePanel';
import { Gate, GateType } from '../types';
import { ChevronLeft, ChevronRight, ArrowLeft, Trophy } from 'lucide-react';

function sortableKeyboardCoordinates(event: KeyboardEvent) {
  const { key } = event;
  if (key === 'ArrowRight') return { x: 50, y: 0 };
  if (key === 'ArrowLeft') return { x: -50, y: 0 };
  if (key === 'ArrowDown') return { x: 0, y: 50 };
  if (key === 'ArrowUp') return { x: 0, y: -50 };
  return undefined;
}

export default function ChallengePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { circuit, setCircuit, undo, redo, reset, historyIndex, history } = useCircuitStore();
  const { level, bitOrder, leftRailOpen, setLeftRailOpen } = useUIStore();
  const { currentChallenge, setCurrentChallenge, attempts, hintsUsed, incrementAttempts, useHint } = useChallengeStore();
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
  const [simulateTimeout, setSimulateTimeout] = useState<ReturnType<typeof setTimeout>>();
  const [result, setResult] = useState<{ passed: boolean; fidelity: number; message: string } | null>(null);
  const [placingTwoQubit, setPlacingTwoQubit] = useState<{ gate: Gate; control: number } | null>(null);
  const [draggedGateType, setDraggedGateType] = useState<string | null>(null);
  // Monotonic token identifying the newest simulation/question stream. Clearing the
  // debounce timer does not stop a stream that already started, so every write to
  // the tutor is gated on this token instead.
  const runIdRef = useRef(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Unmounting mid-stream would keep appending to a store nobody reads.
  useEffect(() => () => { runIdRef.current += 1; }, []);

  useEffect(() => {
    if (id) {
      api.getChallenges().then((challenges) => {
        const challenge = challenges.find(c => c.id === id);
        if (challenge) setCurrentChallenge(challenge);
      });
    }
  }, [id, setCurrentChallenge]);

  const handleCircuitChange = (newCircuit: typeof circuit) => {
    setCircuit(newCircuit);
  };

  // Simulation debounce: every committed change refreshes the Live
  // State and the tutor. Superseded runs stop at their next checkpoint.
  useEffect(() => {
    const runId = ++runIdRef.current;
    const isStale = () => runIdRef.current !== runId;
    const timeout = setTimeout(async () => {
      const simResult = await api.simulate(circuit, useUIStore.getState().shots);
      if (isStale()) return;
      const facts = simResult.facts;
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
      commitExplanation();
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circuit]);

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

    const movedGateId = active.data.current?.gateId as string | undefined;
    if (movedGateId) {
      const next = moveGateInCircuit(circuit, movedGateId, qubit, column);
      if (next !== circuit) setCircuit(next);
      return;
    }

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

  const handleCheck = async () => {
    if (!currentChallenge) return;
    incrementAttempts();
    const checkResult = await api.checkChallenge(currentChallenge.id, circuit);
    setResult(checkResult);
  };

  const handleHint = async (hintLevel: number) => {
    if (!currentChallenge) return;
    useHint(hintLevel);
    const hint = await api.getHint(currentChallenge.id, hintLevel);
    clearExplanation();
    setStreaming(true);
    appendExplanation(`Hint ${hintLevel}: ${hint}`);
    setStreaming(false);
    commitExplanation();
  };

  const hasMeasure = circuit.gates.some((gate) => gate.type === 'MEASURE');

  return (
    <div className="h-screen bg-surface flex flex-col overflow-hidden">
      <TopBar
        level={level}
        setLevel={(l) => useUIStore.getState().setLevel(l)}
        bitOrder={bitOrder}
        setBitOrder={(o) => useUIStore.getState().setBitOrder(o)}
        onSandboxClick={() => {
          useChallengeStore.getState().resetChallenge();
          navigate('/workspace');
        }}
      />

      {/* relative: the tutor drawer anchors here, below the navbar */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Left Rail - Challenge Context */}
        <aside className={`${leftRailOpen ? 'w-72' : 'w-16'} flex-shrink-0 bg-white border-r border-gray-200 flex flex-col transition-all duration-200`}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            {leftRailOpen && (
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <button
                  onClick={() => navigate('/learn')}
                  className="p-2 rounded-lg hover:bg-gray-100 text-muted hover:text-text"
                  aria-label="Back to lessons"
                  title="Back to lessons"
                >
                  <ArrowLeft className="w-5 h-5" aria-hidden="true" />
                </button>
                <div>
                  <p className="text-label font-semibold uppercase tracking-wide text-muted">Challenge</p>
                  <h3 className="font-medium text-text truncate">{currentChallenge?.title}</h3>
                </div>
              </div>
            )}
            <button
              onClick={() => setLeftRailOpen(!leftRailOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 text-muted hover:text-text transition-colors"
              aria-label={leftRailOpen ? 'Collapse challenge panel' : 'Expand challenge panel'}
              title={leftRailOpen ? 'Collapse challenge panel' : 'Expand challenge panel'}
            >
              {leftRailOpen ? <ChevronLeft className="w-5 h-5" aria-hidden="true" /> : <ChevronRight className="w-5 h-5" aria-hidden="true" />}
            </button>
          </div>

          {leftRailOpen && currentChallenge && (
            <ChallengePanel
              challenge={currentChallenge}
              attempts={attempts}
              hintsUsed={hintsUsed}
              result={result}
              onHint={handleHint}
              onCheck={handleCheck}
            />
          )}
        </aside>

        {/* Center: toolbar, then the canvas row and the Live State row */}
        <main aria-label="Circuit and live state" className="flex-1 min-w-0 min-h-0 flex flex-col">
          <CanvasToolbar
            leftContent={
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-accent-text-orange" aria-hidden="true" />
                <span className="font-medium text-text">Challenge Mode</span>
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
            <div className="flex-1 min-h-0 grid grid-rows-[auto_1fr] grid-cols-[120px_1fr] overflow-hidden">
              {/* Left: Compact Gate Palette - spans both rows */}
              <div className="row-span-2 flex flex-col bg-white border-r border-gray-200 overflow-hidden">
                <GatePalette onGateSelect={() => {}} />
              </div>

              {/* Right column: Circuit (top) + Live State (bottom) */}
              <div className="flex flex-col min-w-0 min-h-0 overflow-hidden">
                <div
                  className="shrink-0 overflow-x-auto p-4 pb-2"
                  role="region"
                  aria-label="Circuit"
                >
                  <CircuitCanvas
                    circuit={circuit}
                    onChange={handleCircuitChange}
                    numQubits={circuit.num_qubits}
                    draggedGateType={draggedGateType}
                    placingTwoQubit={placingTwoQubit}
                    onCellClick={handleCellClick}
                    onRemoveGate={handleRemoveGate}
                  />
                </div>

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
