import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  AlertTriangle,
  FileText,
  LogOut,
  LogIn,
  RefreshCw,
  GraduationCap,
  AlertCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { env } from '../config';

/* ── Supabase helpers ── */

function supaHeaders() {
  return {
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  };
}

async function supaGet<T>(view: string): Promise<T[]> {
  const url = `${env.SUPABASE_URL}/rest/v1/${encodeURIComponent(view)}?select=*`;
  const res = await fetch(url, { headers: supaHeaders() });
  if (!res.ok) return [];
  return res.json();
}

/* ── Types ── */

interface KpiRow {
  alunos_ativos: number;
  inadimplentes: number;
  boletos_aberto: number;
  evasao: number;
  entrada_alunos: number;
}

interface TimelineRow {
  periodo: string;
  entrada: number;
  evasao: number;
}

interface StatusRow {
  status: string;
  total: number;
}

/* ── Constants ── */

const VIEWS = {
  kpis: 'vw_academico_kpis',
  timeline: 'vw_academico_timeline',
  statusAlunos: 'vw_academico_status_alunos',
  statusFinanceiro: 'vw_academico_status_financeiro',
};

const STATUS_ALUNOS_COLORS: Record<string, string> = {
  Ativos: '#3b82f6',
  Trancados: '#f59e0b',
  Formados: '#22c55e',
  Evadidos: '#ef4444',
  Transferidos: '#8b5cf6',
};

const STATUS_FINANCEIRO_COLORS: Record<string, string> = {
  'Em dia': '#22c55e',
  Vencidos: '#ef4444',
  'A vencer': '#f59e0b',
  Negociados: '#3b82f6',
};

const darkTooltipStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
  color: '#e2e8f0',
};

