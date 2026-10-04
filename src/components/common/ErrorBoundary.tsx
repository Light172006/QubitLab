import { Component, ReactNode } from 'react';

/** Every localStorage key the app persists. */
const APP_STORAGE_KEYS = [
  'qubitlab-circuit',
  'qubitlab-auth',
  'qubitlab-ui',
  'qubitlab-lesson',
  'qubitlab-challenge',
  'qubitlab_mock_user',
  'qubitlab_token',
];

/** Removes all app persisted state. Safe to call from any context. */
export function clearQubitLabStorage(): void {
  try {
    APP_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage unavailable (private mode etc.) — nothing to clear.
  }
}

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Replaces the full-screen crash screen for scoped boundaries. */
  fallback?: (error: Error) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Keeps a render-time exception from leaving a blank screen.
 * The top-level boundary shows the error, a Reload button and a
 * "Clear saved data" button that wipes persisted state (a corrupt
 * persisted value is the one input the app cannot control).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearData = () => {
    clearQubitLabStorage();
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error);

    return (
      <div role="alert" className="min-h-screen flex items-center justify-center bg-surface px-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <h1 className="text-xl font-bold text-text mb-2">Something went wrong</h1>
          <p className="text-sm text-muted mb-3">
            QubitLab hit an unexpected error. Reloading usually fixes it; if it keeps happening,
            clear the saved data.
          </p>
          <pre className="text-left text-xs font-mono text-danger bg-danger-tint rounded-lg p-3 mb-6 overflow-auto max-h-32 whitespace-pre-wrap">
            {error.message}
          </pre>
          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleReload}
              className="px-4 py-2 text-sm bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors"
            >
              Reload
            </button>
            <button
              onClick={this.handleClearData}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear saved data
            </button>
          </div>
        </div>
      </div>
    );
  }
}
