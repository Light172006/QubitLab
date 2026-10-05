import { Challenge } from '../../types';
import { Trophy, Target, Lightbulb, AlertCircle, CheckCircle, XCircle, ChevronRight } from 'lucide-react';

export interface ChallengeResult {
  passed: boolean;
  fidelity: number;
  message: string;
  /** max(10, 100 - 10 per hint - 5 per extra gate). */
  score: number;
}

export interface ChallengePanelProps {
  challenge: Challenge;
  attempts: number;
  hintsUsed: number[];
  result: ChallengeResult | null;
  onHint: (level: number) => void;
  onCheck: () => void;
}

export function ChallengePanel({
  challenge,
  attempts,
  hintsUsed,
  result,
  onHint,
  onCheck,
}: ChallengePanelProps) {
  const maxHints = challenge.max_hints;
  // One level at a time: only the next unused hint is unlocked, so the ladder
  // cannot be skipped and locked hints are not readable (or announced) early.
  const nextHint = Array.from({ length: maxHints }, (_, i) => i + 1).find((h) => !hintsUsed.includes(h));
  const availableHints = nextHint === undefined ? [] : [nextHint];

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Target Preview */}
      <div className="bg-purple-tint border border-purple/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-purple" aria-hidden="true" />
          <span className="font-medium text-text">Target State</span>
        </div>
        <p className="font-mono text-brand-text text-lg">{challenge.target_spec.state}</p>
        <p className="text-label text-muted mt-1">Fidelity threshold: ≥ 0.99</p>
      </div>

      {/* Attempts */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted">Attempts:</span>
        <span className="font-mono font-medium text-text">{attempts}</span>
      </div>

      {/* Hint Ladder */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium text-text">Hints</span>
          <span className="text-label font-medium text-muted">{hintsUsed.length} / {maxHints} used</span>
        </div>
        {challenge.hints.map((hint, idx) => {
          const hintLevel = idx + 1;
          const used = hintsUsed.includes(hintLevel);
          const available = availableHints.includes(hintLevel);
          // Text stays hidden until the level is unlocked, and out of the
          // accessible name too, so a screen reader is not given the answer.
          const revealed = used || available;
          return (
            <button
              key={hintLevel}
              onClick={() => available && onHint(hintLevel)}
              disabled={!available}
              aria-label={revealed ? `Hint ${hintLevel}: ${hint}` : `Hint ${hintLevel}`}
              title={used ? 'Hint already used' : available ? `Reveal hint ${hintLevel}` : 'Use the previous hint first'}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                used
                  ? 'bg-gray-50 border-gray-200 text-muted'
                  : available
                  ? 'bg-orange-tint border-orange/30 text-text hover:bg-orange/20'
                  : 'bg-gray-50 border-gray-200 text-muted cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-label font-bold ${
                  used ? 'bg-green text-white' : available ? 'bg-accent-text-orange text-white' : 'bg-gray-200 text-muted'
                }`}>
                  {hintLevel}
                </span>
                <span className="flex-1 text-body">{revealed ? hint : 'Locked — use the previous hint first'}</span>
                {used && <CheckCircle className="w-4 h-4 text-green" aria-label="Used" />}
                {available && !used && <Lightbulb className="w-4 h-4 text-accent-text-orange" aria-label="Available" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Check Button */}
      <button
        onClick={onCheck}
        className="w-full px-4 py-3 bg-navy text-white font-medium rounded-lg hover:bg-navy/90 transition-colors"
      >
        Check my circuit
      </button>

      {/* Result Banner */}
      {result && (
        <div className={`p-4 rounded-xl border ${result.passed ? 'bg-green-50 border-green-200' : 'bg-orange-tint border-orange/30'}`}>
          <div className="flex items-start gap-3">
            {result.passed ? (
              <CheckCircle className="w-5 h-5 text-green flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-accent-text-orange flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-medium text-text">{result.passed ? 'Challenge Passed!' : 'Not Yet'}</p>
              <p className="text-sm text-muted mt-1">
                {result.passed
                  ? `Fidelity: ${(result.fidelity * 100).toFixed(1)}%`
                  : result.message}
              </p>
              <p className="text-label font-semibold text-text mt-2">Score: {result.score}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}