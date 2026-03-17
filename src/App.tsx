import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LeadsDashboard } from './pages/LeadsDashboard';
import { CampanhasMeta } from './pages/CampanhasMeta';
import { MetaCampanhas } from './pages/MetaCampanhas';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<LeadsDashboard />} />
          <Route path="resultado-geral" element={<CampanhasMeta />} />
          <Route path="meta-campanhas" element={<MetaCampanhas />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
