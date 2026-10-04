import { useEffect } from 'react';
import { Lesson, LessonStep, FactsPacket } from '../../types';
import { CheckCircle, ChevronRight, HelpCircle, CircleCheck } from 'lucide-react';
import { useLessonStore } from '../../store';

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
  const position = facts.num_qubits - 1 - qubit;
  const out: Record<string, number> = { '0': 0, '1': 0 };
  for (const [state, prob] of Object.entries(facts.probabilities)) {
    const bit = state[position] === '1' ? '1' : '0';
    out[bit] = (out[bit] || 0) + prob;
  }
  return out;
}

function targetsMatch(
  actual: Record<string, number>,
  target: Record<string, number>,
  tol: number
): boolean {
  return Object.entries(target).every(
    ([key, value]) => Math.abs((actual[key] ?? 0) - value) <= tol
  );
}

/**
 * A step is complete when the live circuit satisfies its check_spec:
 * probability steps compare against a qubit marginal (single-bit
 * targets) or the full distribution, entanglement steps check the
 * entangled qubit list.
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
    const tol = spec.tol ?? 0.05;
    const targetKeys = Object.keys(spec.target);
    if (targetKeys.every((k) => k === '0' || k === '1')) {
      // Single-qubit marginal: any wire may satisfy the step.
      for (let q = 0; q < facts.num_qubits; q++) {
        if (targetsMatch(marginalProbabilities(facts, q), spec.target, tol)) {
          return true;
        }
      }
      return false;
    }
    if (targetKeys.every((k) => k.length === facts.num_qubits)) {
      return targetsMatch(facts.probabilities, spec.target, tol);
    }
  }

  return false;
}

export function LessonPlayer({
  lesson,
  currentStepIndex,
  onStepChange,
  onStepComplete,
  circuit,
  facts,
}: LessonPlayerProps) {
  const step = lesson.steps[currentStepIndex];
  const completedSteps = lesson.steps.slice(0, currentStepIndex);
  const remainingSteps = lesson.steps.slice(currentStepIndex + 1);
  // The store tracks every completed step id, so the count reflects
  // real completions rather than the position of the current step.
  const { completedSteps: completedIds } = useLessonStore();
  const doneCount = completedIds.size;
  const currentSatisfied = step ? stepCheckPassed(step, facts) : false;

  // Auto-detect: the moment the circuit satisfies the current step,
  // complete it (the store auto-advances to the next step).
  useEffect(() => {
    if (step && !completedIds.has(step.id) && currentSatisfied) {
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
            <button
              className="ml-auto px-3 py-1.5 text-sm bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors"
              onClick={() => onStepComplete(step.id)}
            >
              Mark Complete
            </button>
          </div>
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
                <span className="w-4 h-4 flex-shrink-0 text-label">{currentStepIndex + idx + 2}</span>
                <span>{s.instruction}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Hint */}
      <button className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-muted hover:bg-gray-50 transition-colors">
        <HelpCircle className="w-4 h-4 inline mr-1" aria-hidden="true" />
        Get a hint
      </button>
    </div>
  );
}
