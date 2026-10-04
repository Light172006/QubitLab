import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

// The smoke test only exercises the unauthenticated shell: the login
// page. getCurrentUser is what ProtectedRoute calls on every load.
vi.mock('../api/client', () => ({
  api: {
    getCurrentUser: async () => null,
  },
}));

const APP_STORAGE_KEYS = [
  'qubitlab-circuit',
  'qubitlab-auth',
  'qubitlab-ui',
  'qubitlab-lesson',
  'qubitlab-challenge',
  'qubitlab_mock_user',
  'qubitlab_token',
];

describe('App smoke test', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the login page with empty localStorage', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Sign in to continue')).toBeTruthy();
    });
  });

  it('renders the login page with corrupt persisted state', async () => {
    APP_STORAGE_KEYS.forEach((key) => {
      localStorage.setItem(key, '{corrupt json!!');
    });
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Sign in to continue')).toBeTruthy();
    });
  });

  it('renders the login page on a deep link when unauthenticated', async () => {
    render(
      <MemoryRouter initialEntries={['/workspace']}>
        <App />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Sign in to continue')).toBeTruthy();
    });
  });
});
