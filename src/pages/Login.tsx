import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { api } from '../api/client';
import { UserIcon, GraduationCap, Award } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'instructor'>('student');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    setError('');
    try {
      const user = await api.login(name.trim(), role);
      setUser(user);
      navigate(role === 'instructor' ? '/dashboard' : '/learn', { replace: true });
    } catch {
      setError('Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-navy text-white mb-4">
            <span className="text-2xl font-mono font-bold">Q</span>
          </div>
          <h1 className="text-2xl font-bold text-navy">QubitLab</h1>
          <p className="text-muted mt-1">Quantum Circuit Sandbox</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text mb-1">
              Your Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent transition-colors"
              placeholder="Enter your name"
              autoFocus
            />
          </div>

          <fieldset>
            <legend className="block text-sm font-medium text-text mb-3">Role</legend>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                role="radio"
                aria-checked={role === 'student'}
                onClick={() => setRole('student')}
                className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                  role === 'student'
                    ? 'border-brand bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <GraduationCap className={`w-5 h-5 ${role === 'student' ? 'text-brand' : 'text-muted'}`} aria-hidden="true" />
                  <div>
                    <p className="font-medium text-text">Student</p>
                    <p className="text-label text-muted">Learn and practice</p>
                  </div>
                </div>
                {role === 'student' && (
                  <span className="absolute inset-0 border-2 border-brand rounded-lg pointer-events-none" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={role === 'instructor'}
                onClick={() => setRole('instructor')}
                className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                  role === 'instructor'
                    ? 'border-brand bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Award className={`w-5 h-5 ${role === 'instructor' ? 'text-brand' : 'text-muted'}`} aria-hidden="true" />
                  <div>
                    <p className="font-medium text-text">Instructor</p>
                    <p className="text-label text-muted">Monitor progress</p>
                  </div>
                </div>
                {role === 'instructor' && (
                  <span className="absolute inset-0 border-2 border-brand rounded-lg pointer-events-none" aria-hidden="true" />
                )}
              </button>
            </div>
          </fieldset>

          {error && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-navy text-white font-medium rounded-lg hover:bg-navy/90 focus:ring-2 focus:ring-brand focus:ring-offset-2 transition-colors"
          >
            Continue
          </button>
        </form>

        <p className="mt-6 text-center text-label text-muted">
          Demo mode — no real authentication
        </p>
      </div>
    </div>
  );
}