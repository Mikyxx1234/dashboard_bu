import { useState, useEffect, useCallback } from 'react';
import {
  Megaphone, Plus, Trash2, RefreshCw, AlertCircle,
  CheckCircle2, Edit2, X, Save, Bell, BellOff,
  Clock, ShieldAlert, Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SkeletonCardList, SkeletonStat } from '../components/Skeleton';
import {
  getAvisos,
  createAviso,
  updateAviso,
  deleteAviso,
  getConfirmacoesPorAviso,
  type Aviso,
  type AvisoConfirmacao,
} from '../services/avisosService';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const emptyForm = { titulo: '', corpo: '', urgente: false, expira_em: '' };

export default function MuralAvisosPage() {
  const { user, isAdmin } = useAuth();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [mostrarInativos, setMostrarInativos] = useState(false);

  const fetchAvisos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAvisos(!mostrarInativos || !isAdmin);
      setAvisos(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar avisos');
    } finally {
      setLoading(false);
    }
  }, [mostrarInativos, isAdmin]);

  useEffect(() => {
    fetchAvisos();
  }, [fetchAvisos]);

  function startNew() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError('');
    setSuccess('');
  }

  function startEdit(a: Aviso) {
    setEditingId(a.id);
    setForm({
      titulo: a.titulo,
      corpo: a.corpo,
      urgente: a.urgente,
      expira_em: a.expira_em ?? '',
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSave() {
    if (!form.titulo.trim() || !form.corpo.trim()) {
      setError('Título e mensagem são obrigatórios.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (editingId) {
        await updateAviso(editingId, {
          titulo: form.titulo.trim(),
          corpo: form.corpo.trim(),
          urgente: form.urgente,
          expira_em: form.expira_em || null,
        });
        setSuccess('Aviso atualizado com sucesso!');
      } else {
        await createAviso({
          titulo: form.titulo.trim(),
          corpo: form.corpo.trim(),
          urgente: form.urgente,
          criado_por: user ?? 'admin',
          expira_em: form.expira_em || null,
        });
        setSuccess('Aviso publicado com sucesso!');
      }
      cancelForm();
      await fetchAvisos();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar aviso');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAtivo(a: Aviso) {
    try {
      await updateAviso(a.id, { ativo: !a.ativo });
      await fetchAvisos();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar aviso');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este aviso?')) return;
    setError('');
    try {
      await deleteAviso(id);
      setSuccess('Aviso excluído.');
      await fetchAvisos();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir aviso');
    }
  }

  const urgentes = avisos.filter((a) => a.urgente && a.ativo);
  const normais = avisos.filter((a) => !a.urgente && a.ativo);
  const inativos = avisos.filter((a) => !a.ativo);

  const inputClass =
    'w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40';

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
            <Megaphone className="h-7 w-7 text-amber-400" />
            Mural de Avisos
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            {isAdmin
              ? 'Publique comunicados para toda a equipe'
              : 'Avisos e comunicados da supervisão'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <>
              <button
                onClick={() => setMostrarInativos((v) => !v)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  mostrarInativos
                    ? 'border-gray-600 bg-gray-800 text-gray-300'
                    : 'border-gray-700 bg-gray-900 text-gray-500 hover:text-gray-300'
                }`}
              >
                {mostrarInativos ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                {mostrarInativos ? 'Ocultar inativos' : 'Ver inativos'}
              </button>
              <button
                onClick={startNew}
                className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-amber-400"
              >
                <Plus className="h-4 w-4" />
                Novo Aviso
              </button>
            </>
          )}
          <button
            onClick={fetchAvisos}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-400 transition hover:bg-gray-700 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-800 bg-red-900/30 p-4 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-emerald-800 bg-emerald-900/30 p-4 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Form */}
      {isAdmin && showForm && (
        <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              {editingId ? <Edit2 className="h-4 w-4 text-blue-400" /> : <Plus className="h-4 w-4 text-amber-400" />}
              {editingId ? 'Editar Aviso' : 'Novo Aviso'}
            </h2>
            <button onClick={cancelForm} className="rounded-lg p-1 text-gray-500 hover:text-gray-300">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Título *</label>
              <input
                className={inputClass}
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: Reunião de equipe — sexta 14h"
                maxLength={120}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Mensagem *</label>
              <textarea
                rows={4}
                className={`${inputClass} resize-none`}
                value={form.corpo}
                onChange={(e) => setForm((f) => ({ ...f, corpo: e.target.value }))}
                placeholder="Detalhe o comunicado aqui..."
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1">
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  Expira em (opcional)
                </label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.expira_em}
                  onChange={(e) => setForm((f) => ({ ...f, expira_em: e.target.value }))}
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex cursor-pointer items-center gap-2">
                  <div
                    onClick={() => setForm((f) => ({ ...f, urgente: !f.urgente }))}
                    className={`relative h-5 w-9 rounded-full transition ${form.urgente ? 'bg-red-500' : 'bg-gray-700'}`}
                  >
                    <div
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.urgente ? 'translate-x-4' : 'translate-x-0.5'}`}
                    />
                  </div>
                  <span className={`text-sm font-medium ${form.urgente ? 'text-red-400' : 'text-gray-400'}`}>
                    Urgente
                  </span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-gray-900 transition hover:bg-amber-400 disabled:opacity-50"
              >
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingId ? 'Salvar' : 'Publicar'}
              </button>
              <button
                onClick={cancelForm}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 transition hover:text-gray-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skeleton loading */}
      {loading && avisos.length === 0 && (
        <div className="space-y-6">
          {isAdmin && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <SkeletonStat />
              <SkeletonStat />
              <SkeletonStat />
            </div>
          )}
          <SkeletonCardList count={3} />
        </div>
      )}

      {/* Vazio */}
      {!loading && avisos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-600">
          <Megaphone className="mb-4 h-14 w-14 opacity-30" />
          <p className="text-lg font-medium text-gray-500">Nenhum aviso publicado</p>
          {isAdmin && (
            <p className="mt-1 text-sm">Clique em "Novo Aviso" para criar o primeiro comunicado.</p>
          )}
        </div>
      )}

      {/* Urgentes */}
      {urgentes.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-red-400">
              Urgente ({urgentes.length})
            </h2>
          </div>
          <div className="space-y-3">
            {urgentes.map((aviso) => (
              <AvisoCard
                key={aviso.id}
                aviso={aviso}
                isAdmin={isAdmin}
                onEdit={() => startEdit(aviso)}
                onToggle={() => handleToggleAtivo(aviso)}
                onDelete={() => handleDelete(aviso.id)}
                urgente
              />
            ))}
          </div>
        </div>
      )}

      {/* Normais */}
      {normais.length > 0 && (
        <div className="mb-6">
          {urgentes.length > 0 && (
            <div className="mb-3 flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                Comunicados ({normais.length})
              </h2>
            </div>
          )}
          <div className="space-y-3">
            {normais.map((aviso) => (
              <AvisoCard
                key={aviso.id}
                aviso={aviso}
                isAdmin={isAdmin}
                onEdit={() => startEdit(aviso)}
                onToggle={() => handleToggleAtivo(aviso)}
                onDelete={() => handleDelete(aviso.id)}
                urgente={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inativos — só admin */}
      {isAdmin && mostrarInativos && inativos.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <BellOff className="h-4 w-4 text-gray-600" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-600">
              Inativos ({inativos.length})
            </h2>
          </div>
          <div className="space-y-3 opacity-50">
            {inativos.map((aviso) => (
              <AvisoCard
                key={aviso.id}
                aviso={aviso}
                isAdmin={isAdmin}
                onEdit={() => startEdit(aviso)}
                onToggle={() => handleToggleAtivo(aviso)}
                onDelete={() => handleDelete(aviso.id)}
                urgente={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface AvisoCardProps {
  aviso: Aviso;
  isAdmin: boolean;
  urgente: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

function ConfirmacoesPanel({ avisoId }: { avisoId: string }) {
  const [confirmacoes, setConfirmacoes] = useState<AvisoConfirmacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [aberto, setAberto] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getConfirmacoesPorAviso(avisoId);
      setConfirmacoes(data);
    } catch {
      setConfirmacoes([]);
    } finally {
      setLoading(false);
    }
  }, [avisoId]);

  function toggle() {
    if (!aberto) carregar();
    setAberto((v) => !v);
  }

  return (
    <div className="mt-3 border-t border-gray-800 pt-3">
      <button
        onClick={toggle}
        className="flex items-center gap-2 text-xs font-medium text-gray-500 transition hover:text-gray-300"
      >
        <Users className="h-3.5 w-3.5" />
        {aberto ? 'Ocultar' : 'Ver quem confirmou'}
        {!aberto && confirmacoes.length > 0 && (
          <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
            {confirmacoes.length}
          </span>
        )}
      </button>
      {aberto && (
        <div className="mt-2">
          {loading ? (
            <p className="text-xs text-gray-600">Carregando...</p>
          ) : confirmacoes.length === 0 ? (
            <p className="text-xs text-gray-600 italic">Nenhum consultor confirmou ainda.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {confirmacoes.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-1.5 rounded-full border border-emerald-700/40 bg-emerald-900/30 px-2.5 py-1"
                >
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-300">{c.consultor}</span>
                  <span className="text-[10px] text-gray-600">
                    {new Date(c.confirmado_em).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AvisoCard({ aviso, isAdmin, urgente, onEdit, onToggle, onDelete }: AvisoCardProps) {
  const borderColor = urgente ? 'border-red-700/40' : 'border-gray-800';
  const bgColor = urgente ? 'bg-red-950/30' : 'bg-gray-900';
  const badgeColor = urgente
    ? 'bg-red-500/20 text-red-400 border-red-500/30'
    : 'bg-amber-500/10 text-amber-400 border-amber-500/20';

  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} p-5 transition`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {urgente && (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${badgeColor}`}>
                <ShieldAlert className="h-3 w-3" />
                URGENTE
              </span>
            )}
            {!aviso.ativo && (
              <span className="rounded-full border border-gray-700 bg-gray-800 px-2 py-0.5 text-xs text-gray-500">
                Inativo
              </span>
            )}
            <h3 className="text-base font-semibold text-white">{aviso.titulo}</h3>
          </div>
          <p className="text-sm text-gray-300 whitespace-pre-line">{aviso.corpo}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(aviso.criado_em)}
            </span>
            <span>por {aviso.criado_por}</span>
            {aviso.expira_em && (
              <span className="text-yellow-600">
                Expira em {new Date(aviso.expira_em).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
          {/* Confirmações — visível apenas para admin */}
          {isAdmin && <ConfirmacoesPanel avisoId={aviso.id} />}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1">
            <button
              onClick={onToggle}
              title={aviso.ativo ? 'Desativar' : 'Ativar'}
              className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-800 hover:text-gray-300"
            >
              {aviso.ativo ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            </button>
            <button
              onClick={onEdit}
              className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-800 hover:text-blue-400"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              className="rounded-lg p-1.5 text-gray-500 transition hover:bg-red-900/30 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
