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
import TemplatesHub from './templates/TemplatesHub';
import AcademicoDashboardPage from './pages/AcademicoDashboardPage';
import AcademicoColaboradoresPage from './pages/AcademicoColaboradoresPage';
import FormatarPlanilhaPage from './pages/FormatarPlanilhaPage';
import BlogAdminPage from './pages/BlogAdminPage';
import BlogCreatePage from './pages/BlogCreatePage';
import SessionsDashboard from './pages/SessionsDashboard';
import LeadsParadosPage from './pages/LeadsParadosPage';

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
            {/* Comercial */}
            <Route index element={<LeadsDashboard />} />
            <Route path="resultado-geral" element={<AdminRoute><CampanhasMeta /></AdminRoute>} />
            <Route path="meta-campanhas" element={<AdminRoute><MetaCampanhas /></AdminRoute>} />
            <Route path="distribuicao-anhanguera" element={<AdminRoute><AnhangueraDashboard /></AdminRoute>} />
            <Route path="distribuicao-sumare" element={<AdminRoute><SumareDashboard /></AdminRoute>} />
            <Route path="meta" element={<AdminRoute><MetaPage /></AdminRoute>} />
            <Route path="templates-hub/*" element={<TemplatesHub />} />
            <Route path="blog-controle" element={<AdminRoute><BlogAdminPage /></AdminRoute>} />
            <Route path="blog-controle/novo" element={<AdminRoute><BlogCreatePage /></AdminRoute>} />
            <Route path="blog-controle/editar/:slug" element={<AdminRoute><BlogCreatePage /></AdminRoute>} />
            <Route path="sessoes" element={<AdminRoute><SessionsDashboard /></AdminRoute>} />
            <Route path="leads-parados" element={<AdminRoute><LeadsParadosPage /></AdminRoute>} />
            <Route path="formatar-planilha" element={<AdminRoute><FormatarPlanilhaPage /></AdminRoute>} />
            {/* Acadêmico */}
            <Route path="academico" element={<AdminRoute><AcademicoDashboardPage /></AdminRoute>} />
            <Route path="academico/colaboradores" element={<AdminRoute><AcademicoColaboradoresPage /></AdminRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
