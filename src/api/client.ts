import type { Circuit, SimulateResponse, FactsPacket, TutorEvent, Lesson, Challenge, User, InstructorOverview, StudentProgress } from '../types';

const USE_MOCK = (import.meta as any).env?.VITE_USE_MOCK !== 'false';
const API_BASE = (import.meta as any).env?.VITE_API_URL || '';

const mockDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const MOCK_USER_KEY = 'qubitlab_mock_user';

/** Mock user carries the email too; the User type has no email field, so we
 *  widen it locally rather than change the shared contract. */
type MockUser = User & { email: string };

let mockLessons: Lesson[] = [];
let mockChallenges: Challenge[] = [];

function readMockUser(): MockUser | null {
  try {
    const raw = localStorage.getItem(MOCK_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.id) return null;
    return parsed as MockUser;
  } catch {
    return null;
  }
}

function makeMockUser(email: string, name: string, role?: 'student' | 'instructor'): MockUser {
  const emailValue = email.trim();
  const resolvedRole =
    role ?? (emailValue.toLowerCase().includes('instructor') ? 'instructor' : 'student');
  const user: MockUser = {
    id: `mock-${emailValue.toLowerCase()}`,
    email: emailValue,
    name: name.trim() || emailValue.split('@')[0] || 'Learner',
    role: resolvedRole,
    token: 'mock-token',
  };
  localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user));
  return user;
}

export const api = {
  async register(email: string, password: string, name: string, role?: 'student' | 'instructor'): Promise<User> {
    if (USE_MOCK) {
      if (!email.trim() || !password.trim()) {
        throw new Error('Please fill out all required fields');
      }
      return makeMockUser(email, name, role);
    }
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.detail || 'Registration failed');
    }
    const tokenData = await res.json();
    localStorage.setItem('qubitlab_token', tokenData.access_token);
    return this.getCurrentUser() as Promise<User>;
  },

  async login(email: string, password: string): Promise<User> {
    if (USE_MOCK) {
      if (!email.trim() || !password.trim()) {
        throw new Error('Please fill out all required fields');
      }
      return makeMockUser(email, '');
    }
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.detail || 'Login failed');
    }
    const tokenData = await res.json();
    localStorage.setItem('qubitlab_token', tokenData.access_token);
    return this.getCurrentUser() as Promise<User>;
  },

  async getCurrentUser(): Promise<User | null> {
    if (USE_MOCK) {
      return readMockUser();
    }
    const token = localStorage.getItem('qubitlab_token');
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('qubitlab_token');
        }
        return null;
      }
      return await res.json();
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    if (USE_MOCK) {
      localStorage.removeItem(MOCK_USER_KEY);
      return;
    }
    localStorage.removeItem('qubitlab_token');
  },

  async simulate(circuit: Circuit, shots = 1024): Promise<SimulateResponse> {
    await mockDelay(200);
    const { simulateCircuit } = await import('../mock/simulator');
    return simulateCircuit(circuit, shots);
  },

  async parseCode(code: string): Promise<{ circuit: Circuit } | { errors: Array<{ line: number; code: string; message: string }> }> {
    await mockDelay(150);
    const { parseCode } = await import('../mock/codeParser');
    return parseCode(code);
  },

  async circuitToCode(circuit: Circuit): Promise<string> {
    await mockDelay(50);
    const { toCode } = await import('../mock/codeParser');
    return toCode(circuit);
  },

  async *explain(facts: FactsPacket, level: 'beginner' | 'intermediate'): AsyncGenerator<TutorEvent> {
    const { generateExplanation } = await import('../mock/tutor');
    yield* generateExplanation(facts, level);
  },

  async *ask(question: string, facts: FactsPacket, level: 'beginner' | 'intermediate'): AsyncGenerator<TutorEvent> {
    const { answerQuestion } = await import('../mock/tutor');
    yield* answerQuestion(question, facts, level);
  },

  async getLessons(): Promise<Lesson[]> {
    await mockDelay(100);
    const { getLessons } = await import('../mock/content');
    mockLessons = getLessons();
    return mockLessons;
  },

  async getLesson(id: string): Promise<Lesson | null> {
    await mockDelay(50);
    if (!mockLessons.length) await this.getLessons();
    return mockLessons.find(l => l.id === id) || null;
  },

  async checkLessonStep(lessonId: string, stepId: string, circuit: Circuit): Promise<{ passed: boolean; message: string }> {
    await mockDelay(100);
    const { checkLessonStep } = await import('../mock/content');
    return checkLessonStep(lessonId, stepId, circuit);
  },

  async getChallenges(): Promise<Challenge[]> {
    await mockDelay(100);
    const { getChallenges } = await import('../mock/content');
    mockChallenges = getChallenges();
    return mockChallenges;
  },

  async checkChallenge(challengeId: string, circuit: Circuit): Promise<{ passed: boolean; fidelity: number; message: string }> {
    await mockDelay(150);
    const { checkChallenge } = await import('../mock/content');
    return checkChallenge(challengeId, circuit);
  },

  async getHint(challengeId: string, hintLevel: number): Promise<string> {
    await mockDelay(100);
    const { getHint } = await import('../mock/content');
    return getHint(challengeId, hintLevel);
  },

  async getProgress(): Promise<StudentProgress> {
    await mockDelay(100);
    const user = USE_MOCK ? readMockUser() : null;
    if (!user) throw new Error('Not authenticated');
    const { getMockProgress } = await import('../mock/dashboardData');
    return getMockProgress(user.id);
  },

  async getInstructorOverview(): Promise<InstructorOverview> {
    await mockDelay(150);
    const user = USE_MOCK ? readMockUser() : null;
    if (!user) throw new Error('Not authenticated');
    const { getInstructorOverview } = await import('../mock/dashboardData');
    return getInstructorOverview();
  },

  async exportCsv(): Promise<string> {
    await mockDelay(200);
    const { exportCsv } = await import('../mock/dashboardData');
    return exportCsv();
  },
};

if (!USE_MOCK) {
  console.info('QubitLab is using the real API. Set VITE_USE_MOCK=true to use the mock layer.');
}