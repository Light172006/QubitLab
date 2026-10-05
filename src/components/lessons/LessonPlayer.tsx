import { useEffect, useState } from 'react';
import { Lesson, LessonStep, FactsPacket } from '../../types';
import { CheckCircle, ChevronRight, HelpCircle, CircleCheck, Lightbulb } from 'lucide-react';
import { useLessonStore } from '../../store';
import { qubitMarginal, probabilitiesMatch } from '../../mock/content';

interface LessonPlayerProps {
  lesson: Lesson;
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  onStepComplete: (stepId: string) => void;
  circuit: any;
  /** Live simulation facts, used to auto-detect completed steps. */
  facts: FactsPacket | null;
}

/**
 * Marginal probability of one qubit (Qiskit order: qubit 0 is the
 * right-most bit of each state key).
 */
export function marginalProbabilities(
  facts: FactsPacket,
  qubit: number
): Record<string, number> {
  return qubitMarginal(facts.probabilities, facts.num_qubits, qubit);
}

/**
 * A step is complete when the live circuit satisfies its check_spec:
 * probability steps compare against a qubit marginal (single-bit
 * targets) or the full distribution, entanglement steps check the
 * entangled qubit list. Both comparisons live in mock/content so this
 * panel and api.checkLessonStep cannot drift apart.
 */
export function stepCheckPassed(
  step: LessonStep,
  facts: FactsPacket | null
): boolean {
  if (!facts) return false;
  const spec = step.check_spec;

  if (spec.type === 'entangled') {
    return (spec.qubits ?? []).every((q) => facts.entangled_qubits.includes(q));
  }

  if (spec.type === 'probability' && spec.target) {
    return probabilitiesMatch(facts.probabilities, facts.num_qubits, spec.target, spec.tol ?? 0.05);
  }

  return false;
}

/**
 * Lesson hints are generic: the step's own instruction
 * and tutor_context already carry the specific guidance.
 */
const LESSON_HINTS = [
  'Watch the Live State panel — it updates the moment you place a gate.',
  'The step completes automatically once the circuit matches the instruction above.',
];

export function LessonPlayer({
  lesson,
  currentStepIndex,
  onStepChange,
  onStepComplete,
  circuit,
  facts,
}: LessonPlayerProps) {
  const step = lesson.steps[currentStepIndex];
  // The store tracks every completed step id, so the count and the lists below
  // reflect real completions rather than the position of the current step.
  const { completedSteps: completedIds } = useLessonStore();
  const doneCount = completedIds.length;
  const completedSteps = lesson.steps.filter((s) => completedIds.includes(s.id));
  const remainingSteps = lesson.steps.filter((s) => !completedIds.includes(s.id) && s.id !== step?.id);
  const currentSatisfied = step ? stepCheckPassed(step, facts) : false;
  // Manual completion is a fallback, offered only after two hints.
  const [hintsUsed, setHintsUsed] = useState(0);

  // Hints reset per step.
  useEffect(() => {
    setHintsUsed(0);
  }, [step?.id]);

  // Auto-detect: the moment the circuit satisfies the current step,
  // complete it (the store auto-advances to the next step).
  useEffect(() => {
    if (step && !completedIds.includes(step.id) && currentSatisfied) {
      onStepComplete(step.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id, currentSatisfied, completedIds]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-label">
          <span className="text-label font-semibold uppercase tracking-wide text-muted">Progress</span>
          <span className="font-medium text-text">{doneCount} / {lesson.steps.length} steps</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all"
            style={{ width: `${(doneCount / lesson.steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current Step */}
      {step && (
        <div className="bg-blue-50 border border-brand/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold">
              {currentStepIndex + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-text">{step.instruction}</p>
              <p className="text-sm text-muted mt-1">{step.tutor_context}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {currentSatisfied ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-green font-medium">
                <CircleCheck className="w-4 h-4" aria-hidden="true" />
                Detected in your circuit
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                <HelpCircle className="w-4 h-4" aria-hidden="true" />
                Build the circuit to complete this step
              </span>
            )}
            {/* Manual complete: fallback only after two hints. */}
            {hintsUsed >= LESSON_HINTS.length && (
              <button
                className="ml-auto px-3 py-1.5 text-sm bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors"
                onClick={() => onStepComplete(step.id)}
              >
                Mark Complete
              </button>
            )}
          </div>
          {hintsUsed > 0 && (
            <p className="mt-2 text-sm text-muted">
              <Lightbulb className="w-4 h-4 inline mr-1" aria-hidden="true" />
              {LESSON_HINTS[hintsUsed - 1]}
            </p>
          )}
        </div>
      )}

      {/* Completed Steps */}
      {completedSteps.length > 0 && (
        <details className="group">
          <summary className="flex items-center gap-2 text-sm font-medium text-text cursor-pointer">
            <ChevronRight className="w-4 h-4 text-muted group-open:rotate-90 transition-transform" aria-hidden="true" />
            Completed Steps ({completedSteps.length})
          </summary>
          <div className="mt-2 space-y-2 pl-6 border-l border-gray-200">
            {completedSteps.map((s, idx) => (
              <div key={s.id} className="flex items-center gap-2 text-body text-green">
                <CheckCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span>{idx + 1}. {s.instruction}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Remaining Steps */}
      {remainingSteps.length > 0 && (
        <details className="group">
          <summary className="flex items-center gap-2 text-sm font-medium text-text cursor-pointer">
            <ChevronRight className="w-4 h-4 text-muted group-open:rotate-90 transition-transform" aria-hidden="true" />
            Upcoming Steps ({remainingSteps.length})
          </summary>
          <div className="mt-2 space-y-2 pl-6 border-l border-gray-200">
            {remainingSteps.map((s, idx) => (
              <div key={s.id} className="flex items-center gap-2 text-sm text-muted">
                <span className="w-4 h-4 flex-shrink-0 text-label">{lesson.steps.indexOf(s) + 1}</span>
                <span>{s.instruction}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Hint: reveals one at a time, up to two. */}
      <button
        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-muted hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => setHintsUsed((h) => Math.min(h + 1, LESSON_HINTS.length))}
        disabled={hintsUsed >= LESSON_HINTS.length}
      >
        <HelpCircle className="w-4 h-4 inline mr-1" aria-hidden="true" />
        {hintsUsed === 0
          ? 'Get a hint'
          : hintsUsed >= LESSON_HINTS.length
            ? 'No more hints'
            : `Hint ${hintsUsed + 1}`}
      </button>
    </div>
  );
}
