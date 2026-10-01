import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChallengeStore, useCircuitStore, useUIStore, useTutorStore } from '../store';
import { api } from '../api/client';
import { CircuitCanvas } from '../components/canvas/CircuitCanvas';
import { CanvasToolbar } from '../components/canvas/CanvasToolbar';
import { StatePanel } from '../components/state/StatePanel';
import { TutorDrawer } from '../components/tutor/TutorDrawer';
import { TopBar } from '../components/common/TopBar';
import { ChallengePanel } from '../components/lessons/ChallengePanel';
import { ChevronLeft, ChevronRight, ArrowLeft, Trophy } from 'lucide-react';

export default function ChallengePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { circuit, setCircuit, undo, redo, reset, historyIndex, history } = useCircuitStore();
  const { level, bitOrder, leftRailOpen, rightRailOpen, setLeftRailOpen, setRightRailOpen } = useUIStore();
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

  useEffect(() => {
    if (id) {
      api.getChallenges().then((challenges) => {
        const challenge = challenges.find(c => c.id === id);
        if (challenge) setCurrentChallenge(challenge);
      });
    }
  }, [id, setCurrentChallenge]);

  const handleCircuitChange = async (newCircuit: typeof circuit) => {
    setCircuit(newCircuit);
    if (simulateTimeout) clearTimeout(simulateTimeout);
    const timeout = setTimeout(async () => {
      const result = await api.simulate(newCircuit, useUIStore.getState().shots);
      const facts = result.facts;
      setFactsPacket(facts);
      clearExplanation();
      setStreaming(true);
      for await (const event of api.explain(facts, level)) {
        if (event.type === 'token') appendExplanation(event.content || '');
        else if (event.type === 'fallback') setFallback(true);
        else if (event.type === 'done') break;
      }
      setStreaming(false);
      commitExplanation();
    }, 400);
    setSimulateTimeout(timeout);
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

        {/* Center - Canvas */}
        <main className="flex-1 flex flex-col min-w-0">
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

          <div className="flex-1 overflow-auto p-4">
            <CircuitCanvas
              circuit={circuit}
              onChange={handleCircuitChange}
              numQubits={circuit.num_qubits}
            />
          </div>
        </main>

        {/* Right Rail - State Panel */}
        <aside className={`${rightRailOpen ? 'w-80' : 'w-16'} flex-shrink-0 bg-white border-l border-gray-200 flex flex-col transition-all duration-200`}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            {rightRailOpen && <h3 className="font-medium text-text">State</h3>}
            <button
              onClick={() => setRightRailOpen(!rightRailOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 text-muted hover:text-text transition-colors"
              aria-label={rightRailOpen ? 'Collapse state panel' : 'Expand state panel'}
              title={rightRailOpen ? 'Collapse state panel' : 'Expand state panel'}
            >
              {rightRailOpen ? <ChevronRight className="w-5 h-5" aria-hidden="true" /> : <ChevronLeft className="w-5 h-5" aria-hidden="true" />}
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            {rightRailOpen && <StatePanel circuit={circuit} facts={factsPacket} bitOrder={bitOrder} />}
          </div>
        </aside>

        {/* Non-modal tutor drawer: overlays the state panel, canvas stays interactive */}
        <TutorDrawer
          onAsk={async (question) => {
            if (!factsPacket) return;
            pushQuestion(question);
            setStreaming(true);
            clearExplanation();
            for await (const event of api.ask(question, factsPacket, level)) {
              if (event.type === 'token') appendExplanation(event.content || '');
              else if (event.type === 'fallback') setFallback(true);
              else if (event.type === 'done') break;
            }
            setStreaming(false);
            commitExplanation();
          }}
        />
      </div>
    </div>
  );
}