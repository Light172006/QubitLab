import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCircuitStore, useUIStore, useLessonStore, useChallengeStore, useTutorStore, useCodeStore } from '../store';
import { api } from '../api/client';
import { CircuitCanvas } from '../components/canvas/CircuitCanvas';
import { CanvasToolbar } from '../components/canvas/CanvasToolbar';
import { StatePanel } from '../components/state/StatePanel';
import { TutorDrawer } from '../components/tutor/TutorDrawer';
import { CodeEditor } from '../components/canvas/CodeEditor';
import { LessonPlayer } from '../components/lessons/LessonPlayer';
import { TopBar } from '../components/common/TopBar';
import { ChevronLeft, ChevronRight, Code, LayoutGrid } from 'lucide-react';

export default function Workspace() {
  const navigate = useNavigate();
  const { circuit, setCircuit, undo, redo, reset, historyIndex, history } = useCircuitStore();
  const { level, bitOrder, leftRailOpen, rightRailOpen, setLeftRailOpen, setRightRailOpen } = useUIStore();
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
    const timeout = setTimeout(async () => {
      const result = await api.simulate(circuit, useUIStore.getState().shots);
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
      // Files this explanation into the tutor scrollback, open drawer or not.
      commitExplanation();
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circuit]);

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

        {/* Center - Canvas/Code */}
        <main className="flex-1 flex flex-col min-w-0">
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

          <div className="flex-1 overflow-auto p-4">
            {activeTab === 'canvas' ? (
              <CircuitCanvas
                circuit={circuit}
                onChange={handleCircuitChange}
                numQubits={circuit.num_qubits}
              />
            ) : (
              <CodeEditor
                code={code}
                onChange={handleCodeChange}
                syncStatus={syncStatus}
                errors={errors}
                onSync={syncCodeToCanvas}
              />
            )}
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