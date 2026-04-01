import { useState, useEffect, useCallback } from 'react';
import { Target, RefreshCw, AlertCircle, Users, TrendingUp, UserPlus, RotateCcw } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { DateFilter } from '../components/DateFilter';

interface DailyMetrics {
  bandeira: 'sumare' | 'anhanguera';
  total: string;
  novos: string;
  recadastro: string;
  dia_sp: string;
}

interface ConsultantData {
  consultor: string;
  status: 'GANHO' | 'PERDIDO';
  bandeira: 'sumare' | 'anhanguera';
  total: string;
}

type ApiData = DailyMetrics | ConsultantData;

const WEBHOOK_URL =
  'https://n8n-new-n8n.ca31ey.easypanel.host/webhook/contar_leads_anhanguera_e_sumare';

const COLORS = {
  anhanguera: '#2563eb',
  sumare: '#059669',
  novos: '#3b82f6',
  recadastro: '#10b981',
  ganho: '#22c55e',
  perdido: '#ef4444',
};

function isDailyMetrics(item: ApiData): item is DailyMetrics {
  return 'dia_sp' in item;
}

function isConsultantData(item: ApiData): item is ConsultantData {
  return 'consultor' in item;
}

function getDefaultDates() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

function formatNumber(value: number) {
  return value.toLocaleString('pt-BR');
}

