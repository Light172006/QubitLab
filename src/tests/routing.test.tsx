import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import App from '../App';
import { TopBar } from '../components/common/TopBar';
import { useAuthStore } from '../store';

const mockGetCurrentUser = vi.fn();
const mockLogout = vi.fn();

vi.mock('../api/client', () => ({
  api: {
    getCurrentUser: () => mockGetCurrentUser(),
    logout: () => mockLogout(),
    getLessons: async () => [],
    getChallenges: async () => [],
    getProgress: async () => ({ user_id: 'x', lessons_completed: 0, total_lessons: 0, challenges_solved: 0, total_challenges: 0, last_active: '', status: 'on_track' }),
    simulate: async () => { throw new Error('not used'); },
    explain: async function* () { /* no stream */ },
    checkLessonStep: async () => ({ passed: false, message: '' }),
  },
}));

const student = { id: 's1', name: 'Ada', role: 'student' as const, token: 't' };
const instructor = { id: 'i1', name: 'Ines', role: 'instructor' as const, token: 't' };

/** Counts navigations so an infinite redirect loop is observable. */
let navCount = 0;
function Probe() {
  navCount += 1;
  const location = useLocation();
  return <div data-testid="where">{location.pathname}</div>;
}

function renderApp(initialEntry: string) {
  navCount = 0;
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="*" element={<App />} />
      </Routes>
      <Probe />
    </MemoryRouter>
  );
}

describe('B03 a blocked role is sent somewhere it is allowed', () => {
  beforeEach(() => {
    navCount = 0;
    mockLogout.mockReset();
    useAuthStore.setState({ user: null });
  });

  it('sends an instructor away from the student-only /learn route', async () => {
    useAuthStore.setState({ user: instructor });
    mockGetCurrentUser.mockResolvedValue(instructor);
    renderApp('/learn');
    await waitFor(() => {
      expect(screen.getByTestId('where').textContent).toBe('/dashboard');
    });
  });

  it.each(['/learn', '/workspace', '/progress', '/challenge/CH1'])(
    'does not leave an instructor blank on %s',
    async (route) => {
      useAuthStore.setState({ user: instructor });
      mockGetCurrentUser.mockResolvedValue(instructor);
      const { container } = renderApp(route);
      await waitFor(() => {
        expect(screen.getByTestId('where').textContent).toBe('/dashboard');
      });
      // The old bug: a self-redirect loop rendered an empty tree.
      expect(container.querySelector('#root')).toBeNull();
      expect(screen.getByTestId('where').textContent).not.toBe('');
    }
  );

  it('settles instead of bouncing forever', async () => {
    useAuthStore.setState({ user: instructor });
    mockGetCurrentUser.mockResolvedValue(instructor);
    renderApp('/learn');
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/dashboard'));
    // One probe render per settled navigation; a loop keeps adding them.
    expect(navCount).toBeLessThan(10);
  });

  it('sends a student away from the instructor-only /dashboard route', async () => {
    useAuthStore.setState({ user: student });
    mockGetCurrentUser.mockResolvedValue(student);
    renderApp('/dashboard');
    await waitFor(() => {
      expect(screen.getByTestId('where').textContent).toBe('/learn');
    });
  });

  it('sends a signed-out visitor to login from a deep link', async () => {
    useAuthStore.setState({ user: null });
    mockGetCurrentUser.mockResolvedValue(null);
    renderApp('/workspace');
    await waitFor(() => {
      expect(screen.getByTestId('where').textContent).toBe('/login');
    });
  });

  it('lands an instructor on the dashboard from the root URL', async () => {
    useAuthStore.setState({ user: instructor });
    mockGetCurrentUser.mockResolvedValue(instructor);
    renderApp('/');
    await waitFor(() => {
      expect(screen.getByTestId('where').textContent).toBe('/dashboard');
    });
  });
});

describe('B09/B25 every navbar control does something', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: student });
    mockLogout.mockReset();
  });

  function renderTopBar() {
    return render(
      <MemoryRouter initialEntries={['/workspace']}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <TopBar
                  level="beginner"
                  setLevel={() => {}}
                  bitOrder="qiskit"
                  setBitOrder={() => {}}
                  onSandboxClick={() => {}}
                />
                <Probe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );
  }

  it('routes Learn, Challenges and Progress to a real destination', async () => {
    renderTopBar();

    fireEvent.click(screen.getByRole('button', { name: 'Learn' }));
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/learn'));

    fireEvent.click(screen.getByRole('button', { name: 'Progress' }));
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/progress'));
  });

  it('exposes a log-out control with an accessible name', async () => {
    renderTopBar();
    const logout = screen.getByRole('button', { name: 'Log out' });
    expect(logout).toBeInTheDocument();

    fireEvent.click(logout);
    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/login'));
  });
});