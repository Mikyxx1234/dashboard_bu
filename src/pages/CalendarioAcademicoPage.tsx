import { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays, Plus, Trash2, RefreshCw, AlertCircle,
  CheckCircle2, Edit2, X, Save, ChevronLeft, ChevronRight,
  GraduationCap, BookOpen, Star, Clock, MapPin,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SkeletonBox, SkeletonText } from '../components/Skeleton';
import {
  getEventos,
  createEvento,
  updateEvento,
  deleteEvento,
  type EventoAcademico,
  type TipoEvento,
} from '../services/calendarioService';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const TIPOS: { value: TipoEvento; label: string; icon: React.ReactNode; cor: string }[] = [
  { value: 'inicio_semestre', label: 'Início de Semestre', icon: <GraduationCap className="h-3.5 w-3.5" />, cor: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  { value: 'rematricula',     label: 'Rematrícula',        icon: <BookOpen className="h-3.5 w-3.5" />,      cor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { value: 'vestibular',      label: 'Vestibular',         icon: <Star className="h-3.5 w-3.5" />,          cor: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { value: 'prazo',           label: 'Prazo',              icon: <Clock className="h-3.5 w-3.5" />,         cor: 'text-red-400 bg-red-500/10 border-red-500/30' },
  { value: 'evento',          label: 'Evento',             icon: <MapPin className="h-3.5 w-3.5" />,        cor: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
];

function getTipoConfig(tipo: TipoEvento) {
  return TIPOS.find((t) => t.value === tipo) ?? TIPOS[4];
}

function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const emptyForm = {
  titulo: '',
  descricao: '',
  data_inicio: '',
  data_fim: '',
  tipo: 'evento' as TipoEvento,
  polo: '',
};

export default function CalendarioAcademicoPage() {
  const { user, isAdmin } = useAuth();
  const anoAtual = new Date().getFullYear();
  const [anoFiltro, setAnoFiltro] = useState(anoAtual);
  const [eventos, setEventos] = useState<EventoAcademico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [tipoFiltro, setTipoFiltro] = useState<TipoEvento | 'todos'>('todos');

  const fetchEventos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getEventos(anoFiltro);
      setEventos(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  }, [anoFiltro]);

  useEffect(() => {
    fetchEventos();
  }, [fetchEventos]);

  function startNew() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError('');
    setSuccess('');
  }

  function startEdit(ev: EventoAcademico) {
    setEditingId(ev.id);
    setForm({
      titulo: ev.titulo,
      descricao: ev.descricao ?? '',
      data_inicio: ev.data_inicio,
      data_fim: ev.data_fim ?? '',
      tipo: ev.tipo,
      polo: ev.polo ?? '',
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
    if (!form.titulo.trim() || !form.data_inicio) {
      setError('Título e data de início são obrigatórios.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (editingId) {
        await updateEvento(editingId, {
          titulo: form.titulo.trim(),
          descricao: form.descricao.trim() || null,
          data_inicio: form.data_inicio,
          data_fim: form.data_fim || null,
          tipo: form.tipo,
          polo: form.polo.trim() || null,
        });
        setSuccess('Evento atualizado!');
      } else {
        await createEvento({
          titulo: form.titulo.trim(),
          descricao: form.descricao.trim() || null,
          data_inicio: form.data_inicio,
          data_fim: form.data_fim || null,
          tipo: form.tipo,
          polo: form.polo.trim() || null,
          criado_por: user ?? 'admin',
        });
        setSuccess('Evento adicionado ao calendário!');
      }
      cancelForm();
      await fetchEventos();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar evento');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return;
    setError('');
    try {
      await deleteEvento(id);
      setSuccess('Evento excluído.');
      await fetchEventos();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir evento');
    }
  }

  const eventosFiltrados = tipoFiltro === 'todos'
    ? eventos
    : eventos.filter((e) => e.tipo === tipoFiltro);

  // Agrupar por mês
  const porMes = MESES.map((mes, idx) => ({
    mes,
    idx,
    itens: eventosFiltrados.filter((e) => {
      const m = parseInt(e.data_inicio.split('-')[1], 10) - 1;
      return m === idx;
    }),
  })).filter((g) => g.itens.length > 0);

  const hoje = new Date().toISOString().slice(0, 10);
  const proximosEventos = eventos
    .filter((e) => e.data_inicio >= hoje)
    .slice(0, 3);

  const inputClass =
    'w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40';

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
            <CalendarDays className="h-7 w-7 text-blue-400" />
            Calendário Acadêmico
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Datas importantes: início de semestre, vestibulares, rematrículas e prazos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-gray-800 bg-gray-900 px-1 py-1">
            <button
              onClick={() => setAnoFiltro((a) => a - 1)}
              className="rounded p-1 text-gray-400 hover:text-white transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="w-12 text-center text-sm font-semibold text-white">{anoFiltro}</span>
            <button
              onClick={() => setAnoFiltro((a) => a + 1)}
              className="rounded p-1 text-gray-400 hover:text-white transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {isAdmin && (
            <button
              onClick={startNew}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              Novo Evento
            </button>
          )}
          <button
            onClick={fetchEventos}
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

      {/* Próximos eventos */}
      {proximosEventos.length > 0 && anoFiltro === anoAtual && (
        <div className="mb-6 rounded-xl border border-blue-900/40 bg-blue-950/20 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-blue-400">
            Próximos eventos
          </p>
          <div className="flex flex-wrap gap-3">
            {proximosEventos.map((ev) => {
              const cfg = getTipoConfig(ev.tipo);
              return (
                <div key={ev.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${cfg.cor}`}>
                  {cfg.icon}
                  <span className="font-medium">{ev.titulo}</span>
                  <span className="text-xs opacity-70">— {formatDateBR(ev.data_inicio)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Form */}
      {isAdmin && showForm && (
        <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              {editingId ? <Edit2 className="h-4 w-4 text-blue-400" /> : <Plus className="h-4 w-4 text-blue-400" />}
              {editingId ? 'Editar Evento' : 'Novo Evento'}
            </h2>
            <button onClick={cancelForm} className="rounded-lg p-1 text-gray-500 hover:text-gray-300">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Título *</label>
              <input
                className={inputClass}
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: Início do 2º Semestre 2026"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Tipo *</label>
              <select
                className={inputClass}
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoEvento }))}
                style={{ colorScheme: 'dark' }}
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Polo (opcional)</label>
              <select
                className={inputClass}
                value={form.polo}
                onChange={(e) => setForm((f) => ({ ...f, polo: e.target.value }))}
                style={{ colorScheme: 'dark' }}
              >
                <option value="">Todos os polos</option>
                <option value="Anhanguera">Anhanguera</option>
                <option value="Sumaré">Sumaré</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Data de Início *</label>
              <input
                type="date"
                className={inputClass}
                value={form.data_inicio}
                onChange={(e) => setForm((f) => ({ ...f, data_inicio: e.target.value }))}
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Data de Fim (opcional)</label>
              <input
                type="date"
                className={inputClass}
                value={form.data_fim}
                onChange={(e) => setForm((f) => ({ ...f, data_fim: e.target.value }))}
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Descrição (opcional)</label>
              <textarea
                rows={2}
                className={`${inputClass} resize-none`}
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Informações adicionais..."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingId ? 'Salvar' : 'Adicionar'}
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

      {/* Filtros de tipo */}
      <div className="mb-5 flex flex-wrap gap-2">
        <button
          onClick={() => setTipoFiltro('todos')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            tipoFiltro === 'todos'
              ? 'bg-gray-700 text-white'
              : 'bg-gray-900 text-gray-500 hover:text-gray-300'
          }`}
        >
          Todos
        </button>
        {TIPOS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTipoFiltro(t.value)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              tipoFiltro === t.value ? t.cor : 'border-gray-800 bg-gray-900 text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Skeleton loading */}
      {loading && (
        <div className="space-y-6">
          {/* Próximos eventos skeleton */}
          <div className="rounded-xl border border-blue-900/30 bg-blue-950/10 p-4">
            <SkeletonText className="mb-3 h-3 w-32" />
            <div className="flex gap-3">
              <SkeletonBox className="h-8 w-40" />
              <SkeletonBox className="h-8 w-36" />
              <SkeletonBox className="h-8 w-44" />
            </div>
          </div>
          {/* Meses skeleton */}
          {['Janeiro', 'Fevereiro', 'Março'].map((m) => (
            <div key={m}>
              <div className="mb-3 flex items-center gap-3">
                <SkeletonText className="h-3 w-20" />
                <div className="h-px flex-1 bg-gray-800" />
              </div>
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-start gap-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
                    <SkeletonBox className="h-9 w-9 flex-shrink-0 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <SkeletonText className="h-4 w-1/2" />
                      <SkeletonText className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vazio */}
      {!loading && eventosFiltrados.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-600">
          <CalendarDays className="mb-4 h-14 w-14 opacity-30" />
          <p className="text-lg font-medium text-gray-500">Nenhum evento em {anoFiltro}</p>
          {isAdmin && <p className="mt-1 text-sm">Clique em "Novo Evento" para adicionar.</p>}
        </div>
      )}

      {/* Lista por mês */}
      {!loading && porMes.map(({ mes, itens }) => (
        <div key={mes} className="mb-6">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">{mes}</h2>
            <div className="h-px flex-1 bg-gray-800" />
            <span className="text-xs text-gray-600">{itens.length} evento{itens.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-2">
            {itens.map((ev) => {
              const cfg = getTipoConfig(ev.tipo);
              const passado = ev.data_inicio < hoje;
              return (
                <div
                  key={ev.id}
                  className={`flex items-start justify-between gap-4 rounded-xl border bg-gray-900 p-4 transition ${
                    passado ? 'border-gray-800/50 opacity-60' : 'border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex items-center justify-center rounded-lg border p-2 ${cfg.cor}`}>
                      {cfg.icon}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-white">{ev.titulo}</p>
                        {ev.polo && (
                          <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                            {ev.polo}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-gray-400">
                        {formatDateBR(ev.data_inicio)}
                        {ev.data_fim && ev.data_fim !== ev.data_inicio && ` → ${formatDateBR(ev.data_fim)}`}
                      </p>
                      {ev.descricao && (
                        <p className="mt-1 text-xs text-gray-500">{ev.descricao}</p>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => startEdit(ev)}
                        className="rounded-lg p-1.5 text-gray-600 transition hover:bg-gray-800 hover:text-blue-400"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(ev.id)}
                        className="rounded-lg p-1.5 text-gray-600 transition hover:bg-red-900/30 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
