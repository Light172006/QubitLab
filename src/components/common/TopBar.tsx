import { useNavigate } from 'react-router-dom';
import { TutorButton } from '../tutor/TutorButton';
import { useAuthStore } from '../../store';
import { api } from '../../api/client';
import { LogOut } from 'lucide-react';

interface TopBarProps {
  level: 'beginner' | 'intermediate';
  setLevel: (level: 'beginner' | 'intermediate') => void;
  bitOrder: 'qiskit' | 'canvas';
  setBitOrder: (order: 'qiskit' | 'canvas') => void;
  onSandboxClick: () => void;
}

/** Scroll the Challenges list into view once Home has mounted it. */
function revealChallenges() {
  const scroll = () => document.getElementById('challenges')?.scrollIntoView({ behavior: 'smooth' });
  scroll();
  // Coming from another page the section may not exist yet this tick.
  window.setTimeout(scroll, 60);
}

/** Navbar. Backend and Shots live in the canvas toolbar, not here. */
export function TopBar({ level, setLevel, bitOrder, setBitOrder, onSandboxClick }: TopBarProps) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logoutFromStore = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    await api.logout();
    logoutFromStore();
    navigate('/login', { replace: true });
  };

  const navItem =
    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors';

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <span className="text-2xl font-mono font-bold text-navy">Q</span>
            <span className="font-bold text-navy">QubitLab</span>
          </span>
          <nav className="hidden md:flex items-center gap-1" aria-label="Main">
            <button
              className={`${navItem} text-brand-text bg-brand-tint`}
              aria-current="page"
              onClick={() => navigate('/learn')}
            >
              Learn
            </button>
            <button
              className={`${navItem} text-muted hover:text-text hover:bg-gray-100`}
              onClick={() => {
                navigate('/learn');
                revealChallenges();
              }}
            >
              Challenges
            </button>
            <button
              className={`${navItem} text-muted hover:text-text hover:bg-gray-100`}
              onClick={onSandboxClick}
            >
              Sandbox
            </button>
            <button
              className={`${navItem} text-muted hover:text-text hover:bg-gray-100`}
              onClick={() => navigate('/progress')}
            >
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

          {/* Signing out was only reachable from Learn, Progress and the
              dashboard, so the workspace had no way out. */}
          {user && (
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-muted hover:text-text hover:bg-gray-100 transition-colors"
              aria-label="Log out"
              title={`Log out ${user.name}`}
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span className="hidden lg:inline">{user.name}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}