import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { TemplateProvider } from './context/TemplateContext';
import { SuggestionProvider } from './context/SuggestionContext';
import TemplateNav from './components/TemplateNav';
import Dashboard from './pages/Dashboard';
import TemplateList from './pages/TemplateList';
import TemplateForm from './pages/TemplateForm';
import TemplateDetail from './pages/TemplateDetail';
import Alerts from './pages/Alerts';
import SuggestTemplate from './pages/SuggestTemplate';
import SuggestionManager from './pages/SuggestionManager';
import ConsultantTemplates from './pages/ConsultantTemplates';

export default function TemplatesHub() {
  const { isAdmin, user } = useAuth();

  return (
    <TemplateProvider>
      <SuggestionProvider>
        <div
          className="templates-scope min-h-screen p-6 lg:p-8"
          style={{
            background: 'linear-gradient(135deg, #0c1222 0%, #111a2e 50%, #0f1628 100%)',
          }}
        >
          <div className="mx-auto max-w-7xl">
            {isAdmin ? (
              <>
                <TemplateNav />
                <Routes>
                  <Route index element={<Dashboard />} />
                  <Route path="list" element={<TemplateList />} />
                  <Route path="new" element={<TemplateForm />} />
                  <Route path=":id" element={<TemplateDetail />} />
                  <Route path=":id/edit" element={<TemplateForm />} />
                  <Route path="alerts" element={<Alerts />} />
                  <Route path="suggest" element={<SuggestTemplate />} />
                  <Route path="suggestions" element={<SuggestionManager />} />
                </Routes>
              </>
            ) : (
              <ConsultantTemplates userName={user || 'Consultor'} />
            )}
          </div>
        </div>
      </SuggestionProvider>
    </TemplateProvider>
  );
}
