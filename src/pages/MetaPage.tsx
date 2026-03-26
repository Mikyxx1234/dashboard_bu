import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, RefreshCw, AlertCircle, CheckCircle2, Target, CalendarRange, Zap, TrendingUp, Award, DollarSign } from 'lucide-react';

const SUPABASE_URL = 'https://tufvduiaybogfhgausqj.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1ZnZkdWlheWJvZ2ZoZ2F1c3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwOTUyNjksImV4cCI6MjA3MjY3MTI2OX0.o-rO2rm5uYtI-NDp5amFm9gkXcToJWjuHDJFkaOtYtQ';
const SUPABASE_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1ZnZkdWlheWJvZ2ZoZ2F1c3FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA5NTI2OSwiZXhwIjoyMDcyNjcxMjY5fQ.dhfyYnXfPXHsly0YAmpUP7yS7U6CB0qkyihMPlRMfPg';

const readHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

const writeHeaders = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

interface MetaRow {
  id: number;
  Inter: number | null;
  Meta: string | null;
  Super: number | null;
  Inicio: string | null;
  fim: string | null;
  'Ganho Inter': number | null;
  'Ganho Meta': number | null;
  'Ganho Super': number | null;
}

interface FormData {
  Inter: string;
  Meta: string;
  Super: string;
  Inicio: string;
  fim: string;
  GanhoInter: string;
  GanhoMeta: string;
  GanhoSuper: string;
}

const emptyForm: FormData = { Inter: '', Meta: '', Super: '', Inicio: '', fim: '', GanhoInter: '', GanhoMeta: '', GanhoSuper: '' };

