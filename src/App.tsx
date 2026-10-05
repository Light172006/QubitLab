import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store';
import { useEffect } from 'react';
import { api } from './api/client';
import Login from './pages/Login';
import Home from './pages/Home';
import Workspace from './pages/Workspace';
import ChallengePage from './pages/ChallengePage';
import Progress from './pages/Progress';
import Dashboard from './pages/Dashboard';

/**
 * Where a role belongs when it cannot stay where it is.
 *
 * This must never be a route the caller is already blocked from, or the
 * redirect repeats forever and the router renders nothing at all.
 */
function homeFor(role: 'student' | 'instructor' | undefined): string {
  return role === 'instructor' ? '/dashboard' : '/learn';
}

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: ('student' | 'instructor')[] }) {
  const { user, setUser } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    api.getCurrentUser().then(setUser).catch(() => setUser(null));
  }, [setUser]);

  // Remember where the user was headed so login can
  // send them back there instead of the default page.
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  // Wrong role for this route: send them to their own home page. Redirecting to
  // a route they are also blocked from left an instructor on /learn with an
  // empty #root, because /learn is itself student-only.
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}

/** Role-aware landing page, so "/" and an unknown URL never bounce forever. */
function RoleHome() {
  const user = useAuthStore((state) => state.user);
  return <Navigate to={homeFor(user?.role)} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/learn"
        element={
          <ProtectedRoute roles={['student']}>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace"
        element={
          <ProtectedRoute roles={['student']}>
            <Workspace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/challenge/:id"
        element={
          <ProtectedRoute roles={['student']}>
            <ChallengePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/progress"
        element={
          <ProtectedRoute roles={['student']}>
            <Progress />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute roles={['instructor']}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<RoleHome />} />
      <Route path="*" element={<RoleHome />} />
    </Routes>
  );
}

export default App;