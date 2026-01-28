import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateActa from './pages/CreateActa';
import ViewActa from './pages/ViewActa';
import SignaturePage from './pages/SignaturePage';
import { useAuthStore, initializeAuth } from './hooks/useAuth';
import { useEffect } from 'react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center space-y-4 flex-col">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Cargando sesión...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;

  return <>{children}</>;
}

export default function App() {
  useEffect(() => {
    initializeAuth();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/actas/create"
          element={
            <ProtectedRoute>
              <CreateActa />
            </ProtectedRoute>
          }
        />
        <Route
          path="/actas/view/:id"
          element={
            <ProtectedRoute>
              <ViewActa />
            </ProtectedRoute>
          }
        />
        <Route path="/actas/:id/sign" element={<SignaturePage />} />
      </Routes>
    </Router>
  );
}
