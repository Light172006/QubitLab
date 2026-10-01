import { Lesson, LessonStep } from '../../types';
import { CheckCircle, ChevronRight, AlertCircle, HelpCircle, Clock } from 'lucide-react';

interface LessonPlayerProps {
  lesson: Lesson;
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  onStepComplete: (stepId: string) => void;
  circuit: any;
}

export function LessonPlayer({
  lesson,
  currentStepIndex,
  onStepChange,
  onStepComplete,
  circuit,
}: LessonPlayerProps) {
  const step = lesson.steps[currentStepIndex];
  const completedSteps = lesson.steps.slice(0, currentStepIndex);
  const remainingSteps = lesson.steps.slice(currentStepIndex + 1);

  const isStepComplete = (stepId: string) => {
    // In a real implementation, this would check against the circuit state
    return false;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-label">
          <span className="text-label font-semibold uppercase tracking-wide text-muted">Progress</span>
          <span className="font-medium text-text">{currentStepIndex + 1} / {lesson.steps.length}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all"
            style={{ width: `${((currentStepIndex + 1) / lesson.steps.length) * 100}%` }}
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
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-400 accent-brand focus:ring-brand"
              />
              <span className="text-sm text-text">Step done</span>
            </label>
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
            <ChevronRight className="w-4 h-4 text-muted group-open:rotate-90 transition-transform" />
            Completed Steps ({completedSteps.length})
          </summary>
          <div className="mt-2 space-y-2 pl-6 border-l border-gray-200">
            {completedSteps.map((s, idx) => (
              <div key={s.id} className="flex items-center gap-2 text-body text-green">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
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
            <ChevronRight className="w-4 h-4 text-muted group-open:rotate-90 transition-transform" />
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
        <HelpCircle className="w-4 h-4 inline mr-1" />
        Get a hint
      </button>
    </div>
  );
}