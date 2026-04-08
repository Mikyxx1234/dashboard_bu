import { Filter, Star, AlertCircle } from 'lucide-react';
import { useTemplates } from '../context/TemplateContext';

export default function FilterBar() {
  const { filters, setFilters, sortBy, setSortBy, getAllCategories } = useTemplates();
  const categories = getAllCategories();

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleBtnClass = (active) =>
    `inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
      active
        ? 'text-white'
        : 'text-slate-400 hover:text-slate-200'
    }`;

  const toggleBtnStyle = (active, activeColor = 'rgba(37,99,235,0.15)', activeBorder = 'rgba(59,130,246,0.25)') =>
    active
      ? { background: activeColor, border: `1px solid ${activeBorder}` }
      : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 text-sm text-slate-500">
        <Filter className="w-4 h-4" />
        Filtros:
      </div>

      <select
        value={filters.type}
        onChange={(e) => updateFilter('type', e.target.value)}
        className="input-field w-auto text-sm"
      >
        <option value="all">Todos os tipos</option>
        <option value="marketing">Marketing</option>
        <option value="utility">Utility</option>
      </select>

      <select
        value={filters.status}
        onChange={(e) => updateFilter('status', e.target.value)}
        className="input-field w-auto text-sm"
      >
        <option value="all">Todos os status</option>
        <option value="active">Ativo</option>
        <option value="expiring">Próximo do Vencimento</option>
        <option value="expired">Vencido</option>
        <option value="updating">Em Atualização</option>
      </select>

      <select
        value={filters.category}
        onChange={(e) => updateFilter('category', e.target.value)}
        className="input-field w-auto text-sm"
      >
        <option value="all">Todas as categorias</option>
        {categories.map((cat) => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>

      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
        className="input-field w-auto text-sm"
      >
        <option value="expiryAsc">Validade (próxima)</option>
        <option value="expiryDesc">Validade (distante)</option>
        <option value="urgency">Urgência</option>
        <option value="nameAsc">Nome (A-Z)</option>
        <option value="nameDesc">Nome (Z-A)</option>
        <option value="recentlyUpdated">Última atualização</option>
      </select>

      <button
        onClick={() => updateFilter('needsUpdate', !filters.needsUpdate)}
        className={toggleBtnClass(filters.needsUpdate)}
        style={toggleBtnStyle(filters.needsUpdate, 'rgba(245,158,11,0.12)', 'rgba(245,158,11,0.25)')}
      >
        <AlertCircle className="w-3.5 h-3.5" />
        Precisam atualização
      </button>

      <button
        onClick={() => updateFilter('favoritesOnly', !filters.favoritesOnly)}
        className={toggleBtnClass(filters.favoritesOnly)}
        style={toggleBtnStyle(filters.favoritesOnly, 'rgba(234,179,8,0.12)', 'rgba(234,179,8,0.25)')}
      >
        <Star className="w-3.5 h-3.5" />
        Favoritos
      </button>
    </div>
  );
}