function parseDate(dateStr: string): string {
  const cleaned = dateStr.replace(/"/g, '');
  const date = new Date(cleaned);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function CampanhasMeta() {
  const [data, setData] = useState<ApiData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(getDefaultDates().startDate);
  const [endDate, setEndDate] = useState(getDefaultDates().endDate);
  const [selectedBrand, setSelectedBrand] = useState<'all' | 'anhanguera' | 'sumare'>('all');

  const fetchData = useCallback(async (start: string, end: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: start, end_date: end }),
      });
      if (!response.ok) throw new Error('Falha ao carregar dados');
      const jsonData = await response.json();
      setData(jsonData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(startDate, endDate);
  }, []);

  const dailyMetrics = data.filter(isDailyMetrics);
  const consultantData = data.filter(isConsultantData);

  const filteredDailyMetrics =
    selectedBrand === 'all'
      ? dailyMetrics
      : dailyMetrics.filter((d) => d.bandeira === selectedBrand);

  const totals = {
    total: filteredDailyMetrics.reduce((sum, d) => sum + parseInt(d.total, 10), 0),
    novos: filteredDailyMetrics.reduce((sum, d) => sum + parseInt(d.novos, 10), 0),
    recadastro: filteredDailyMetrics.reduce((sum, d) => sum + parseInt(d.recadastro, 10), 0),
  };

  const filteredConsultantData =
    selectedBrand === 'all'
      ? consultantData
      : consultantData.filter((d) => d.bandeira === selectedBrand);

  const totalGanhos = filteredConsultantData
    .filter((d) => d.status === 'GANHO')
    .reduce((sum, d) => sum + parseInt(d.total, 10), 0);

  const totalPerdidos = filteredConsultantData
    .filter((d) => d.status === 'PERDIDO')
    .reduce((sum, d) => sum + parseInt(d.total, 10), 0);

  const conversionRate = totalGanhos + totalPerdidos > 0
    ? ((totalGanhos / (totalGanhos + totalPerdidos)) * 100).toFixed(1)
    : '0';

  const chartData = (() => {
    const dateMap = new Map<string, { date: string; anhanguera: number; sumare: number }>();

    dailyMetrics.forEach((item) => {
      const dateKey = parseDate(item.dia_sp);
      const existing = dateMap.get(dateKey) || { date: dateKey, anhanguera: 0, sumare: 0 };
      existing[item.bandeira] = parseInt(item.total, 10);
      dateMap.set(dateKey, existing);
    });

    return Array.from(dateMap.values()).sort((a, b) => {
      const [dayA, monthA] = a.date.split('/').map(Number);
      const [dayB, monthB] = b.date.split('/').map(Number);
      if (monthA !== monthB) return monthA - monthB;
      return dayA - dayB;
    });
  })();

  const typeChartData = [
    { name: 'Novos', value: totals.novos, color: COLORS.novos },
    { name: 'Recadastro', value: totals.recadastro, color: COLORS.recadastro },
  ];

  const statusChartData = [
    { name: 'Ganhos', value: totalGanhos, color: COLORS.ganho },
    { name: 'Perdidos', value: totalPerdidos, color: COLORS.perdido },
  ];

  const consultantPerformance = (() => {
    const map = new Map<string, { name: string; ganhos: number; perdidos: number }>();

    filteredConsultantData.forEach((item) => {
      const existing = map.get(item.consultor) || { name: item.consultor, ganhos: 0, perdidos: 0 };
      if (item.status === 'GANHO') {
        existing.ganhos += parseInt(item.total, 10);
      } else {
        existing.perdidos += parseInt(item.total, 10);
      }
      map.set(item.consultor, existing);
    });

    return Array.from(map.values())
      .sort((a, b) => b.ganhos - a.ganhos)
      .slice(0, 8);
  })();

  const darkTooltipStyle = {
    backgroundColor: '#1e293b',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
    color: '#e2e8f0',
  };

  return (
    <div style={{ background: 'linear-gradient(135deg, #0c1222 0%, #111a2e 50%, #0f1628 100%)', minHeight: '100vh' }}>
      <header style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(24px)' }} className="border-b border-white/[0.07]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-600 p-2">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Resultado Geral</h1>
                <p className="text-sm text-slate-400">Visao geral dos resultados de campanhas</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <DateFilter
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
              />

              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value as 'all' | 'anhanguera' | 'sumare')}
                className="rounded-lg border border-white/[0.08] bg-[#161b22] px-3 py-2 text-sm text-white [color-scheme:dark] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all" className="bg-[#161b22] text-white">Todas as bandeiras</option>
                <option value="anhanguera" className="bg-[#161b22] text-white">Anhanguera</option>
                <option value="sumare" className="bg-[#161b22] text-white">Sumare</option>
              </select>

              <button
                onClick={() => fetchData(startDate, endDate)}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
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
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {loading && data.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-slate-500" />
              <p className="mt-3 text-slate-500">Carregando dados...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-xl border border-white/[0.07] bg-[#161b22] p-5" style={{ backdropFilter: 'blur(24px)' }}>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-500/20 p-2">
                    <Users className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-400">Total Leads</p>
                    <p className="text-2xl font-bold text-white">{formatNumber(totals.total)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-[#161b22] p-5" style={{ backdropFilter: 'blur(24px)' }}>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-500/20 p-2">
                    <UserPlus className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-400">Leads Novos</p>
                    <p className="text-2xl font-bold text-white">{formatNumber(totals.novos)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-[#161b22] p-5" style={{ backdropFilter: 'blur(24px)' }}>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-500/20 p-2">
                    <RotateCcw className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-400">Recadastro</p>
                    <p className="text-2xl font-bold text-white">{formatNumber(totals.recadastro)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-[#161b22] p-5" style={{ backdropFilter: 'blur(24px)' }}>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-500/20 p-2">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-400">Conversoes</p>
                    <p className="text-2xl font-bold text-white">{formatNumber(totalGanhos)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-[#161b22] p-5" style={{ backdropFilter: 'blur(24px)' }}>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-cyan-500/20 p-2">
                    <Target className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-400">Taxa Conv.</p>
                    <p className="text-2xl font-bold text-white">{conversionRate}%</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-white/[0.07] bg-[#161b22] p-6" style={{ backdropFilter: 'blur(24px)' }}>
                <h3 className="mb-4 text-lg font-semibold text-slate-100">Leads por Dia</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorAnhanguera" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.anhanguera} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={COLORS.anhanguera} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorSumare" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.sumare} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={COLORS.sumare} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} stroke="#64748b" />
                      <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} stroke="#64748b" />
                      <Tooltip contentStyle={darkTooltipStyle} />
                      <Legend wrapperStyle={{ color: '#94a3b8' }} />
                      {(selectedBrand === 'all' || selectedBrand === 'anhanguera') && (
                        <Area
                          type="monotone"
                          dataKey="anhanguera"
                          name="Anhanguera"
                          stroke={COLORS.anhanguera}
                          strokeWidth={2}
                          fill="url(#colorAnhanguera)"
                        />
                      )}
                      {(selectedBrand === 'all' || selectedBrand === 'sumare') && (
                        <Area
                          type="monotone"
                          dataKey="sumare"
                          name="Sumare"
                          stroke={COLORS.sumare}
                          strokeWidth={2}
                          fill="url(#colorSumare)"
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-[#161b22] p-6" style={{ backdropFilter: 'blur(24px)' }}>
                <h3 className="mb-4 text-lg font-semibold text-slate-100">Performance por Consultor</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={consultantPerformance} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} stroke="#64748b" />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        stroke="#64748b"
                        width={80}
                      />
                      <Tooltip contentStyle={darkTooltipStyle} />
                      <Legend wrapperStyle={{ color: '#94a3b8' }} />
                      <Bar dataKey="ganhos" name="Ganhos" fill={COLORS.ganho} radius={[0, 4, 4, 0]} />
                      <Bar dataKey="perdidos" name="Perdidos" fill={COLORS.perdido} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-white/[0.07] bg-[#161b22] p-6" style={{ backdropFilter: 'blur(24px)' }}>
                <h3 className="mb-4 text-lg font-semibold text-slate-100">Tipo de Lead</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typeChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={{ stroke: '#64748b' }}
                      >
                        {typeChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={darkTooltipStyle}
                        formatter={(value: number) => formatNumber(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex justify-center gap-6">
                  {typeChartData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-slate-400">
                        {item.name}: {formatNumber(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-[#161b22] p-6" style={{ backdropFilter: 'blur(24px)' }}>
                <h3 className="mb-4 text-lg font-semibold text-slate-100">Status de Conversao</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={{ stroke: '#64748b' }}
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={darkTooltipStyle}
                        formatter={(value: number) => formatNumber(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex justify-center gap-6">
                  {statusChartData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-slate-400">
                        {item.name}: {formatNumber(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
