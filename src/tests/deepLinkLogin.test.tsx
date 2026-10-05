import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from '../pages/Login';
import { useAuthStore } from '../store';

const mockLogin = vi.fn();
const mockRegister = vi.fn();

vi.mock('../api/client', () => ({
  api: {
    login: (...args: unknown[]) => mockLogin(...args),
    register: (...args: unknown[]) => mockRegister(...args),
  },
}));

function renderAuthFlow(initialEntry: string, state?: object) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: initialEntry, state }]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/workspace" element={<div data-testid="destination">Workspace</div>} />
        <Route path="/learn" element={<div data-testid="destination">Learn</div>} />
        <Route path="/dashboard" element={<div data-testid="destination">Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

const student = { id: 's1', name: 'Student', role: 'student' as const, token: 't' };
const instructor = { id: 'i1', name: 'Instructor', role: 'instructor' as const, token: 't' };

async function signIn(email: string, password: string, buttonLabel: RegExp) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: buttonLabel }));
}

describe('A2 deep links survive login and register', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
    mockLogin.mockReset();
    mockRegister.mockReset();
  });

  it('returns to the requested route after login', async () => {
    mockLogin.mockResolvedValue(student);
    renderAuthFlow('/login', { from: { pathname: '/workspace' } });

    await signIn('student@qubitlab.io', 'password123', /sign in/i);

    await waitFor(() => {
      expect(screen.getByTestId('destination').textContent).toBe('Workspace');
    });
  });

  it('returns to the requested route after register', async () => {
    mockRegister.mockResolvedValue(student);
    renderAuthFlow('/login', { from: { pathname: '/workspace' } });

    // Switch to the register form first.
    fireEvent.click(screen.getByRole('button', { name: /create one/i }));
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Student' } });
    await signIn('student@qubitlab.io', 'password123', /create account/i);

    await waitFor(() => {
      expect(screen.getByTestId('destination').textContent).toBe('Workspace');
    });
  });

  it('falls back to Learn for students with no deep link', async () => {
    mockLogin.mockResolvedValue(student);
    renderAuthFlow('/login');

    await signIn('student@qubitlab.io', 'password123', /sign in/i);

    await waitFor(() => {
      expect(screen.getByTestId('destination').textContent).toBe('Learn');
    });
  });

  it('falls back to the dashboard for instructors', async () => {
    mockLogin.mockResolvedValue(instructor);
    renderAuthFlow('/login');

    await signIn('instructor@qubitlab.io', 'password123', /sign in/i);

    await waitFor(() => {
      expect(screen.getByTestId('destination').textContent).toBe('Dashboard');
    });
  });
});
