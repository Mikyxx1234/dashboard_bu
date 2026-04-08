import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { computeStatus } from '../utils/helpers';
import { fetchAll, insertRow, updateRow, deleteRow } from '../utils/supabase';

const TemplateContext = createContext(null);
const TABLE = 'Templates';

export function TemplateProvider({ children }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    needsUpdate: false,
    category: 'all',
    favoritesOnly: false,
  });
  const [sortBy, setSortBy] = useState('expiryAsc');

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await fetchAll(TABLE, '&order=id.desc');
      const mapped = rows.map((r) => ({
        ...r,
        tags: Array.isArray(r.tags) ? r.tags : [],
      }));
      setTemplates(mapped);
    } catch (err) {
      console.error('Erro ao carregar templates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const addTemplate = useCallback(async (data) => {
    const now = new Date().toISOString().split('T')[0];
    const payload = {
      name: data.name,
      content: data.content || '',
      type: data.type || 'marketing',
      expiryDate: data.expiryDate || null,
      tags: Array.isArray(data.tags) ? data.tags : [],
      notes: data.notes || '',
      category: data.category || '',
      usageRecommendation: data.usageRecommendation || '',
      version: 1,
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
    };
    try {
      const [row] = await insertRow(TABLE, payload);
      setTemplates((prev) => [{ ...row, tags: Array.isArray(row.tags) ? row.tags : [] }, ...prev]);
      return row.id;
    } catch (err) {
      console.error('Erro ao adicionar template:', err);
      return null;
    }
  }, []);

  const updateTemplate = useCallback(async (id, data) => {
    const now = new Date().toISOString().split('T')[0];
    const payload = {
      name: data.name,
      content: data.content || '',
      type: data.type || 'marketing',
      expiryDate: data.expiryDate || null,
      tags: Array.isArray(data.tags) ? data.tags : [],
      notes: data.notes || '',
      category: data.category || '',
      usageRecommendation: data.usageRecommendation || '',
      updatedAt: now,
    };
    try {
      await updateRow(TABLE, id, payload);
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...payload, tags: Array.isArray(payload.tags) ? payload.tags : [] } : t))
      );
    } catch (err) {
      console.error('Erro ao atualizar template:', err);
    }
  }, []);

  const deleteTemplate = useCallback(async (id) => {
    try {
      await deleteRow(TABLE, id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Erro ao excluir template:', err);
    }
  }, []);

  const duplicateTemplate = useCallback(async (id) => {
    const source = templates.find((t) => t.id === id);
    if (!source) return;
    const now = new Date().toISOString().split('T')[0];
    const payload = {
      name: `${source.name} (Cópia)`,
      content: source.content,
      type: source.type,
      expiryDate: source.expiryDate,
      tags: Array.isArray(source.tags) ? source.tags : [],
      notes: source.notes,
      category: source.category,
      usageRecommendation: source.usageRecommendation,
      version: 1,
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
    };
    try {
      const [row] = await insertRow(TABLE, payload);
      setTemplates((prev) => [{ ...row, tags: Array.isArray(row.tags) ? row.tags : [] }, ...prev]);
    } catch (err) {
      console.error('Erro ao duplicar template:', err);
    }
  }, [templates]);

  const toggleFavorite = useCallback(async (id) => {
    const t = templates.find((t) => t.id === id);
    if (!t) return;
    const newVal = !t.isFavorite;
    try {
      await updateRow(TABLE, id, { isFavorite: newVal });
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isFavorite: newVal } : t))
      );
    } catch (err) {
      console.error('Erro ao favoritar:', err);
    }
  }, [templates]);

  const getFilteredTemplates = useCallback(() => {
    let result = [...templates];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.content || '').toLowerCase().includes(q) ||
          (t.type || '').toLowerCase().includes(q) ||
          (t.tags || []).some((tag) => tag.toLowerCase().includes(q)) ||
          (t.category || '').toLowerCase().includes(q) ||
          (t.notes || '').toLowerCase().includes(q)
      );
    }

    if (filters.type !== 'all') result = result.filter((t) => t.type === filters.type);
    if (filters.status !== 'all') result = result.filter((t) => computeStatus(t) === filters.status);
    if (filters.category !== 'all') result = result.filter((t) => t.category === filters.category);
    if (filters.needsUpdate) {
      result = result.filter((t) => {
        const s = computeStatus(t);
        return s === 'expired' || s === 'expiring';
      });
    }
    if (filters.favoritesOnly) result = result.filter((t) => t.isFavorite);

    const sortFunctions = {
      expiryAsc: (a, b) => new Date(a.expiryDate || '9999-12-31') - new Date(b.expiryDate || '9999-12-31'),
      expiryDesc: (a, b) => new Date(b.expiryDate || '0000-01-01') - new Date(a.expiryDate || '0000-01-01'),
      nameAsc: (a, b) => a.name.localeCompare(b.name),
      nameDesc: (a, b) => b.name.localeCompare(a.name),
      recentlyUpdated: (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0),
      urgency: (a, b) => {
        const order = { expired: 0, expiring: 1, active: 2 };
        return (order[computeStatus(a)] ?? 2) - (order[computeStatus(b)] ?? 2);
      },
    };

    result.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return (sortFunctions[sortBy] || sortFunctions.expiryAsc)(a, b);
    });

    return result;
  }, [templates, searchQuery, filters, sortBy]);

  const getStats = useCallback(() => {
    const stats = { total: templates.length, active: 0, expiring: 0, expired: 0, marketing: 0, utility: 0 };
    templates.forEach((t) => {
      const status = computeStatus(t);
      stats[status] = (stats[status] || 0) + 1;
      stats[t.type] = (stats[t.type] || 0) + 1;
    });
    return stats;
  }, [templates]);

  const getAlerts = useCallback(() => {
    return templates
      .map((t) => ({ ...t, computedStatus: computeStatus(t) }))
      .filter((t) => t.computedStatus !== 'active')
      .sort((a, b) => {
        const order = { expired: 0, expiring: 1 };
        return (order[a.computedStatus] ?? 2) - (order[b.computedStatus] ?? 2);
      });
  }, [templates]);

  const getAllCategories = useCallback(() => {
    const cats = new Set(templates.map((t) => t.category).filter(Boolean));
    return [...cats].sort();
  }, [templates]);

  const value = {
    templates,
    loading,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    toggleFavorite,
    getFilteredTemplates,
    getStats,
    getAlerts,
    getAllCategories,
    reload,
  };

  return <TemplateContext.Provider value={value}>{children}</TemplateContext.Provider>;
}

export function useTemplates() {
  const ctx = useContext(TemplateContext);
  if (!ctx) throw new Error('useTemplates must be used within TemplateProvider');
  return ctx;
}
