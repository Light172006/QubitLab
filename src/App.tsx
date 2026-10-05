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

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: ('student' | 'instructor')[] }) {
  const { user, setUser } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    api.getCurrentUser().then(setUser).catch(() => setUser(null));
  }, [setUser]);

  // Remember where the user was headed so login can
  // send them back there instead of the default page.
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/learn" replace />;
  return <>{children}</>;
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
      <Route path="/" element={<Navigate to="/learn" replace />} />
      <Route path="*" element={<Navigate to="/learn" replace />} />
    </Routes>
  );
}

export default App;