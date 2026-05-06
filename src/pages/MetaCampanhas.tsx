import { useState, useEffect, useCallback } from 'react';
import {
  Megaphone, Users, TrendingUp, BarChart2, Search,
  RefreshCw, AlertCircle, FileText, Target,
} from 'lucide-react';
import { SkeletonStat, SkeletonTableRows } from '../components/Skeleton';

interface CampaignData {
  campaign_name: string;
  campaign_type: string;
  source: string;
  total: number;
  novos: number;
  ganhos: number;
  perdidos: number;
}

interface ApiResponse {
  utm_campaign: string;
  utm_content: string;
  utm_source: string;
  utm_medium: string;
  novos: string;
  ganhos: string;
  perdidos: string;
  total_funil: string;
}

const WEBHOOK_URL =
  'https://n8n-new-n8n.ca31ey.easypanel.host/webhook/meta_leads_anh';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function convRate(novos: number, ganhos: number) {
  if (novos === 0) return 0;
  return (ganhos / novos) * 100;
}

function convColor(pct: number) {
  if (pct >= 15) return 'bg-emerald-500';
  if (pct >= 8)  return 'bg-blue-500';
  if (pct >= 4)  return 'bg-amber-500';
  return 'bg-red-500';
}

function convTextColor(pct: number) {
  if (pct >= 15) return 'text-emerald-400';
  if (pct >= 8)  return 'text-blue-400';
  if (pct >= 4)  return 'text-amber-400';
  return 'text-red-400';
}

const selectClass =
  'rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30';

