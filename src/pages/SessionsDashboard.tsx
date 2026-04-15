import { useState, useEffect, useCallback, useMemo } from 'react';
import { Globe, RefreshCw, AlertCircle, Users, Monitor, Smartphone, Tablet, MousePointerClick, Link2, Search } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { DateFilter } from '../components/DateFilter';
import { fetchSessions, type Session } from '../services/sessionsService';

const COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  pink: '#ec4899',
  orange: '#f97316',
};

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#f97316', '#6366f1', '#14b8a6'];

const darkTooltipStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
  color: '#e2e8f0',
};

function getDefaultDates() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#161b22] p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-white">{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</p>
        </div>
        <div className="rounded-lg p-3" style={{ backgroundColor: `${color}20` }}>
          <Icon className="h-6 w-6" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#161b22] p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-300">{title}</h3>
      {children}
    </div>
  );
}

function groupBy<T>(arr: T[], keyFn: (item: T) => string | null): Record<string, number> {
  const map: Record<string, number> = {};
  for (const item of arr) {
    const key = keyFn(item) || '(direto)';
    map[key] = (map[key] || 0) + 1;
  }
  return map;
}

function topEntries(record: Record<string, number>, limit = 8): { name: string; value: number }[] {
  const sorted = Object.entries(record).sort(([, a], [, b]) => b - a);
  const top = sorted.slice(0, limit).map(([name, value]) => ({ name, value }));
  const othersTotal = sorted.slice(limit).reduce((sum, [, v]) => sum + v, 0);
  if (othersTotal > 0) top.push({ name: 'Outros', value: othersTotal });
  return top;
}

