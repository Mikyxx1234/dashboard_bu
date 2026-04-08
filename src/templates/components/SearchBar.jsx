import { Search, X } from 'lucide-react';
import { useTemplates } from '../context/TemplateContext';

export default function SearchBar() {
  const { searchQuery, setSearchQuery } = useTemplates();

  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Buscar por nome, conteúdo, tipo, tags..."
        className="input-field pl-11 pr-10"
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