function formatNumber(value: number) {
  return value.toLocaleString('pt-BR');
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

export default function AcademicoDashboardPage() {
  const [kpis, setKpis] = useState<KpiRow | null>(null);
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [statusAlunos, setStatusAlunos] = useState<StatusRow[]>([]);
  const [statusFinanceiro, setStatusFinanceiro] = useState<StatusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpiRows, tlRows, saRows, sfRows] = await Promise.all([
        supaGet<KpiRow>(VIEWS.kpis),
        supaGet<TimelineRow>(VIEWS.timeline),
        supaGet<StatusRow>(VIEWS.statusAlunos),
        supaGet<StatusRow>(VIEWS.statusFinanceiro),
      ]);
      setKpis(kpiRows[0] ?? null);
      setTimeline(tlRows);
      setStatusAlunos(saRows);
      setStatusFinanceiro(sfRows);
    } catch {
      setError('Erro ao carregar dados do dashboard acadêmico');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const kpiCards = [
    { label: 'Alunos Ativos', value: kpis?.alunos_ativos, icon: Users, bg: 'bg-blue-500/20', text: 'text-blue-400' },
    { label: 'Inadimplentes', value: kpis?.inadimplentes, icon: AlertTriangle, bg: 'bg-red-500/20', text: 'text-red-400' },
    { label: 'Boletos em Aberto', value: kpis?.boletos_aberto, icon: FileText, bg: 'bg-amber-500/20', text: 'text-amber-400' },
    { label: 'Evasão de Alunos', value: kpis?.evasao, icon: LogOut, bg: 'bg-red-500/20', text: 'text-red-400' },
    { label: 'Entrada de Alunos', value: kpis?.entrada_alunos, icon: LogIn, bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  ];

  const pieAlunos = statusAlunos.map((r) => ({
    name: r.status,
    value: r.total,
    color: STATUS_ALUNOS_COLORS[r.status] ?? '#64748b',
  }));

  const pieFinanceiro = statusFinanceiro.map((r) => ({
    name: r.status,
    value: r.total,
    color: STATUS_FINANCEIRO_COLORS[r.status] ?? '#64748b',
  }));

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
                <h1 className="text-xl font-bold text-white">Dashboard Acadêmico</h1>
                <p className="text-sm text-slate-400">Visão geral dos indicadores acadêmicos</p>
              </div>
            </div>

            <button
              onClick={fetchAll}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Error */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading */}
        {loading && !kpis ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-slate-500" />
              <p className="mt-3 text-slate-500">Carregando dados...</p>
            </div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {kpiCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl border border-white/[0.07] bg-[#161b22] p-5"
                  style={{ backdropFilter: 'blur(24px)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${card.bg}`}>
                      <card.icon className={`h-5 w-5 ${card.text}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-400">{card.label}</p>
                      <p className="text-2xl font-bold text-white">
                        {card.value != null ? formatNumber(card.value) : '--'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty state when no data from views */}
            {!kpis && !loading && (
              <div className="mb-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
                <AlertTriangle className="mx-auto h-8 w-8 text-amber-400" />
                <p className="mt-3 text-sm text-amber-300">
                  As views do Supabase ainda não foram criadas. Os dados serão exibidos automaticamente quando as views
                  <code className="mx-1 rounded bg-white/10 px-1.5 py-0.5 text-xs">
                    {Object.values(VIEWS).join(', ')}
                  </code>
                  estiverem disponíveis.
                </p>
              </div>
            )}

            {/* Timeline Chart */}
            <div className="mb-8">
              <div
                className="rounded-xl border border-white/[0.07] bg-[#161b22] p-6"
                style={{ backdropFilter: 'blur(24px)' }}
              >
                <h3 className="mb-4 text-lg font-semibold text-slate-100">Entrada vs Evasão de Alunos</h3>
                {timeline.length > 0 ? (
                  <div className={isMobile ? 'h-56' : 'h-72'}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timeline} margin={isMobile ? { left: -15, right: 5 } : undefined}>
                        <defs>
                          <linearGradient id="gradEntrada" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradEvasao" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="periodo" tick={{ fontSize: isMobile ? 10 : 12, fill: '#94a3b8' }} stroke="#64748b" />
                        <YAxis tick={{ fontSize: isMobile ? 10 : 12, fill: '#94a3b8' }} stroke="#64748b" width={isMobile ? 30 : 60} />
                        <Tooltip contentStyle={darkTooltipStyle} />
                        <Legend wrapperStyle={{ color: '#94a3b8', fontSize: isMobile ? 11 : 14 }} />
                        <Area
                          type="monotone"
                          dataKey="entrada"
                          name="Entrada"
                          stroke="#22c55e"
                          strokeWidth={2}
                          fill="url(#gradEntrada)"
                        />
                        <Area
                          type="monotone"
                          dataKey="evasao"
                          name="Evasão"
                          stroke="#ef4444"
                          strokeWidth={2}
                          fill="url(#gradEvasao)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-12 text-center text-sm text-slate-500">Nenhum dado de timeline disponível</p>
                )}
              </div>
            </div>

            {/* Pie Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Status dos Alunos */}
              <div
                className="rounded-xl border border-white/[0.07] bg-[#161b22] p-6"
                style={{ backdropFilter: 'blur(24px)' }}
              >
                <h3 className="mb-4 text-lg font-semibold text-slate-100">Distribuição por Status</h3>
                {pieAlunos.length > 0 ? (
                  <>
                    <div className={isMobile ? 'h-52' : 'h-64'}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieAlunos}
                            cx="50%"
                            cy="50%"
                            innerRadius={isMobile ? 40 : 60}
                            outerRadius={isMobile ? 65 : 90}
                            paddingAngle={4}
                            dataKey="value"
                            label={isMobile ? false : ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={isMobile ? false : { stroke: '#64748b' }}
                          >
                            {pieAlunos.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={darkTooltipStyle} formatter={(v: number) => formatNumber(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
                      {pieAlunos.map((item) => (
                        <div key={item.name} className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-xs sm:text-sm text-slate-400">
                            {item.name}: {formatNumber(item.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="py-12 text-center text-sm text-slate-500">Nenhum dado de status disponível</p>
                )}
              </div>

              {/* Status Financeiro */}
              <div
                className="rounded-xl border border-white/[0.07] bg-[#161b22] p-6"
                style={{ backdropFilter: 'blur(24px)' }}
              >
                <h3 className="mb-4 text-lg font-semibold text-slate-100">Situação Financeira</h3>
                {pieFinanceiro.length > 0 ? (
                  <>
                    <div className={isMobile ? 'h-52' : 'h-64'}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieFinanceiro}
                            cx="50%"
                            cy="50%"
                            innerRadius={isMobile ? 40 : 60}
                            outerRadius={isMobile ? 65 : 90}
                            paddingAngle={4}
                            dataKey="value"
                            label={isMobile ? false : ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={isMobile ? false : { stroke: '#64748b' }}
                          >
                            {pieFinanceiro.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={darkTooltipStyle} formatter={(v: number) => formatNumber(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
                      {pieFinanceiro.map((item) => (
                        <div key={item.name} className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-xs sm:text-sm text-slate-400">
                            {item.name}: {formatNumber(item.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="py-12 text-center text-sm text-slate-500">Nenhum dado financeiro disponível</p>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
