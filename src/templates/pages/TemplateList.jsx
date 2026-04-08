import { useNavigate } from 'react-router-dom';
import { PlusCircle, LayoutGrid, List, Inbox } from 'lucide-react';
import { useState } from 'react';
import { useTemplates } from '../context/TemplateContext';
import TemplateCard from '../components/TemplateCard';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import StatusBadge from '../components/StatusBadge';
import { computeStatus, formatDate, truncateText } from '../utils/helpers';

export default function TemplateList() {
  const navigate = useNavigate();
  const { getFilteredTemplates } = useTemplates();
  const [viewMode, setViewMode] = useState('cards');
  const filtered = getFilteredTemplates();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Templates</h2>
          <p className="text-sm text-slate-500 mt-1">
            {filtered.length} template{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2.5 transition cursor-pointer ${viewMode === 'cards' ? 'bg-blue-500/15 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2.5 transition cursor-pointer ${viewMode === 'table' ? 'bg-blue-500/15 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => navigate('/templates-hub/new')} className="btn-primary">
            <PlusCircle className="w-4 h-4" />
            Novo
          </button>
        </div>
      </div>

      <SearchBar />
      <FilterBar />

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Nenhum template encontrado</p>
          <p className="text-sm text-slate-600 mt-1">Tente ajustar os filtros ou criar um novo template</p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3.5">Nome</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3.5">Tipo</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3.5">Status</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3.5">Validade</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3.5">Resumo</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3.5">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-white/[0.03] transition" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/templates-hub/${t.id}`)}
                        className="text-sm font-medium text-slate-200 hover:text-blue-400 text-left cursor-pointer transition"
                      >
                        {t.name}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        t.type === 'marketing' ? 'bg-purple-500/10 text-purple-400' : 'bg-cyan-500/10 text-cyan-400'
                      }`}>
                        {t.type === 'marketing' ? 'Marketing' : 'Utility'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={computeStatus(t)} />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {formatDate(t.expiryDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 max-w-xs truncate">
                      {truncateText(t.content, 60)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => navigate(`/templates-hub/${t.id}`)}
                          className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer transition"
                        >
                          Ver
                        </button>
                        <span className="text-slate-600">|</span>
                        <button
                          onClick={() => navigate(`/templates-hub/${t.id}/edit`)}
                          className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer transition"
                        >
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
