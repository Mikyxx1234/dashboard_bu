import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Save, RefreshCw, AlertCircle, CheckCircle2,
  Target, CalendarRange, Zap, TrendingUp, Award, DollarSign,
  GraduationCap, Tag, TagsIcon,
} from 'lucide-react';
import { env } from '../config';

function writeHeaders() {
  return {
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface MetaRow {
  id: number;
  Abaixo?: number | null;
  abaixo?: number | null;
  Inter: number | null;
  Meta: string | null;
  Super: number | null;
  Inicio: string | null;
  fim: string | null;
  // Anhanguera
  'Ganho Abaixo'?: number | null;
  Ganho_Abaixo?: number | null;
  ganho_abaixo?: number | null;
  'Ganho Inter'?: number | null;
  'Ganho Meta'?: number | null;
  'Ganho Super'?: number | null;
  // Cupom (Sumaré - nossos polos)
  'Ganho Abaixo Cup'?: number | null;
  'Ganho Inter Cup'?: number | null;
  'Ganho Meta Cup'?: number | null;
  'Ganho Super Cup'?: number | null;
  // Sem Cupom (Sumaré - outro polo)
  'Ganho Abaixo SCup'?: number | null;
  'Ganho Inter SCup'?: number | null;
  'Ganho Meta SCup'?: number | null;
  'Ganho Super SCup'?: number | null;
}

interface FormData {
  Abaixo: string;
  Inter: string;
  Meta: string;
  Super: string;
  Inicio: string;
  fim: string;
  // Anhanguera
  GanhoAbaixo: string;
  GanhoInter: string;
  GanhoMeta: string;
  GanhoSuper: string;
  // Cupom
  GanhoAbaixoCup: string;
  GanhoInterCup: string;
  GanhoMetaCup: string;
  GanhoSuperCup: string;
  // Sem Cupom
  GanhoAbaixoSCup: string;
  GanhoInterSCup: string;
  GanhoMetaSCup: string;
  GanhoSuperSCup: string;
}

const emptyForm: FormData = {
  Abaixo: '', Inter: '', Meta: '', Super: '', Inicio: '', fim: '',
  GanhoAbaixo: '', GanhoInter: '', GanhoMeta: '', GanhoSuper: '',
  GanhoAbaixoCup: '', GanhoInterCup: '', GanhoMetaCup: '', GanhoSuperCup: '',
  GanhoAbaixoSCup: '', GanhoInterSCup: '', GanhoMetaSCup: '', GanhoSuperSCup: '',
};

function parseNum(v: string): number {
  if (v === '' || v == null) return 0;
  const n = Number(String(v).trim().replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

// ---------------------------------------------------------------------------
// Subcomponent: Prêmio Group
// ---------------------------------------------------------------------------
interface PremioGroupProps {
  title: string;
  subtitle: string;
  color: 'blue' | 'emerald' | 'amber';
  icon: React.ReactNode;
  fields: { key: keyof FormData; label: string; icon: React.ReactNode; iconColor: string }[];
  form: FormData;
  onChange: (field: keyof FormData, value: string) => void;
  inputClass: string;
}

function PremioGroup({ title, subtitle, color, icon, fields, form, onChange, inputClass }: PremioGroupProps) {
  const borderColor = { blue: 'border-blue-500/30', emerald: 'border-emerald-500/30', amber: 'border-amber-500/30' }[color];
  const bgColor    = { blue: 'bg-blue-500/[0.05]', emerald: 'bg-emerald-500/[0.05]', amber: 'bg-amber-500/[0.05]' }[color];
  const titleColor = { blue: 'text-blue-400', emerald: 'text-emerald-400', amber: 'text-amber-400' }[color];
  const iconBg     = { blue: 'bg-blue-500/10', emerald: 'bg-emerald-500/10', amber: 'bg-amber-500/10' }[color];

  return (
    <div className={`col-span-full rounded-xl border ${borderColor} ${bgColor} p-4`}>
      <div className="mb-3 flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconBg}`}>
          <span className={titleColor}>{icon}</span>
        </div>
        <div>
          <span className={`text-sm font-semibold ${titleColor}`}>{title}</span>
          <span className="ml-2 text-xs text-slate-500">{subtitle}</span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map(({ key, label, icon: fieldIcon, iconColor }) => (
          <div key={key}>
            <label className={`mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400`}>
              <span className={iconColor}>{fieldIcon}</span>
              {label}
            </label>
            <input
              type="number"
              step="0.01"
              value={form[key]}
              onChange={(e) => onChange(key, e.target.value)}
              placeholder="Ex: 0.00"
              className={inputClass}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export function MetaPage() {
  const [rows, setRows]         = useState<MetaRow[]>([]);
  const [form, setForm]         = useState<FormData>(emptyForm);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${env.SUPABASE_URL}/rest/v1/Meta_ANH?select=*&order=id.desc&limit=4`,
        { headers: writeHeaders() },
      );
      if (!res.ok) {
        const text = await res.text();
        let detail = text;
        try { const j = JSON.parse(text) as { message?: string }; if (j.message) detail = j.message; } catch { /**/ }
        throw new Error(detail || `HTTP ${res.status}`);
      }
      setRows(await res.json());
    } catch (err: unknown) {
      setError(`Erro ao carregar metas: ${err instanceof Error ? err.message : err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  function handleChange(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function startEdit(row: MetaRow) {
    setEditingId(row.id);
    setForm({
      Abaixo: row.Abaixo != null ? String(row.Abaixo) : row.abaixo != null ? String(row.abaixo) : '',
      Inter:  row.Inter?.toString() ?? '',
      Meta:   row.Meta ?? '',
      Super:  row.Super?.toString() ?? '',
      Inicio: row.Inicio ?? '',
      fim:    row.fim ?? '',
      // Anhanguera
      GanhoAbaixo:
        row['Ganho Abaixo'] != null ? String(row['Ganho Abaixo'])
        : row.Ganho_Abaixo != null  ? String(row.Ganho_Abaixo)
        : row.ganho_abaixo != null  ? String(row.ganho_abaixo)
        : '',
      GanhoInter:  row['Ganho Inter']?.toString() ?? '',
      GanhoMeta:   row['Ganho Meta']?.toString() ?? '',
      GanhoSuper:  row['Ganho Super']?.toString() ?? '',
      // Cupom
      GanhoAbaixoCup: row['Ganho Abaixo Cup']?.toString() ?? '',
      GanhoInterCup:  row['Ganho Inter Cup']?.toString() ?? '',
      GanhoMetaCup:   row['Ganho Meta Cup']?.toString() ?? '',
      GanhoSuperCup:  row['Ganho Super Cup']?.toString() ?? '',
      // Sem Cupom
      GanhoAbaixoSCup: row['Ganho Abaixo SCup']?.toString() ?? '',
      GanhoInterSCup:  row['Ganho Inter SCup']?.toString() ?? '',
      GanhoMetaSCup:   row['Ganho Meta SCup']?.toString() ?? '',
      GanhoSuperSCup:  row['Ganho Super SCup']?.toString() ?? '',
    });
    setSuccess('');
    setError('');
  }

  function cancelEdit() { setEditingId(null); setForm(emptyForm); }

  async function handleSave() {
    if (!form.Inter || !form.Meta || !form.Super || !form.Inicio || !form.fim) {
      setError('Preencha os campos de meta e período antes de salvar.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');

    const abaixoVal     = form.Abaixo !== '' ? parseNum(form.Abaixo) : 1;
    const ganhoAbaixoVal = form.GanhoAbaixo !== '' ? parseNum(form.GanhoAbaixo) : 0;

    const body: Record<string, string | number | null> = {
      Inter:  parseNum(form.Inter),
      Meta:   form.Meta,
      Super:  parseNum(form.Super),
      Inicio: form.Inicio,
      fim:    form.fim,
      // Anhanguera
      'Ganho Inter':  form.GanhoInter  ? parseNum(form.GanhoInter)  : 0,
      'Ganho Meta':   form.GanhoMeta   ? parseNum(form.GanhoMeta)   : 0,
      'Ganho Super':  form.GanhoSuper  ? parseNum(form.GanhoSuper)  : 0,
      // Cupom
      'Ganho Abaixo Cup': form.GanhoAbaixoCup ? parseNum(form.GanhoAbaixoCup) : 0,
      'Ganho Inter Cup':  form.GanhoInterCup  ? parseNum(form.GanhoInterCup)  : 0,
      'Ganho Meta Cup':   form.GanhoMetaCup   ? parseNum(form.GanhoMetaCup)   : 0,
      'Ganho Super Cup':  form.GanhoSuperCup  ? parseNum(form.GanhoSuperCup)  : 0,
      // Sem Cupom
      'Ganho Abaixo SCup': form.GanhoAbaixoSCup ? parseNum(form.GanhoAbaixoSCup) : 0,
      'Ganho Inter SCup':  form.GanhoInterSCup  ? parseNum(form.GanhoInterSCup)  : 0,
      'Ganho Meta SCup':   form.GanhoMetaSCup   ? parseNum(form.GanhoMetaSCup)   : 0,
      'Ganho Super SCup':  form.GanhoSuperSCup  ? parseNum(form.GanhoSuperSCup)  : 0,
    };

    // Tenta variantes do campo "Ganho Abaixo" / "abaixo" para compatibilidade com schema real
    const saveVariants: Record<string, string | number | null>[] = [
      { Abaixo: abaixoVal,  'Ganho Abaixo': ganhoAbaixoVal },
      { Abaixo: abaixoVal,  Ganho_Abaixo: ganhoAbaixoVal },
      { abaixo: abaixoVal,  'Ganho Abaixo': ganhoAbaixoVal },
      { abaixo: abaixoVal,  Ganho_Abaixo: ganhoAbaixoVal },
    ];

    async function parseErrorDetail(res: Response): Promise<string> {
      const text = await res.text();
      try {
        const j = JSON.parse(text) as { message?: string; hint?: string; details?: string };
        return [j.message, j.hint, j.details].filter(Boolean).join(' — ') || text;
      } catch { return text || `HTTP ${res.status}`; }
    }

    try {
      const url    = editingId !== null
        ? `${env.SUPABASE_URL}/rest/v1/Meta_ANH?id=eq.${editingId}`
        : `${env.SUPABASE_URL}/rest/v1/Meta_ANH`;
      const method = editingId !== null ? 'PATCH' : 'POST';

      let res: Response | undefined;
      let lastDetail = '';
      for (const extra of saveVariants) {
        res = await fetch(url, { method, headers: writeHeaders(), body: JSON.stringify({ ...body, ...extra }) });
        if (res.ok) break;
        lastDetail = await parseErrorDetail(res);
        if (res.status !== 400) break;
      }
      if (!res?.ok) throw new Error(lastDetail || 'Não foi possível salvar a meta.');

      setSuccess(editingId !== null ? 'Meta atualizada com sucesso!' : 'Nova meta criada com sucesso!');
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
    setError(''); setSuccess('');
    try {
      const res = await fetch(`${env.SUPABASE_URL}/rest/v1/Meta_ANH?id=eq.${id}`, {
        method: 'DELETE', headers: writeHeaders(),
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

  function formatCurrency(value: number | null | undefined) {
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

  // Prize fields config
  const premioFields = (prefix: '' | 'Cup' | 'SCup') => {
    const suffix = prefix ? prefix : '';
    return [
      { key: `GanhoAbaixo${suffix}` as keyof FormData, label: 'Ganho Abaixo', icon: <Zap className="h-3 w-3" />, iconColor: 'text-rose-400' },
      { key: `GanhoInter${suffix}` as keyof FormData,  label: 'Ganho Inter',  icon: <Zap className="h-3 w-3" />, iconColor: 'text-amber-400' },
      { key: `GanhoMeta${suffix}` as keyof FormData,   label: 'Ganho Meta',   icon: <TrendingUp className="h-3 w-3" />, iconColor: 'text-blue-400' },
      { key: `GanhoSuper${suffix}` as keyof FormData,  label: 'Ganho Super',  icon: <Award className="h-3 w-3" />, iconColor: 'text-emerald-400' },
    ];
  };

  return (
    <div
      className="min-h-screen p-6 lg:p-8"
      style={{ background: 'linear-gradient(135deg, #0c1222 0%, #111a2e 50%, #0f1628 100%)' }}
    >
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)', boxShadow: '0 8px 32px rgba(37,99,235,0.3)' }}
            >
              <Target className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Gerenciar Metas</h1>
              <p className="text-sm text-slate-400">Adicione ou edite os períodos de meta para o Dashboard de Leads</p>
            </div>
          </div>
          <button
            onClick={fetchRows} disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-slate-300 backdrop-blur transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/20 p-4 text-sm text-red-300" style={{ background: 'rgba(239,68,68,0.08)' }}>
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />{error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 p-4 text-sm text-emerald-300" style={{ background: 'rgba(16,185,129,0.08)' }}>
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />{success}
          </div>
        )}

        {/* Form */}
        <div
          className="rounded-2xl border border-white/[0.07] p-6"
          style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(24px)', boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
              {editingId !== null ? <Save className="h-4 w-4 text-blue-400" /> : <Plus className="h-4 w-4 text-blue-400" />}
            </div>
            <h2 className="text-lg font-semibold text-white">
              {editingId !== null ? `Editando Meta #${editingId}` : 'Nova Meta'}
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

            {/* Meta levels */}
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-400">
                <Zap className="h-3.5 w-3.5 text-rose-400" />
                Abaixo <span className="text-slate-600">(mín. leads p/ faixa abaixo da Inter)</span>
              </label>
              <input type="number" value={form.Abaixo} onChange={(e) => handleChange('Abaixo', e.target.value)} placeholder="Ex: 1" className={inputClass} />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-400">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                Inter <span className="text-slate-600">(mínimo)</span>
              </label>
              <input type="number" value={form.Inter} onChange={(e) => handleChange('Inter', e.target.value)} placeholder="Ex: 70" className={inputClass} />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-400">
                <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
                Meta <span className="text-slate-600">(objetivo)</span>
              </label>
              <input type="number" value={form.Meta} onChange={(e) => handleChange('Meta', e.target.value)} placeholder="Ex: 80" className={inputClass} />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-400">
                <Award className="h-3.5 w-3.5 text-emerald-400" />
                Super <span className="text-slate-600">(superação)</span>
              </label>
              <input type="number" value={form.Super} onChange={(e) => handleChange('Super', e.target.value)} placeholder="Ex: 96" className={inputClass} />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-400">
                <CalendarRange className="h-3.5 w-3.5 text-violet-400" />
                Data Início
              </label>
              <input type="date" value={form.Inicio} onChange={(e) => handleChange('Inicio', e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-400">
                <CalendarRange className="h-3.5 w-3.5 text-violet-400" />
                Data Fim
              </label>
              <input type="date" value={form.fim} onChange={(e) => handleChange('fim', e.target.value)} className={inputClass} />
            </div>

            {/* Divider */}
            <div className="col-span-full my-1 border-t border-white/[0.06]" />

            <div className="col-span-full mb-1 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-semibold text-slate-300">Premiação por nível (R$)</span>
              <span className="text-xs text-slate-500">— defina os valores por categoria</span>
            </div>

            {/* Anhanguera */}
            <PremioGroup
              title="Anhanguera"
              subtitle="leads da Anhanguera"
              color="blue"
              icon={<GraduationCap className="h-3.5 w-3.5" />}
              fields={premioFields('')}
              form={form}
              onChange={handleChange}
              inputClass={inputClass}
            />

            {/* Cupom */}
            <PremioGroup
              title="Cupom"
              subtitle="Sumaré — nossos polos"
              color="emerald"
              icon={<Tag className="h-3.5 w-3.5" />}
              fields={premioFields('Cup')}
              form={form}
              onChange={handleChange}
              inputClass={inputClass}
            />

            {/* Sem Cupom */}
            <PremioGroup
              title="Sem Cupom"
              subtitle="Sumaré — outro polo"
              color="amber"
              icon={<TagsIcon className="h-3.5 w-3.5" />}
              fields={premioFields('SCup')}
              form={form}
              onChange={handleChange}
              inputClass={inputClass}
            />

            {/* Actions */}
            <div className="col-span-full flex items-center gap-2">
              <button
                onClick={handleSave} disabled={saving}
                className="flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)', boxShadow: '0 4px 20px rgba(37,99,235,0.35)' }}
              >
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : editingId !== null ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {editingId !== null ? 'Salvar Alterações' : 'Adicionar Meta'}
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
          style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(24px)', boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}
        >
          <div className="border-b border-white/[0.06] px-6 py-5">
            <h2 className="text-lg font-semibold text-white">Metas Cadastradas</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              A meta com período ativo aparece automaticamente no Dashboard. Exibindo as{' '}
              <span className="text-slate-400">4 metas mais recentes</span>.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-500">
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />Carregando...
            </div>
          ) : rows.length === 0 ? (
            <div className="py-20 text-center text-slate-500">
              Nenhuma meta cadastrada ainda. Use o formulário acima para criar a primeira.
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-white/[0.04]">
              {rows.map((row) => {
                const active = isActive(row);
                const ganhoAbaixo = row['Ganho Abaixo'] ?? row.Ganho_Abaixo ?? row.ganho_abaixo ?? null;
                return (
                  <div
                    key={row.id}
                    className={`px-6 py-5 transition hover:bg-white/[0.02] ${active ? 'bg-blue-500/[0.03]' : ''}`}
                  >
                    {/* Row header */}
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {active ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 8px rgba(52,211,153,0.6)' }} />
                            Ativa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1 text-xs font-medium text-slate-500">
                            Inativa
                          </span>
                        )}
                        <span className="font-semibold text-slate-200">
                          {formatDate(row.Inicio)} — {formatDate(row.fim)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(row)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-blue-400 transition hover:bg-blue-500/10">
                          Editar
                        </button>
                        <button onClick={() => handleDelete(row.id)} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Meta levels */}
                    <div className="mb-4 flex flex-wrap gap-3 text-sm">
                      {[
                        { label: 'Abaixo', value: row.Abaixo ?? row.abaixo, color: 'text-rose-400' },
                        { label: 'Inter',  value: row.Inter,  color: 'text-amber-400' },
                        { label: 'Meta',   value: row.Meta,   color: 'text-blue-400 font-bold' },
                        { label: 'Super',  value: row.Super,  color: 'text-emerald-400' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5">
                          <span className="text-xs text-slate-500">{label}</span>
                          <span className={`text-sm font-semibold ${color}`}>{value ?? '—'}</span>
                        </div>
                      ))}
                    </div>

                    {/* Prize categories */}
                    <div className="grid gap-3 sm:grid-cols-3">
                      {/* Anhanguera */}
                      <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.04] p-3">
                        <div className="mb-2 flex items-center gap-1.5">
                          <GraduationCap className="h-3.5 w-3.5 text-blue-400" />
                          <span className="text-xs font-semibold text-blue-400">Anhanguera</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <span className="text-slate-500">Abaixo:</span><span className="text-right text-rose-300">{formatCurrency(ganhoAbaixo)}</span>
                          <span className="text-slate-500">Inter:</span><span className="text-right text-amber-300">{formatCurrency(row['Ganho Inter'])}</span>
                          <span className="text-slate-500">Meta:</span><span className="text-right font-semibold text-blue-300">{formatCurrency(row['Ganho Meta'])}</span>
                          <span className="text-slate-500">Super:</span><span className="text-right text-emerald-300">{formatCurrency(row['Ganho Super'])}</span>
                        </div>
                      </div>

                      {/* Cupom */}
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
                        <div className="mb-2 flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-xs font-semibold text-emerald-400">Cupom</span>
                          <span className="text-xs text-slate-600">Sumaré</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <span className="text-slate-500">Abaixo:</span><span className="text-right text-rose-300">{formatCurrency(row['Ganho Abaixo Cup'])}</span>
                          <span className="text-slate-500">Inter:</span><span className="text-right text-amber-300">{formatCurrency(row['Ganho Inter Cup'])}</span>
                          <span className="text-slate-500">Meta:</span><span className="text-right font-semibold text-emerald-300">{formatCurrency(row['Ganho Meta Cup'])}</span>
                          <span className="text-slate-500">Super:</span><span className="text-right text-emerald-300">{formatCurrency(row['Ganho Super Cup'])}</span>
                        </div>
                      </div>

                      {/* Sem Cupom */}
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3">
                        <div className="mb-2 flex items-center gap-1.5">
                          <TagsIcon className="h-3.5 w-3.5 text-amber-400" />
                          <span className="text-xs font-semibold text-amber-400">Sem Cupom</span>
                          <span className="text-xs text-slate-600">Sumaré</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <span className="text-slate-500">Abaixo:</span><span className="text-right text-rose-300">{formatCurrency(row['Ganho Abaixo SCup'])}</span>
                          <span className="text-slate-500">Inter:</span><span className="text-right text-amber-300">{formatCurrency(row['Ganho Inter SCup'])}</span>
                          <span className="text-slate-500">Meta:</span><span className="text-right font-semibold text-amber-300">{formatCurrency(row['Ganho Meta SCup'])}</span>
                          <span className="text-slate-500">Super:</span><span className="text-right text-emerald-300">{formatCurrency(row['Ganho Super SCup'])}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
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