export default function SessionsDashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(getDefaultDates().startDate);
  const [endDate, setEndDate] = useState(getDefaultDates().endDate);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = useCallback(async (start: string, end: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSessions(start, end);
      setSessions(data);
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(startDate, endDate); }, []);

  const totalSessions = sessions.length;
  const withUtm = sessions.filter(s => s.utm_source).length;
  const withGclid = sessions.filter(s => s.gclid).length;
  const deviceCounts = useMemo(() => groupBy(sessions, s => s.device), [sessions]);
  const sourceCounts = useMemo(() => groupBy(sessions, s => s.utm_source), [sessions]);
  const mediumCounts = useMemo(() => groupBy(sessions, s => s.utm_medium), [sessions]);
  const campaignCounts = useMemo(() => groupBy(sessions, s => s.utm_campaign), [sessions]);

  const sourceData = useMemo(() => topEntries(sourceCounts), [sourceCounts]);
  const mediumData = useMemo(() => topEntries(mediumCounts), [mediumCounts]);
  const campaignData = useMemo(() => topEntries(campaignCounts, 10), [campaignCounts]);

  const deviceData = useMemo(() => {
    return Object.entries(deviceCounts).map(([name, value]) => ({
      name: name === 'mobile' ? 'Mobile' : name === 'tablet' ? 'Tablet' : name === 'desktop' ? 'Desktop' : name,
      value,
    }));
  }, [deviceCounts]);

  const timelineData = useMemo(() => {
    const map = new Map<string, number>();
    sessions.forEach(s => {
      const day = new Date(s.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      map.set(day, (map.get(day) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => {
        const [dA, mA] = a.date.split('/').map(Number);
        const [dB, mB] = b.date.split('/').map(Number);
        return mA !== mB ? mA - mB : dA - dB;
      });
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    if (!searchTerm) return sessions;
    const term = searchTerm.toLowerCase();
    return sessions.filter(s =>
      (s.utm_source || '').toLowerCase().includes(term) ||
      (s.utm_campaign || '').toLowerCase().includes(term) ||
      (s.utm_medium || '').toLowerCase().includes(term) ||
      (s.landing_page || '').toLowerCase().includes(term) ||
      (s.gclid || '').toLowerCase().includes(term) ||
      (s.ip || '').toLowerCase().includes(term)
    );
  }, [sessions, searchTerm]);

  return (
    <div style={{ background: 'linear-gradient(135deg, #0c1222 0%, #111a2e 50%, #0f1628 100%)', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(24px)' }} className="border-b border-white/[0.07]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-600 p-2">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Sessões & UTMs</h1>
                <p className="text-sm text-slate-400">Rastreamento de visitantes e campanhas Google</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <DateFilter
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
              />
              <button
                onClick={() => loadData(startDate, endDate)}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Error */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard icon={Users} label="Total de Sessões" value={totalSessions} color={COLORS.primary} />
              <KpiCard icon={MousePointerClick} label="Com UTM" value={withUtm} color={COLORS.success} />
              <KpiCard icon={Link2} label="Com GCLID (Google Ads)" value={withGclid} color={COLORS.warning} />
              <KpiCard
                icon={Monitor}
                label="Desktop / Mobile"
                value={`${deviceCounts['desktop'] || 0} / ${deviceCounts['mobile'] || 0}`}
                color={COLORS.secondary}
              />
            </div>

            {/* Charts Row 1: Timeline + Devices */}
            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <ChartCard title="Sessões por Dia">
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={timelineData}>
                      <defs>
                        <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <Tooltip contentStyle={darkTooltipStyle} />
                      <Area type="monotone" dataKey="total" name="Sessões" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorSessions)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
              <ChartCard title="Dispositivos">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={deviceData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {deviceData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={darkTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Charts Row 2: Source + Medium */}
            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartCard title="UTM Source (Origem)">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={sourceData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {sourceData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={darkTooltipStyle} />
                    <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="UTM Medium">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={mediumData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {mediumData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={darkTooltipStyle} />
                    <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Chart Row 3: Campaigns Bar */}
            <div className="mb-6">
              <ChartCard title="UTM Campaign (Top 10)">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={campaignData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={160} />
                    <Tooltip contentStyle={darkTooltipStyle} />
                    <Bar dataKey="value" name="Sessões" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Sessions Table */}
            <div className="rounded-xl border border-white/[0.08] bg-[#161b22] p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-semibold text-slate-300">Sessões Recentes ({filteredSessions.length})</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar por source, campaign, IP..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="rounded-lg border border-white/[0.08] bg-[#0d1117] py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-xs uppercase text-slate-500">
                      <th className="px-3 py-3">Data</th>
                      <th className="px-3 py-3">Dispositivo</th>
                      <th className="px-3 py-3">Source</th>
                      <th className="px-3 py-3">Medium</th>
                      <th className="px-3 py-3">Campaign</th>
                      <th className="px-3 py-3">GCLID</th>
                      <th className="px-3 py-3">Página</th>
                      <th className="px-3 py-3">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.slice(0, 100).map(s => (
                      <tr key={s.id} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]">
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-300">
                          {new Date(s.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            {s.device === 'mobile' ? <Smartphone className="h-3.5 w-3.5" /> : s.device === 'tablet' ? <Tablet className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />}
                            {s.device || '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          {s.utm_source ? (
                            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">{s.utm_source}</span>
                          ) : <span className="text-slate-600">-</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          {s.utm_medium ? (
                            <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-400">{s.utm_medium}</span>
                          ) : <span className="text-slate-600">-</span>}
                        </td>
                        <td className="max-w-[200px] truncate px-3 py-2.5 text-slate-400" title={s.utm_campaign || ''}>
                          {s.utm_campaign || <span className="text-slate-600">-</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          {s.gclid ? (
                            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400" title={s.gclid}>Sim</span>
                          ) : <span className="text-slate-600">-</span>}
                        </td>
                        <td className="max-w-[180px] truncate px-3 py-2.5 text-slate-500" title={s.first_page || ''}>
                          {s.first_page || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{s.ip || '-'}</td>
                      </tr>
                    ))}
                    {filteredSessions.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500">Nenhuma sessão encontrada</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
