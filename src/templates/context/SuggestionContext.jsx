import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchAll, insertRow, updateRow, deleteRow } from '../utils/supabase';

const SuggestionContext = createContext(null);
const TABLE = 'Template_Sugestoes';

export function SuggestionProvider({ children }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await fetchAll(TABLE, '&order=id.desc');
      setSuggestions(rows.map((r) => ({ ...r, tags: Array.isArray(r.tags) ? r.tags : [] })));
    } catch (err) {
      console.error('Erro ao carregar sugestões:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const addSuggestion = useCallback(async (data) => {
    const now = new Date().toISOString().split('T')[0];
    const payload = {
      name: data.name,
      content: data.content || '',
      type: data.type || 'marketing',
      expiryDate: data.expiryDate || null,
      updateStartDate: data.updateStartDate || null,
      updateEndDate: data.updateEndDate || null,
      tags: typeof data.tags === 'string'
        ? data.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : data.tags || [],
      notes: data.notes || '',
      category: data.category || '',
      usageRecommendation: data.usageRecommendation || '',
      submittedBy: data.submittedBy || 'Colaborador',
      status: 'pending',
      submittedAt: now,
      reviewedAt: null,
      reviewFeedback: '',
      rejectReason: '',
      readByUser: false,
    };
    try {
      const [row] = await insertRow(TABLE, payload);
      setSuggestions((prev) => [{ ...row, tags: Array.isArray(row.tags) ? row.tags : [] }, ...prev]);
      return row.id;
    } catch (err) {
      console.error('Erro ao adicionar sugestão:', err);
      return null;
    }
  }, []);

  const approveSuggestion = useCallback(async (id, feedback) => {
    const now = new Date().toISOString().split('T')[0];
    const patch = {
      status: 'approved',
      reviewedAt: now,
      reviewFeedback: feedback || 'Sua sugestão foi aprovada e adicionada à lista de templates!',
      readByUser: false,
    };
    try {
      await updateRow(TABLE, id, patch);
      setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      return true;
    } catch (err) {
      console.error('Erro ao aprovar sugestão:', err);
      return false;
    }
  }, []);

  const rejectSuggestion = useCallback(async (id, reason, feedback) => {
    const now = new Date().toISOString().split('T')[0];
    const patch = {
      status: 'rejected',
      reviewedAt: now,
      rejectReason: reason || '',
      reviewFeedback: feedback || reason || 'Sua sugestão foi analisada mas não foi aprovada desta vez.',
      readByUser: false,
    };
    try {
      await updateRow(TABLE, id, patch);
      setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      return true;
    } catch (err) {
      console.error('Erro ao rejeitar sugestão:', err);
      return false;
    }
  }, []);

  const deleteSuggestion = useCallback(async (id) => {
    try {
      await deleteRow(TABLE, id);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Erro ao excluir sugestão:', err);
    }
  }, []);

  const getPendingSuggestions = useCallback(() => {
    return suggestions.filter((s) => s.status === 'pending');
  }, [suggestions]);

  const getSuggestionsByUser = useCallback((userName) => {
    return suggestions.filter((s) => s.submittedBy === userName);
  }, [suggestions]);

  const getUnreadCountForUser = useCallback((userName) => {
    return suggestions.filter(
      (s) => s.submittedBy === userName && s.status !== 'pending' && !s.readByUser
    ).length;
  }, [suggestions]);

  const markAsReadByUser = useCallback(async (userName) => {
    const toMark = suggestions.filter(
      (s) => s.submittedBy === userName && s.status !== 'pending' && !s.readByUser
    );
    try {
      await Promise.all(toMark.map((s) => updateRow(TABLE, s.id, { readByUser: true })));
      setSuggestions((prev) =>
        prev.map((s) =>
          s.submittedBy === userName && s.status !== 'pending'
            ? { ...s, readByUser: true }
            : s
        )
      );
    } catch (err) {
      console.error('Erro ao marcar como lida:', err);
    }
  }, [suggestions]);

  const getSuggestionStats = useCallback(() => {
    return {
      total: suggestions.length,
      pending: suggestions.filter((s) => s.status === 'pending').length,
      approved: suggestions.filter((s) => s.status === 'approved').length,
      rejected: suggestions.filter((s) => s.status === 'rejected').length,
    };
  }, [suggestions]);

  const value = {
    suggestions,
    loading,
    addSuggestion,
    approveSuggestion,
    rejectSuggestion,
    deleteSuggestion,
    getPendingSuggestions,
    getSuggestionsByUser,
    getUnreadCountForUser,
    markAsReadByUser,
    getSuggestionStats,
    reload,
  };

  return <SuggestionContext.Provider value={value}>{children}</SuggestionContext.Provider>;
}

export function useSuggestions() {
  const ctx = useContext(SuggestionContext);
  if (!ctx) throw new Error('useSuggestions must be used within SuggestionProvider');
  return ctx;
}
