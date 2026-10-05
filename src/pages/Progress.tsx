import { useEffect, useState } from 'react';
import { useAuthStore } from '../store';
import { api } from '../api/client';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Trophy, ArrowRight, CheckCircle, Lock, ChevronRight, LogOut, User, ArrowLeft } from 'lucide-react';

export default function Progress() {
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

  const completedLessons = progress?.completedLessons || [];
  const completedChallenges = progress?.completedChallenges || [];

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/learn" className="flex items-center gap-2" aria-label="QubitLab Home">
            <span className="text-2xl font-mono font-bold text-navy">Q</span>
            <span className="font-bold text-navy">QubitLab</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link to="/learn" className="text-muted hover:text-text transition-colors">Learn</Link>
            <Link to="/progress" className="font-medium text-navy">Progress</Link>
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
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => navigate('/learn')} className="p-2 rounded-lg hover:bg-gray-100 text-muted" aria-label="Back to Learn">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-text">Your Progress</h1>
          </div>
          <p className="text-muted">Track your learning journey</p>
        </div>

        <div className="grid gap-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-xl border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-navy/10 text-navy">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-text">{completedLessons.length} / {lessons.length}</p>
                  <p className="text-sm text-muted">Lessons Completed</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-orange-tint text-accent-text-orange">
                  <Trophy className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-text">{completedChallenges.length} / {challenges.length}</p>
                  <p className="text-sm text-muted">Challenges Solved</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-tint text-green">
                  <CheckCircle className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-text">{Math.round((completedLessons.length / lessons.length) * 100)}%</p>
                  <p className="text-sm text-muted">Overall Progress</p>
                </div>
              </div>
            </div>
          </div>

          {/* Lessons Progress */}
          <section>
            <h2 className="text-lg font-semibold text-text flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-brand" />
              Lessons
            </h2>
            <div className="space-y-3">
              {lessons.map((lesson, idx) => {
                const isDone = completedLessons.includes(lesson.id);
                const isCurrent = !isDone && (!completedLessons.includes(lessons[idx - 1]?.id) || idx === 0);
                const isLocked = !isDone && idx > 0 && !completedLessons.includes(lessons[idx - 1]?.id);
                const stepProgress = progress?.lessonSteps?.[lesson.id] || 0;
                const body = (
                  <div className="flex items-center gap-4">
                    <span className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${
                      isDone ? 'bg-green text-white' : isCurrent ? 'bg-brand text-white' : 'bg-gray-200 text-muted'
                    }`}>
                      {lesson.order}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-text truncate">{lesson.title}</h3>
                        {isDone && <CheckCircle className="w-5 h-5 text-green flex-shrink-0" />}
                        {isCurrent && !isDone && <span className="px-2 py-1 text-label font-medium bg-brand-tint text-brand-text rounded-full">In Progress</span>}
                        {isLocked && <Lock className="w-4 h-4 text-muted flex-shrink-0" aria-label="Locked" />}
                      </div>
                      <div className="mt-1 flex items-center gap-3">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand rounded-full transition-all"
                            style={{ width: `${(stepProgress / (lesson.steps?.length || 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted w-20 text-right">
                          {stepProgress} / {lesson.steps?.length || 0}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted flex-shrink-0" />
                  </div>
                );
                const shell = `relative block p-5 rounded-xl border transition-all ${
                  isDone
                    ? 'bg-green-50 border-green-200'
                    : isCurrent
                    ? 'bg-blue-50 border-brand'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`;
                // ?lesson= matters: every row used to link to a bare /workspace,
                // which always opened lesson 1.
                return isLocked ? (
                  <div key={lesson.id} className={shell} aria-disabled="true">
                    {body}
                  </div>
                ) : (
                  <Link key={lesson.id} to={`/workspace?lesson=${lesson.id}`} className={shell}>
                    {body}
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Challenges Progress */}
          <section>
            <h2 className="text-lg font-semibold text-text flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-accent-text-orange" aria-hidden="true" />
              Challenges
            </h2>
            <div className="space-y-3">
              {challenges.map((challenge) => {
                const isDone = completedChallenges.includes(challenge.id);
                const attempts = progress?.challengeAttempts?.[challenge.id] || 0;
                return (
                  <div className={`p-5 rounded-xl border transition-all ${isDone ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${isDone ? 'bg-green text-white' : 'bg-gray-200 text-muted'}`}>
                        {isDone ? <CheckCircle className="w-5 h-5" /> : <Trophy className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-text">{challenge.title}</h3>
                        <p className="text-sm text-muted mt-1">Target: {challenge.target_spec.state} | Max hints: {challenge.max_hints}</p>
                      </div>
                      {isDone ? (
                        <span className="px-3 py-1 text-sm bg-green-tint text-green font-medium rounded-full">Solved</span>
                      ) : (
                        <span className="px-3 py-1 text-sm bg-gray-100 text-muted rounded-full">{attempts} attempts</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recommended Next */}
          <section>
            <h2 className="text-lg font-semibold text-text flex items-center gap-2 mb-4">
              <ArrowRight className="w-5 h-5 text-brand" />
              Recommended Next
            </h2>
            <div className="bg-white p-5 rounded-xl border border-gray-100">
              {lessons.find(l => !completedLessons.includes(l.id)) ? (
                <Link to={`/workspace?lesson=${lessons.find((l) => !completedLessons.includes(l.id))?.id}`} className="block">
                  <p className="text-sm text-muted mb-1">Continue Learning</p>
                  <p className="font-medium text-text">Lesson {lessons.find(l => !completedLessons.includes(l.id))?.order}: {lessons.find(l => !completedLessons.includes(l.id))?.title}</p>
                </Link>
              ) : (
                <p className="text-muted">All lessons completed! Try the challenges or open sandbox.</p>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}