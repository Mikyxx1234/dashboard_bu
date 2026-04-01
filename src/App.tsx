import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { LeadsDashboard } from './pages/LeadsDashboard';
import { CampanhasMeta } from './pages/CampanhasMeta';
import { MetaCampanhas } from './pages/MetaCampanhas';
import { MetaPage } from './pages/MetaPage';
import AnhangueraDashboard from './pages/AnhangueraDashboard';
import SumareDashboard from './pages/SumareDashboard';

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function LoginGuard() {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <LoginPage />;
}

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginGuard />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<LeadsDashboard />} />
            <Route path="resultado-geral" element={<AdminRoute><CampanhasMeta /></AdminRoute>} />
            <Route path="meta-campanhas" element={<AdminRoute><MetaCampanhas /></AdminRoute>} />
            <Route path="distribuicao-anhanguera" element={<AdminRoute><AnhangueraDashboard /></AdminRoute>} />
            <Route path="distribuicao-sumare" element={<AdminRoute><SumareDashboard /></AdminRoute>} />
            <Route path="meta" element={<AdminRoute><MetaPage /></AdminRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
