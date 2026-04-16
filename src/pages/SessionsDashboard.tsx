import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from 'recharts';
import { RefreshCw, Search, Loader2, Users, MousePointerClick, Smartphone, Monitor, Tablet, Globe } from 'lucide-react';
import { DateFilter } from '../components/DateFilter';
import { fetchSessions, type Session } from '../services/sessionsService';

const PIE_COLORS = ['#06b6d4', '#f59e0b', '#22c55e', '#ef4444', '#ec4899', '#f97316', '#8b5cf6', '#14b8a6', '#64748b', '#84cc16'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function getInitialDates() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export default function SessionsDashboard() {
  const initial = getInitialDates();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState(initial.start);
  const [endDate, setEndDate] = useState(initial.end);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchSessions(startDate, endDate);
      setSessions(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const total = sessions.length;
    const withUtm = sessions.filter(s => s.utm_source || s.utm_medium || s.utm_campaign).length;
    const withGclid = sessions.filter(s => s.gclid).length;
    const devices = { desktop: 0, mobile: 0, tablet: 0 };
    sessions.forEach(s => {
      const d = (s.device || '').toLowerCase();
      if (d === 'mobile') devices.mobile++;
      else if (d === 'tablet') devices.tablet++;
      else devices.desktop++;
    });
    return { total, withUtm, withGclid, devices };
  }, [sessions]);

  const dailyChart = useMemo(() => {
    const map: Record<string, number> = {};
    sessions.forEach(s => {
      const day = s.created_at?.split('T')[0];
      if (day) map[day] = (map[day] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        sessoes: count,
      }));
  }, [sessions]);

  const devicePie = useMemo(() => {
    const map: Record<string, number> = {};
    sessions.forEach(s => {
      const d = s.device || 'Desconhecido';
      map[d] = (map[d] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [sessions]);

  const sourcePie = useMemo(() => {
    const map: Record<string, number> = {};
    sessions.forEach(s => {
      const src = s.utm_source || '(direto)';
      map[src] = (map[src] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [sessions]);

  const mediumPie = useMemo(() => {
    const map: Record<string, number> = {};
    sessions.forEach(s => {
      const m = s.utm_medium || '(nenhum)';
      map[m] = (map[m] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [sessions]);

  const campaignBar = useMemo(() => {
    const map: Record<string, number> = {};
    sessions.forEach(s => {
      if (s.utm_campaign) {
        map[s.utm_campaign] = (map[s.utm_campaign] || 0) + 1;
      }
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name: name.length > 25 ? name.slice(0, 22) + '...' : name, value }));
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    if (!search) return sessions;
    const q = search.toLowerCase();
    return sessions.filter(s =>
      (s.utm_source || '').toLowerCase().includes(q) ||
      (s.utm_medium || '').toLowerCase().includes(q) ||
      (s.utm_campaign || '').toLowerCase().includes(q) ||
      (s.landing_page || '').toLowerCase().includes(q) ||
      (s.ip || '').includes(q) ||
      (s.gclid || '').toLowerCase().includes(q)
    );
  }, [sessions, search]);

  return (
    <div className="min-h-screen py-8 px-6" style={{ background: 'linear-gradient(135deg, #0c1222 0%, #111a2e 50%, #0f1628 100%)' }}>
      <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Sessões & UTMs</h1>
          <p className="text-sm text-gray-400">Rastreamento de visitantes do Google Ads</p>
        </div>
        <div className="flex items-center gap-4">
          <DateFilter startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} />
          <button onClick={load} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-400" /></div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard icon={Users} label="Total Sessões" value={stats.total} color="blue" />
            <KpiCard icon={MousePointerClick} label="Com UTM" value={stats.withUtm} color="green" />
            <KpiCard icon={Globe} label="Com GCLID" value={stats.withGclid} color="amber" />
            <KpiCard icon={Monitor} label="Desktop" value={stats.devices.desktop} color="purple" />
            <KpiCard icon={Smartphone} label="Mobile" value={stats.devices.mobile} color="cyan" />
          </div>

          {/* Sessions by day */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Sessões por Dia</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyChart}>
                <defs>
                  <linearGradient id="colorSessoes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 12 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b', fontWeight: 500 }} itemStyle={{ color: '#334155' }} labelStyle={{ color: '#0f172a', fontWeight: 600 }} />
                <Area type="monotone" dataKey="sessoes" stroke="#06b6d4" fill="url(#colorSessoes)" strokeWidth={2} name="Sessões" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Pie charts row */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <PieCard title="Dispositivos" data={devicePie} />
            <PieCard title="UTM Source" data={sourcePie} />
            <PieCard title="UTM Medium" data={mediumPie} />
          </div>

          {/* Campaign bar chart */}
          {campaignBar.length > 0 && (
            <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
              <h2 className="mb-4 text-lg font-semibold text-white">UTM Campaign (Top 10)</h2>
              <ResponsiveContainer width="100%" height={Math.max(300, campaignBar.length * 40)}>
                <BarChart data={campaignBar} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} width={180} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b', fontWeight: 500 }} itemStyle={{ color: '#334155' }} labelStyle={{ color: '#0f172a', fontWeight: 600 }} />
                  <Bar dataKey="value" name="Sessões" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Sessions table */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Sessões Recentes</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar por source, campaign, IP..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="rounded-lg border border-gray-700 bg-gray-800 pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-72"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="whitespace-nowrap px-3 py-3 font-medium">Data</th>
                    <th className="whitespace-nowrap px-3 py-3 font-medium">Device</th>
                    <th className="whitespace-nowrap px-3 py-3 font-medium">IP</th>
                    <th className="whitespace-nowrap px-3 py-3 font-medium">Source</th>
                    <th className="whitespace-nowrap px-3 py-3 font-medium">Medium</th>
                    <th className="whitespace-nowrap px-3 py-3 font-medium">Campaign</th>
                    <th className="whitespace-nowrap px-3 py-3 font-medium">GCLID</th>
                    <th className="whitespace-nowrap px-3 py-3 font-medium">Landing Page</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.slice(0, 100).map(s => (
                    <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors">
                      <td className="whitespace-nowrap px-3 py-2.5 text-gray-300">{formatDate(s.created_at)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <DeviceBadge device={s.device} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-gray-400 font-mono text-xs">{s.ip || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-cyan-400">{s.utm_source || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-amber-400">{s.utm_medium || '—'}</td>
                      <td className="max-w-[200px] truncate px-3 py-2.5 text-green-400" title={s.utm_campaign || ''}>{s.utm_campaign || '—'}</td>
                      <td className="max-w-[120px] truncate px-3 py-2.5 text-gray-500 font-mono text-xs" title={s.gclid || ''}>{s.gclid ? s.gclid.slice(0, 12) + '...' : '—'}</td>
                      <td className="max-w-[200px] truncate px-3 py-2.5 text-gray-500" title={s.landing_page || ''}>{s.landing_page || '—'}</td>
                    </tr>
                  ))}
                  {filteredSessions.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-500">Nenhuma sessão encontrada</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredSessions.length > 100 && (
              <p className="mt-3 text-xs text-gray-500">Exibindo 100 de {filteredSessions.length} sessões</p>
            )}
          </div>
        </>
      )}
      </div>
    </div>
  );
}

/* ---------- Sub-components ---------- */

const colorMap: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-400',
  green: 'bg-green-500/10 text-green-400',
  amber: 'bg-amber-500/10 text-amber-400',
  purple: 'bg-purple-500/10 text-purple-400',
  cyan: 'bg-cyan-500/10 text-cyan-400',
};

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-5">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2.5 ${colorMap[color] || colorMap.blue}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

function PieCard({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
      <h2 className="mb-2 text-lg font-semibold text-white">{title}</h2>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b', fontWeight: 500 }} itemStyle={{ color: '#334155' }} labelStyle={{ color: '#0f172a', fontWeight: 600 }} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function DeviceBadge({ device }: { device: string | null }) {
  const d = (device || '').toLowerCase();
  if (d === 'mobile') return <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-cyan-400"><Smartphone className="h-3 w-3" />Mobile</span>;
  if (d === 'tablet') return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400"><Tablet className="h-3 w-3" />Tablet</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-400"><Monitor className="h-3 w-3" />Desktop</span>;
}