export function MetaCampanhas() {
  const [data, setData]               = useState<CampaignData[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [startDate, setStartDate]     = useState(todayStr);
  const [endDate, setEndDate]         = useState(todayStr);
  const [searchTerm, setSearchTerm]   = useState('');
  const [selectedType, setSelectedType]         = useState('Todos');
  const [selectedCampaign, setSelectedCampaign] = useState('Todas');

  const fetchData = useCallback(async (start: string, end: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: start, to: end }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ApiResponse[] = await res.json();

      const map = new Map<string, CampaignData>();
      if (Array.isArray(json)) {
        for (const item of json) {
          const name = item.utm_campaign || 'Sem nome';
          const novos    = parseInt(item.novos, 10)    || 0;
          const ganhos   = parseInt(item.ganhos, 10)   || 0;
          const perdidos = parseInt(item.perdidos, 10) || 0;
          const total    = parseInt(item.total_funil, 10) || 0;

          const ex = map.get(name);
          if (ex) {
            ex.total    += total;
            ex.novos    += novos;
            ex.ganhos   += ganhos;
            ex.perdidos += perdidos;
          } else {
            map.set(name, {
              campaign_name: name,
              campaign_type: item.utm_content || 'Não definido',
              source: `${item.utm_source || 'Meta'} · ${item.utm_medium || 'ads'}`,
              total, novos, ganhos, perdidos,
            });
          }
        }
      }
      setData([...map.values()].sort((a, b) => b.total - a.total));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(startDate, endDate); }, []); // eslint-disable-line

  const types     = ['Todos',  ...new Set(data.map((d) => d.campaign_type))];
  const campaigns = ['Todas', ...new Set(data.map((d) => d.campaign_name))];

  const filtered = data.filter((c) => {
    const matchSearch   = c.campaign_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType     = selectedType     === 'Todos'  || c.campaign_type   === selectedType;
    const matchCampaign = selectedCampaign === 'Todas'  || c.campaign_name   === selectedCampaign;
    return matchSearch && matchType && matchCampaign;
  });

  const totals = {
    funil:  filtered.reduce((s, d) => s + d.total,    0),
    novos:  filtered.reduce((s, d) => s + d.novos,    0),
    ganhos: filtered.reduce((s, d) => s + d.ganhos,   0),
    perdidos: filtered.reduce((s, d) => s + d.perdidos, 0),
  };
  const taxaGeral = convRate(totals.novos, totals.ganhos);

  return (
    <div className="min-h-screen bg-gray-950 p-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
            <Megaphone className="h-7 w-7 text-blue-400" />
            Meta - Campanhas
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Rastreamento de leads e conversões por campanha Meta Ads
          </p>
        </div>
        <button
          onClick={() => fetchData(startDate, endDate)}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* ── Erro ───────────────────────────────────────────── */}
      {error && (
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-red-800 bg-red-900/30 p-4 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── Stats ──────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading && data.length === 0 ? (
          <>
            <SkeletonStat /><SkeletonStat /><SkeletonStat /><SkeletonStat />
          </>
        ) : (
          <>
            <StatCard icon={<Users className="h-5 w-5 text-blue-400" />}   iconBg="bg-blue-500/10"    label="Total Funil"      value={totals.funil}   />
            <StatCard icon={<Target className="h-5 w-5 text-sky-400" />}   iconBg="bg-sky-500/10"     label="Leads Novos"      value={totals.novos}   />
            <StatCard icon={<TrendingUp className="h-5 w-5 text-emerald-400" />} iconBg="bg-emerald-500/10" label="Leads Ganhos" value={totals.ganhos}  />
            <StatCard
              icon={<BarChart2 className="h-5 w-5 text-amber-400" />}
              iconBg="bg-amber-500/10"
              label="Taxa de Conversão"
              value={`${taxaGeral.toFixed(1)}%`}
              valueColor={convTextColor(taxaGeral)}
            />
          </>
        )}
      </div>

      {/* ── Filtros ────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-500">Criativo</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className={selectClass}
            style={{ colorScheme: 'dark' }}
          >
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-500">Campanha</label>
          <select
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            className={`${selectClass} max-w-[220px]`}
            style={{ colorScheme: 'dark' }}
          >
            {campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-500">Data início</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={selectClass}
            style={{ colorScheme: 'dark' }}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-500">Data fim</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={selectClass}
            style={{ colorScheme: 'dark' }}
          />
        </div>

        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-medium text-gray-500">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Nome da campanha..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${selectClass} pl-9 w-full max-w-xs`}
            />
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="mb-3 flex items-center gap-4 text-xs text-gray-600">
        <span>
          <span className="font-semibold text-gray-400">{filtered.length}</span> campanha{filtered.length !== 1 ? 's' : ''} exibida{filtered.length !== 1 ? 's' : ''}
        </span>
        <span className={`font-semibold ${error ? 'text-red-400' : 'text-emerald-400'}`}>
          {error ? '● Erro' : '● Online'}
        </span>
      </div>

      {/* ── Tabela ─────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Campanha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Criativo</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Funil</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Novos</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Ganhos</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Perdidos</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Conversão</th>
              </tr>
            </thead>
            <tbody>
              {loading && data.length === 0 ? (
                <SkeletonTableRows rows={5} cols={7} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <FileText className="mx-auto mb-3 h-10 w-10 text-gray-700" />
                    <p className="text-gray-500">Nenhuma campanha encontrada</p>
                  </td>
                </tr>
              ) : (
                filtered.map((c, i) => {
                  const pct = convRate(c.novos, c.ganhos);
                  return (
                    <tr
                      key={i}
                      className="border-b border-gray-800/60 transition hover:bg-gray-800/40"
                    >
                      {/* Campanha */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                            <Megaphone className="h-4 w-4 text-blue-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate max-w-[200px] font-medium text-white">{c.campaign_name}</p>
                            <p className="text-xs text-gray-500">{c.source}</p>
                          </div>
                        </div>
                      </td>

                      {/* Criativo */}
                      <td className="px-4 py-3">
                        <span className="inline-block max-w-[120px] truncate rounded-full border border-gray-700 bg-gray-800 px-2.5 py-0.5 text-xs text-gray-300">
                          {c.campaign_type}
                        </span>
                      </td>

                      {/* Funil */}
                      <td className="px-4 py-3 text-center font-semibold text-white">{c.total}</td>

                      {/* Novos */}
                      <td className="px-4 py-3 text-center font-semibold text-sky-400">{c.novos}</td>

                      {/* Ganhos */}
                      <td className="px-4 py-3 text-center font-semibold text-emerald-400">{c.ganhos}</td>

                      {/* Perdidos */}
                      <td className="px-4 py-3 text-center font-semibold text-red-400">{c.perdidos}</td>

                      {/* Conversão */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-800">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${convColor(pct)}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className={`w-12 text-right text-sm font-semibold ${convTextColor(pct)}`}>
                            {pct > 0 ? `${pct.toFixed(1)}%` : '—'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componente: card de stat
// ---------------------------------------------------------------------------
function StatCard({
  icon, iconBg, label, value, valueColor = 'text-white',
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: number | string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${iconBg}`}>{icon}</div>
        <div>
          <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
          <p className="text-xs text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}
