import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { api } from '../api/client';
import { useEffect, useState } from 'react';
import { ArrowRight, ChevronRight, BookOpen, Trophy, Play, CheckCircle, Lock, Clock, LogOut, User } from 'lucide-react';

export default function Home() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [ls, cs, pg] = await Promise.all([api.getLessons(), api.getChallenges(), api.getProgress()]);
        setLessons(ls);
        setChallenges(cs);
        setProgress(pg);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleLogout = async () => {
    await api.logout();
    logout();
    navigate('/login', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" aria-label="Loading" />
      </div>
    );
  }

  const continueLesson = lessons.find(l => !progress?.completedLessons?.includes(l.id)) || lessons[0];

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/learn" className="flex items-center gap-2" aria-label="QubitLab Home">
            <span className="text-2xl font-mono font-bold text-navy">Q</span>
            <span className="font-bold text-navy">QubitLab</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link to="/learn" className="font-medium text-navy">Learn</Link>
            <Link to="/progress" className="text-muted hover:text-text transition-colors">Progress</Link>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted">{user?.name}</span>
              <button onClick={handleLogout} className="flex items-center gap-1 text-muted hover:text-text transition-colors" aria-label="Log out">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text">Welcome, {user?.name} 👋</h1>
          {continueLesson && (
            <Link
              to="/workspace"
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors"
            >
              <Play className="w-4 h-4" />
              Continue: {continueLesson.title} <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        <div className="grid gap-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand" aria-hidden="true" />
                Lessons
              </h2>
              <Link to="/learn" className="text-sm text-brand hover:underline">View all</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {lessons.map((lesson, idx) => {
                const isDone = progress?.completedLessons?.includes(lesson.id);
                const isCurrent = !isDone && (!progress?.completedLessons?.includes(lessons[idx - 1]?.id) || idx === 0);
                return (
                  <Link
                    key={lesson.id}
                    to="/workspace"
                    className={`relative p-5 rounded-xl border transition-all ${
                      isDone
                        ? 'bg-green-50 border-green-200'
                        : isCurrent
                        ? 'bg-blue-50 border-brand'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {isDone && (
                      <div className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 rounded-full bg-green text-white">
                        <CheckCircle className="w-4 h-4" aria-hidden="true" />
                      </div>
                    )}
                    {!isDone && idx > 0 && !progress?.completedLessons?.includes(lessons[idx - 1]?.id) && (
                      <div className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 rounded-full bg-muted text-white">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        isDone ? 'bg-green text-white' : isCurrent ? 'bg-brand text-white' : 'bg-gray-200 text-muted'
                      }`}>
                        {lesson.order}
                      </span>
                      <h3 className="font-medium text-text">{lesson.title}</h3>
                    </div>
                    <p className="text-sm text-muted mb-3">{lesson.description}</p>
                    <div className="flex items-center gap-2 text-label text-muted">
                      <span>{lesson.steps?.length || 0} steps</span>
                      {isDone && <span className="text-green font-medium">Completed</span>}
                      {isCurrent && !isDone && <span className="text-brand-text font-medium">In progress</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text flex items-center gap-2">
                <Trophy className="w-5 h-5 text-accent-text-orange" aria-hidden="true" />
                Challenges
              </h2>
              <span className="text-sm text-muted">
                {progress?.challengesSolved || 0} / {challenges.length} solved
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {challenges.map((challenge) => (
                <Link
                  key={challenge.id}
                  to={`/challenge/${challenge.id}`}
                  className="p-5 rounded-xl bg-white border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <h3 className="font-medium text-text mb-1">{challenge.title}</h3>
                  <p className="text-sm text-muted">Fidelity check: ≥ 0.99</p>
                  <div className="mt-3 flex items-center gap-2 text-label text-muted">
                    <span>Max hints: {challenge.max_hints}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <Link to="/workspace" className="block p-6 rounded-xl bg-white border border-gray-200 hover:border-brand hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-navy/10 text-navy">
                  <Play className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-medium text-text">Open Sandbox</h3>
                  <p className="text-sm text-muted">Free circuit building — no lessons, no limits</p>
                </div>
              </div>
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}