export function MetaPage() {
  const [rows, setRows] = useState<MetaRow[]>([]);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/Meta_ANH?select=*&order=id.desc`, {
        headers: readHeaders,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRows(await res.json());
    } catch (err: unknown) {
      setError(`Erro ao carregar metas: ${err instanceof Error ? err.message : err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  function handleChange(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function startEdit(row: MetaRow) {
    setEditingId(row.id);
    setForm({
      Inter: row.Inter?.toString() ?? '',
      Meta: row.Meta ?? '',
      Super: row.Super?.toString() ?? '',
      Inicio: row.Inicio ?? '',
      fim: row.fim ?? '',
      GanhoInter: row['Ganho Inter']?.toString() ?? '',
      GanhoMeta: row['Ganho Meta']?.toString() ?? '',
      GanhoSuper: row['Ganho Super']?.toString() ?? '',
    });
    setSuccess('');
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSave() {
    if (!form.Inter || !form.Meta || !form.Super || !form.Inicio || !form.fim) {
      setError('Preencha todos os campos antes de salvar.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const body = {
      Inter: Number(form.Inter),
      Meta: form.Meta,
      Super: Number(form.Super),
      Inicio: form.Inicio,
      fim: form.fim,
      'Ganho Inter': form.GanhoInter ? Number(form.GanhoInter) : 0,
      'Ganho Meta': form.GanhoMeta ? Number(form.GanhoMeta) : 0,
      'Ganho Super': form.GanhoSuper ? Number(form.GanhoSuper) : 0,
    };

    try {
      if (editingId !== null) {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/Meta_ANH?id=eq.${editingId}`,
          { method: 'PATCH', headers: writeHeaders, body: JSON.stringify(body) },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setSuccess('Meta atualizada com sucesso!');
      } else {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/Meta_ANH`, {
          method: 'POST',
          headers: writeHeaders,
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setSuccess('Nova meta criada com sucesso!');
      }

      setEditingId(null);
      setForm(emptyForm);
      await fetchRows();
    } catch (err: unknown) {
      setError(`Erro ao salvar: ${err instanceof Error ? err.message : err}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja excluir esta meta?')) return;

    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/Meta_ANH?id=eq.${id}`, {
        method: 'DELETE',
        headers: writeHeaders,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSuccess('Meta excluída com sucesso!');
      if (editingId === id) cancelEdit();
      await fetchRows();
    } catch (err: unknown) {
      setError(`Erro ao excluir: ${err instanceof Error ? err.message : err}`);
    }
  }

  function formatDate(d: string | null) {
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  }

  function formatCurrency(value: number | null) {
    if (value == null) return '—';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function isActive(row: MetaRow) {
    if (!row.Inicio || !row.fim) return false;
    const today = new Date().toISOString().slice(0, 10);
    return row.Inicio <= today && row.fim >= today;
  }

  const inputClass =
    'w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 [color-scheme:dark]';

  return (
    <div
      className="min-h-screen p-6 lg:p-8"
      style={{
        background: 'linear-gradient(135deg, #0c1222 0%, #111a2e 50%, #0f1628 100%)',
      }}
    >
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                boxShadow: '0 8px 32px rgba(37, 99, 235, 0.3)',
              }}
            >
              <Target className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Gerenciar Metas
              </h1>
              <p className="text-sm text-slate-400">
                Adicione ou edite os períodos de meta para o Dashboard de Leads
              </p>
            </div>
          </div>
          <button
            onClick={fetchRows}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-slate-300 backdrop-blur transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div
            className="flex items-center gap-3 rounded-xl border border-red-500/20 p-4 text-sm text-red-300"
            style={{ background: 'rgba(239, 68, 68, 0.08)' }}
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
            {error}
          </div>
        )}
        {success && (
          <div
            className="flex items-center gap-3 rounded-xl border border-emerald-500/20 p-4 text-sm text-emerald-300"
            style={{ background: 'rgba(16, 185, 129, 0.08)' }}
          >
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />
            {success}
          </div>
        )}

        {/* Form */}
        <div
          className="rounded-2xl border border-white/[0.07] p-6"
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.25)',
          }}
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
              {editingId !== null ? (
                <Save className="h-4 w-4 text-blue-400" />
              ) : (
                <Plus className="h-4 w-4 text-blue-400" />
              )}
            </div>
            <h2 className="text-lg font-semibold text-white">
              {editingId !== null ? `Editando Meta #${editingId}` : 'Nova Meta'}
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-400">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                Inter <span className="text-slate-600">(mínimo)</span>
              </label>
              <input
                type="number"
                value={form.Inter}
                onChange={(e) => handleChange('Inter', e.target.value)}
                placeholder="Ex: 70"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-400">
                <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
                Meta <span className="text-slate-600">(objetivo)</span>
              </label>
              <input
                type="number"
                value={form.Meta}
                onChange={(e) => handleChange('Meta', e.target.value)}
                placeholder="Ex: 80"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-400">
                <Award className="h-3.5 w-3.5 text-emerald-400" />
                Super <span className="text-slate-600">(superação)</span>
              </label>
              <input
                type="number"
                value={form.Super}
                onChange={(e) => handleChange('Super', e.target.value)}
                placeholder="Ex: 96"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-400">
                <CalendarRange className="h-3.5 w-3.5 text-violet-400" />
                Data Início
              </label>
              <input
                type="date"
                value={form.Inicio}
                onChange={(e) => handleChange('Inicio', e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-400">
                <CalendarRange className="h-3.5 w-3.5 text-violet-400" />
                Data Fim
              </label>
              <input
                type="date"
                value={form.fim}
                onChange={(e) => handleChange('fim', e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="col-span-full my-1 border-t border-white/[0.06]" />

            <div className="col-span-full mb-1 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-semibold text-slate-300">Premiação por nível (R$)</span>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-400">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                Ganho Inter <span className="text-slate-600">(R$)</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={form.GanhoInter}
                onChange={(e) => handleChange('GanhoInter', e.target.value)}
                placeholder="Ex: 500.00"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-400">
                <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
                Ganho Meta <span className="text-slate-600">(R$)</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={form.GanhoMeta}
                onChange={(e) => handleChange('GanhoMeta', e.target.value)}
                placeholder="Ex: 1000.00"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-400">
                <Award className="h-3.5 w-3.5 text-emerald-400" />
                Ganho Super <span className="text-slate-600">(R$)</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={form.GanhoSuper}
                onChange={(e) => handleChange('GanhoSuper', e.target.value)}
                placeholder="Ex: 2000.00"
                className={inputClass}
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                  boxShadow: '0 4px 20px rgba(37, 99, 235, 0.35)',
                }}
              >
                {saving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : editingId !== null ? (
                  <Save className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {editingId !== null ? 'Salvar' : 'Adicionar'}
              </button>
              {editingId !== null && (
                <button
                  onClick={cancelEdit}
                  className="rounded-xl border border-white/[0.1] px-4 py-3 text-sm font-medium text-slate-400 transition hover:bg-white/[0.05] hover:text-slate-200"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div
          className="overflow-hidden rounded-2xl border border-white/[0.07]"
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.25)',
          }}
        >
          <div className="border-b border-white/[0.06] px-6 py-5">
            <h2 className="text-lg font-semibold text-white">Metas Cadastradas</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              A meta com período ativo aparece automaticamente no Dashboard de Leads
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-500">
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
              Carregando...
            </div>
          ) : rows.length === 0 ? (
            <div className="py-20 text-center text-slate-500">
              Nenhuma meta cadastrada ainda. Use o formulário acima para criar a primeira.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Período</th>
                    <th className="px-6 py-3.5 text-center">Inter</th>
                    <th className="px-6 py-3.5 text-center">Meta</th>
                    <th className="px-6 py-3.5 text-center">Super</th>
                    <th className="px-6 py-3.5 text-center">R$ Inter</th>
                    <th className="px-6 py-3.5 text-center">R$ Meta</th>
                    <th className="px-6 py-3.5 text-center">R$ Super</th>
                    <th className="px-6 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {rows.map((row) => {
                    const active = isActive(row);
                    return (
                      <tr
                        key={row.id}
                        className={`transition hover:bg-white/[0.03] ${active ? 'bg-blue-500/[0.04]' : ''}`}
                      >
                        <td className="px-6 py-4">
                          {active ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                                style={{ boxShadow: '0 0 8px rgba(52, 211, 153, 0.6)' }}
                              />
                              Ativa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1 text-xs font-medium text-slate-500">
                              Inativa
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-200">
                          {formatDate(row.Inicio)} — {formatDate(row.fim)}
                        </td>
                        <td className="px-6 py-4 text-center text-slate-400">
                          {row.Inter ?? '—'}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-blue-400">
                          {row.Meta ?? '—'}
                        </td>
                        <td className="px-6 py-4 text-center text-slate-400">
                          {row.Super ?? '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center text-xs text-amber-400/80">
                          {formatCurrency(row['Ganho Inter'])}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center text-xs font-semibold text-emerald-400/80">
                          {formatCurrency(row['Ganho Meta'])}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center text-xs text-emerald-300">
                          {formatCurrency(row['Ganho Super'])}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => startEdit(row)}
                              className="rounded-lg px-3 py-1.5 text-xs font-medium text-blue-400 transition hover:bg-blue-500/10"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(row.id)}
                              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-600">
          As alterações são refletidas automaticamente no Dashboard de Leads para todos os usuários.
        </p>
      </div>
    </div>
  );
}
