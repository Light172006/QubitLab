import { TutorButton } from '../tutor/TutorButton';

interface TopBarProps {
  level: 'beginner' | 'intermediate';
  setLevel: (level: 'beginner' | 'intermediate') => void;
  bitOrder: 'qiskit' | 'canvas';
  setBitOrder: (order: 'qiskit' | 'canvas') => void;
  onSandboxClick: () => void;
}

/** Navbar. Backend and Shots live in the canvas toolbar, not here. */
export function TopBar({ level, setLevel, bitOrder, setBitOrder, onSandboxClick }: TopBarProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <span className="text-2xl font-mono font-bold text-navy">Q</span>
            <span className="font-bold text-navy">QubitLab</span>
          </span>
          <nav className="hidden md:flex items-center gap-1" aria-label="Main">
            <button className="px-3 py-1.5 rounded-lg text-sm font-medium text-brand-text bg-brand-tint">
              Learn
            </button>
            <button className="px-3 py-1.5 rounded-lg text-sm font-medium text-muted hover:text-text hover:bg-gray-100">
              Challenges
            </button>
            <button
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-muted hover:text-text hover:bg-gray-100"
              onClick={onSandboxClick}
            >
              Sandbox
            </button>
            <button className="px-3 py-1.5 rounded-lg text-sm font-medium text-muted hover:text-text hover:bg-gray-100">
              Progress
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* Level Toggle */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-label font-medium text-muted">Level</span>
            <div className="inline-flex rounded-lg bg-gray-100 p-1" role="group" aria-label="Explanation level">
              <button
                onClick={() => setLevel('beginner')}
                aria-pressed={level === 'beginner'}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  level === 'beginner' ? 'bg-white text-navy shadow-sm' : 'text-muted hover:text-text'
                }`}
              >
                Beginner
              </button>
              <button
                onClick={() => setLevel('intermediate')}
                aria-pressed={level === 'intermediate'}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  level === 'intermediate' ? 'bg-white text-navy shadow-sm' : 'text-muted hover:text-text'
                }`}
              >
                Intermediate
              </button>
            </div>
          </div>

          {/* Bit Order Toggle */}
          <div
            className="hidden lg:flex items-center gap-2"
            title="Qiskit order shows qubit 0 as the right-most bit"
          >
            <span className="text-label font-medium text-muted">Bit order</span>
            <div
              className="inline-flex rounded-lg bg-gray-100 p-1"
              role="group"
              aria-label="Bit order: Qiskit order shows qubit 0 as the right-most bit"
            >
              <button
                onClick={() => setBitOrder('qiskit')}
                aria-pressed={bitOrder === 'qiskit'}
                title="Qiskit order: qubit 0 is the right-most bit"
                className={`px-2.5 py-1.5 text-label font-medium rounded-md transition-colors ${
                  bitOrder === 'qiskit' ? 'bg-navy text-white' : 'text-muted hover:text-text'
                }`}
              >
                q1q0
              </button>
              <button
                onClick={() => setBitOrder('canvas')}
                aria-pressed={bitOrder === 'canvas'}
                title="Canvas order: qubit 0 is the left-most bit"
                className={`px-2.5 py-1.5 text-label font-medium rounded-md transition-colors ${
                  bitOrder === 'canvas' ? 'bg-navy text-white' : 'text-muted hover:text-text'
                }`}
              >
                q0q1
              </button>
            </div>
          </div>

          <TutorButton />
        </div>
      </div>
    </header>
  );
}