import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  RefreshCw,
  AlertCircle,
  Clock,
  Headphones,
  GraduationCap,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { env } from '../config';

/* ── Supabase ── */

const VIEW = 'vw_historico_distribuicao';
const PAGE_SIZE = 1000;

const RESPONSAVEL_MAP: Record<number, string> = {
  10408327: 'Breno',
  13864672: 'Leandro',
  10093783: 'Vitoria',
};

function supaHeaders() {
  return {
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  };
}

/* ── Types ── */

interface SupaRow {
  id: number;
  id_responsavel: number;
  tipo: string;
  data_distribuicao: string;
  data_fechamento: string | null;
  tma_segundos: number | null;
  consultor: string | null;
}

interface Collaborator {
  name: string;
  initials: string;
  services: number;
  atendimentos: number;
  avgTime: number | null;
}

interface DailyPoint {
  dia: string;
  atendimentos: number;
}

type PeriodFilter = 'all' | 'today' | '7days' | '30days' | 'month';

/* ── Helpers ── */

function resolveName(row: SupaRow): string | null {
  if (row.consultor?.trim()) return row.consultor.trim();
  return RESPONSAVEL_MAP[row.id_responsavel] ?? null;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function toLocalDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}T00:00:00`;
}

function getPeriodRange(period: PeriodFilter): { from?: string; to?: string } {
  if (period === 'all') return {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let from: Date;
  switch (period) {
    case 'today':
      from = today;
      break;
    case '7days':
      from = new Date(today);
      from.setDate(from.getDate() - 7);
      break;
    case '30days':
      from = new Date(today);
      from.setDate(from.getDate() - 30);
      break;
    case 'month':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }
  return { from: toLocalDate(from!), to: toLocalDate(tomorrow) };
}

function performanceBadge(avgTime: number | null) {
  if (avgTime === null) return { label: 'N/D', cls: 'bg-slate-500/20 text-slate-400' };
  if (avgTime <= 7.5) return { label: 'Excelente', cls: 'bg-emerald-500/20 text-emerald-400' };
  if (avgTime <= 8.5) return { label: 'Bom', cls: 'bg-blue-500/20 text-blue-400' };
  if (avgTime <= 9.5) return { label: 'Regular', cls: 'bg-amber-500/20 text-amber-400' };
  return { label: 'Atenção', cls: 'bg-red-500/20 text-red-400' };
}

const BAR_COLORS = [
  'rgba(59,130,246,0.75)',
  'rgba(34,197,94,0.75)',
  'rgba(139,92,246,0.75)',
  'rgba(245,158,11,0.75)',
  'rgba(236,72,153,0.75)',
  'rgba(14,165,233,0.75)',
  'rgba(99,102,241,0.75)',
  'rgba(244,63,94,0.75)',
  'rgba(20,184,166,0.75)',
];

const darkTooltipStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
  color: '#e2e8f0',
};

function formatNumber(v: number) {
  return v.toLocaleString('pt-BR');
}

function useIsMobile(breakpoint = 640) {
  const [mobile, setMobile] = useState(window.innerWidth < breakpoint);
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return mobile;
}

/* ── Component ── */

export default function AcademicoColaboradoresPage() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [dailyData, setDailyData] = useState<DailyPoint[]>([]);
  const [totalServices, setTotalServices] = useState(0);
  const [avgTimeGlobal, setAvgTimeGlobal] = useState<string>('--');
  const [period, setPeriod] = useState<PeriodFilter>('30days');
  const [selectedResp, setSelectedResp] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const allRows: SupaRow[] = [];
      let offset = 0;
      const fields = 'id,id_responsavel,tipo,data_distribuicao,data_fechamento,tma_segundos,consultor';
      const range = getPeriodRange(period);

      const filterParts: string[] = [];
      if (range.from) filterParts.push(`data_distribuicao=gte.${range.from}`);
      if (range.to) filterParts.push(`data_distribuicao=lt.${range.to}`);
      if (selectedResp !== 'all') {
        const id = Object.entries(RESPONSAVEL_MAP).find(([, name]) => name === selectedResp)?.[0];
        if (id) filterParts.push(`id_responsavel=eq.${id}`);
      }
      const filterStr = filterParts.length ? '&' + filterParts.join('&') : '';

      while (true) {
        const url =
          `${env.SUPABASE_URL}/rest/v1/${VIEW}?select=${fields}&order=id.asc&limit=${PAGE_SIZE}&offset=${offset}${filterStr}`;
        const res = await fetch(url, { headers: supaHeaders() });
        if (!res.ok) throw new Error(`Supabase HTTP ${res.status}`);
        const batch: SupaRow[] = await res.json();
        allRows.push(...batch);
        if (batch.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }

      processData(allRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar dados');
    } finally {
      setLoading(false);
    }
  }, [period, selectedResp]);

  function processData(rows: SupaRow[]) {
    const withOwner = rows.filter((r) => resolveName(r) !== null);
    const grouped: Record<string, { name: string; total: number; atendimentos: number; totalTma: number; tmaCount: number }> = {};

    withOwner.forEach((row) => {
      const name = resolveName(row)!;
      if (!grouped[name]) grouped[name] = { name, total: 0, atendimentos: 0, totalTma: 0, tmaCount: 0 };
      grouped[name].total++;
      if (row.tipo === 'Atendimento') grouped[name].atendimentos++;
      if (row.tma_segundos != null && row.tma_segundos > 0) {
        grouped[name].totalTma += row.tma_segundos;
        grouped[name].tmaCount++;
      }
    });

    const collabs: Collaborator[] = Object.values(grouped)
      .map((c) => ({
        name: c.name,
        initials: getInitials(c.name),
        services: c.total,
        atendimentos: c.atendimentos,
        avgTime: c.tmaCount > 0 ? parseFloat((c.totalTma / c.tmaCount / 60).toFixed(1)) : null,
      }))
      .sort((a, b) => b.services - a.services);

    setCollaborators(collabs);
    const total = collabs.reduce((s, c) => s + c.services, 0);
    setTotalServices(total);

    const allTma = withOwner.filter((r) => r.tma_segundos != null && r.tma_segundos > 0);
    if (allTma.length > 0) {
      const avgSec = allTma.reduce((s, r) => s + r.tma_segundos!, 0) / allTma.length;
      const m = Math.floor(avgSec / 60);
      const sec = Math.round(avgSec % 60);
      setAvgTimeGlobal(`${m}m ${String(sec).padStart(2, '0')}s`);
    } else {
      setAvgTimeGlobal('N/D');
    }

    const dayMap: Record<string, number> = {};
    withOwner.forEach((r) => {
      const d = r.data_distribuicao?.slice(0, 10);
      if (d) dayMap[d] = (dayMap[d] ?? 0) + 1;
    });
    const daily = Object.entries(dayMap)
      .map(([dia, atendimentos]) => ({ dia, atendimentos }))
      .sort((a, b) => a.dia.localeCompare(b.dia));
    setDailyData(daily);
  }

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const barServicesData = collaborators.map((c, i) => ({
    name: c.name,
    atendimentos: c.services,
    fill: BAR_COLORS[i % BAR_COLORS.length],
  }));

  const barTmaData = collaborators
    .filter((c) => c.avgTime !== null)
    .map((c) => ({
      name: c.name,
      tma: c.avgTime!,
      fill:
        c.avgTime! <= 7.5
          ? 'rgba(34,197,94,0.75)'
          : c.avgTime! <= 9
            ? 'rgba(245,158,11,0.75)'
            : 'rgba(239,68,68,0.75)',
    }));

  const respNames = Object.values(RESPONSAVEL_MAP);

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0c1222 0%, #111a2e 50%, #0f1628 100%)',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <header
        style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(24px)' }}
        className="border-b border-white/[0.07]"
      >
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-600 p-2">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Colaboradores Acadêmicos</h1>
                <p className="text-sm text-slate-400">Desempenho e ranking de atendimentos</p>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-3">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
                className="rounded-lg border border-white/[0.08] bg-[#161b22] px-3 py-2 text-xs sm:text-sm text-white [color-scheme:dark] focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="all">Todo período</option>
                <option value="today">Hoje</option>
                <option value="7days">Últimos 7 dias</option>
                <option value="30days">Últimos 30 dias</option>
                <option value="month">Mês atual</option>
              </select>

              <select
                value={selectedResp}
                onChange={(e) => setSelectedResp(e.target.value)}
                className="rounded-lg border border-white/[0.08] bg-[#161b22] px-3 py-2 text-xs sm:text-sm text-white [color-scheme:dark] focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="all">Todos</option>
                {respNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>

              <button
                onClick={fetchData}
                disabled={loading}
                className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-xs sm:text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && collaborators.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-slate-500" />
              <p className="mt-3 text-slate-500">Carregando dados...</p>
            </div>
          </div>
        ) : (
          <>
            {/* KPI Summary */}
            <div className="mb-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-white/[0.07] bg-[#161b22] p-5" style={{ backdropFilter: 'blur(24px)' }}>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-500/20 p-2">
                    <Users className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-400">Colaboradores</p>
                    <p className="text-2xl font-bold text-white">{collaborators.length}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-[#161b22] p-5" style={{ backdropFilter: 'blur(24px)' }}>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-500/20 p-2">
                    <Headphones className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-400">Total Atendimentos</p>
                    <p className="text-2xl font-bold text-white">{formatNumber(totalServices)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-[#161b22] p-5" style={{ backdropFilter: 'blur(24px)' }}>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-cyan-500/20 p-2">
                    <Clock className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-400">Tempo Médio</p>
                    <p className="text-2xl font-bold text-white">{avgTimeGlobal}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts row */}
            <div className="mb-8 grid gap-6 lg:grid-cols-2">
              {/* Atendimentos por Colaborador */}
              <div className="rounded-xl border border-white/[0.07] bg-[#161b22] p-4 sm:p-6" style={{ backdropFilter: 'blur(24px)' }}>
                <h3 className="mb-4 text-base sm:text-lg font-semibold text-slate-100">Atendimentos por Colaborador</h3>
                {barServicesData.length > 0 ? (
                  <div className={isMobile ? 'h-56' : 'h-72'}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barServicesData} margin={isMobile ? { left: -20, right: 5 } : undefined}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="name" tick={{ fontSize: isMobile ? 9 : 12, fill: '#94a3b8' }} stroke="#64748b" interval={0} angle={isMobile ? -35 : 0} textAnchor={isMobile ? 'end' : 'middle'} height={isMobile ? 50 : 30} />
                        <YAxis tick={{ fontSize: isMobile ? 10 : 12, fill: '#94a3b8' }} stroke="#64748b" width={isMobile ? 30 : 60} />
                        <Tooltip contentStyle={darkTooltipStyle} />
                        <Bar dataKey="atendimentos" name="Atendimentos" radius={[6, 6, 0, 0]}>
                          {barServicesData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-12 text-center text-sm text-slate-500">Nenhum dado disponível</p>
                )}
              </div>

              {/* TMA por Colaborador */}
              <div className="rounded-xl border border-white/[0.07] bg-[#161b22] p-4 sm:p-6" style={{ backdropFilter: 'blur(24px)' }}>
                <h3 className="mb-4 text-base sm:text-lg font-semibold text-slate-100">Tempo Médio por Colaborador</h3>
                {barTmaData.length > 0 ? (
                  <div className={isMobile ? 'h-56' : 'h-72'}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barTmaData} layout="vertical" margin={isMobile ? { left: -10, right: 5 } : undefined}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis
                          type="number"
                          tick={{ fontSize: isMobile ? 10 : 12, fill: '#94a3b8' }}
                          stroke="#64748b"
                          label={isMobile ? undefined : { value: 'minutos', position: 'insideBottom', offset: -5, style: { fill: '#94a3b8', fontSize: 11 } }}
                        />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: isMobile ? 10 : 12, fill: '#94a3b8' }} stroke="#64748b" width={isMobile ? 55 : 80} />
                        <Tooltip contentStyle={darkTooltipStyle} formatter={(v: number) => `${v} min`} />
                        <Bar dataKey="tma" name="TMA (min)" radius={[0, 6, 6, 0]}>
                          {barTmaData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-12 text-center text-sm text-slate-500">Nenhum dado de TMA disponível</p>
                )}
              </div>
            </div>

            {/* Atendimentos por dia */}
            {dailyData.length > 0 && (
              <div className="mb-8 rounded-xl border border-white/[0.07] bg-[#161b22] p-4 sm:p-6" style={{ backdropFilter: 'blur(24px)' }}>
                <h3 className="mb-4 text-base sm:text-lg font-semibold text-slate-100">Atendimentos por Dia</h3>
                <div className={isMobile ? 'h-52' : 'h-64'}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyData} margin={isMobile ? { left: -15, right: 5 } : undefined}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="dia"
                        tick={{ fontSize: isMobile ? 9 : 11, fill: '#94a3b8' }}
                        stroke="#64748b"
                        tickFormatter={(v: string) => {
                          const [, m, d] = v.split('-');
                          return `${d}/${m}`;
                        }}
                        interval={isMobile ? 'preserveStartEnd' : 0}
                      />
                      <YAxis tick={{ fontSize: isMobile ? 10 : 12, fill: '#94a3b8' }} stroke="#64748b" width={isMobile ? 30 : 60} />
                      <Tooltip contentStyle={darkTooltipStyle} labelFormatter={(l: string) => {
                        const [y, m, d] = l.split('-');
                        return `${d}/${m}/${y}`;
                      }} />
                      <Legend wrapperStyle={{ color: '#94a3b8', fontSize: isMobile ? 11 : 14 }} />
                      <Line
                        type="monotone"
                        dataKey="atendimentos"
                        name="Atendimentos"
                        stroke="#8b5cf6"
                        strokeWidth={2.5}
                        dot={isMobile ? { r: 3, fill: '#8b5cf6', strokeWidth: 1, stroke: '#1e293b' } : { r: 5, fill: '#8b5cf6', strokeWidth: 2, stroke: '#1e293b' }}
                        activeDot={{ r: isMobile ? 5 : 7, fill: '#a78bfa', stroke: '#8b5cf6', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Ranking Table */}
            <div className="rounded-xl border border-white/[0.07] bg-[#161b22] overflow-hidden" style={{ backdropFilter: 'blur(24px)' }}>
              <div className="px-4 sm:px-6 py-4 border-b border-white/[0.07]">
                <h3 className="text-base sm:text-lg font-semibold text-slate-100">Ranking de Colaboradores</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.07]">
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">#</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">Colaborador</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">Atend.</th>
                      <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">TMA</th>
                      <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">Participação</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">Perf.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {collaborators.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                          Nenhum colaborador encontrado
                        </td>
                      </tr>
                    ) : (
                      collaborators.map((c, i) => {
                        const rank = i + 1;
                        const participation = totalServices > 0 ? ((c.services / totalServices) * 100).toFixed(1) : '0';
                        const badge = performanceBadge(c.avgTime);
                        const rankColors: Record<number, string> = {
                          1: 'bg-amber-500/20 text-amber-400',
                          2: 'bg-slate-400/20 text-slate-300',
                          3: 'bg-orange-500/20 text-orange-400',
                        };
                        const rankCls = rankColors[rank] ?? 'bg-slate-700/30 text-slate-500';
                        return (
                          <tr key={c.name} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-3 sm:px-4 py-3">
                              <span className={`inline-flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-[10px] sm:text-xs font-bold ${rankCls}`}>
                                {rank}
                              </span>
                            </td>
                            <td className="px-3 sm:px-4 py-3">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <span className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-xs font-bold text-purple-400">
                                  {c.initials}
                                </span>
                                <span className="text-xs sm:text-sm font-medium text-white">{c.name}</span>
                              </div>
                            </td>
                            <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-white">{formatNumber(c.services)}</td>
                            <td className="hidden sm:table-cell px-4 py-3 text-sm text-slate-300">
                              {c.avgTime !== null ? `${c.avgTime.toFixed(1)} min` : 'N/D'}
                            </td>
                            <td className="hidden md:table-cell px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-700">
                                  <div
                                    className="h-full rounded-full bg-purple-500 transition-all"
                                    style={{ width: `${participation}%` }}
                                  />
                                </div>
                                <span className="text-xs text-slate-400">{participation}%</span>
                              </div>
                            </td>
                            <td className="px-3 sm:px-4 py-3">
                              <span className={`inline-flex rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium ${badge.cls}`}>
                                {badge.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
