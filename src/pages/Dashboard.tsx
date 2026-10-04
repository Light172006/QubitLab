import { useEffect, useState } from 'react';
import { useAuthStore } from '../store';
import { api } from '../api/client';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Download, LogOut, User, ArrowLeft, AlertTriangle, TrendingUp, Award, BookOpen, Users } from 'lucide-react';

const COLORS = ['#1F497D', '#0070C0', '#6B4E8E', '#4BACC6', '#F79646', '#3F6212'];

export default function Dashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [csvData, setCsvData] = useState<string>('');

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getInstructorOverview();
        setOverview(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleExportCsv = async () => {
    try {
      const csv = await api.exportCsv();
      setCsvData(csv);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'class-progress.csv';
      link.click();
    } catch (e) {
      console.error(e);
    }
  };

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

  if (!overview) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Failed to load dashboard</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2" aria-label="QubitLab Dashboard">
            <span className="text-2xl font-mono font-bold text-navy">Q</span>
            <span className="font-bold text-navy">QubitLab</span>
            <span className="px-2 py-0.5 text-label font-medium bg-purple-tint text-purple rounded-full">Instructor</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
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
          <h1 className="text-2xl font-bold text-text">Instructor Dashboard</h1>
          <p className="text-muted mt-1">Class: Quantum 101</p>
        </div>

        <div className="grid gap-8">
          {/* Completion by Lesson */}
          <section className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-text flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand" />
                Completion by Lesson
              </h2>
              <select className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand focus:border-transparent">
                <option>All lessons</option>
                <option>Lesson 1</option>
                <option>Lesson 2</option>
                <option>Lesson 3</option>
              </select>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview.completion_by_lesson} layout="vertical" accessibilityLayer>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" tick={{ fontSize: 13, fill: '#4B5563' }} domain={[0, 100]} />
                  <YAxis type="category" dataKey="title" tick={{ fontSize: 13, fill: '#111827' }} width={120} />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, 'Completion']}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                  />
                  <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                    {overview.completion_by_lesson.map((_: any, i: number) => (
                      <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Top Mistakes & Student Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-text flex items-center gap-2 mb-6">
                <AlertTriangle className="w-5 h-5 text-accent-text-orange" aria-hidden="true" />
                Top Mistakes
              </h2>
              <div className="space-y-4">
                {overview.top_mistakes.map((mistake: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-tint text-accent-text-orange font-bold text-sm">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text truncate">{mistake.mistake}</p>
                    </div>
                    <span className="px-3 py-1 text-sm bg-orange-tint text-accent-text-orange rounded-full font-medium">
                      {mistake.count} students
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-text flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand" />
                  Student Progress
                </h2>
                <button
                  onClick={handleExportCsv}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-muted">
                      <th className="pb-3 font-medium">Student</th>
                      <th className="pb-3 font-medium text-center">Lessons</th>
                      <th className="pb-3 font-medium text-center">Challenges</th>
                      <th className="pb-3 font-medium text-center">Last Active</th>
                      <th className="pb-3 font-medium text-center">Status</th>
                      <th className="pb-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.students.map((student: any) => (
                      <tr key={student.user_id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 font-medium text-text">Student {student.user_id}</td>
                        <td className="py-3 text-center text-muted">{student.lessons_completed}/{student.total_lessons}</td>
                        <td className="py-3 text-center text-muted">{student.challenges_solved}/{student.total_challenges}</td>
                        <td className="py-3 text-center text-muted">{student.last_active}</td>
                        <td className="py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-label font-medium ${
                            student.status === 'on_track' ? 'bg-green-tint text-green' : 'bg-orange-tint text-accent-text-orange'
                          }`}>
                            {student.status === 'on_track' ? (
                              <>
                                <TrendingUp className="w-3 h-3" />
                                On track
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3 h-3" />
                                Stuck
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <button className="text-brand hover:underline text-sm">Open</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}