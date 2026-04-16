import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertTriangle, Clock, Users, Building2, ExternalLink } from 'lucide-react';
import { getLeadsParados, LeadParado } from '../services/leadsParadosService';

function formatHoras(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}min`;
  const horas = Math.floor(h);
  const min = Math.round((h - horas) * 60);
  return min > 0 ? `${horas}h ${min}min` : `${horas}h`;
}

function formatDate(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getBadgeColor(horas: number): string {
  if (horas >= 24) return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (horas >= 6) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  if (horas >= 3) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
}

export default function LeadsParadosPage() {
  const [leads, setLeads] = useState<LeadParado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'anhanguera' | 'sumare'>('todos');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getLeadsParados();
      setLeads(data);
      setLastUpdate(new Date());
    } catch (err: any) {
      setError(err?.message || 'Erro ao buscar leads parados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filtered = leads.filter((l) => {
    if (filtro === 'anhanguera') return l.pipeline.includes('Anhanguera');
    if (filtro === 'sumare') return l.pipeline.includes('Sumaré');
    return true;
  });

  const totalAnhanguera = leads.filter((l) => l.pipeline.includes('Anhanguera')).length;
  const totalSumare = leads.filter((l) => l.pipeline.includes('Sumaré')).length;
  const criticos = leads.filter((l) => l.horas_parado >= 24).length;

  const responsavelMap = new Map<string, number>();
  for (const l of leads) {
    responsavelMap.set(l.responsavel_nome, (responsavelMap.get(l.responsavel_nome) || 0) + 1);
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <AlertTriangle className="h-7 w-7 text-amber-400" />
            Leads Parados
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Leads sem atualização há mais de 1 hora nos pipelines de atendimento
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-gray-500">
              Atualizado: {formatDate(lastUpdate)}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{leads.length}</p>
              <p className="text-xs text-gray-400">Total Parados</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Building2 className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalAnhanguera}</p>
              <p className="text-xs text-gray-400">Anhanguera</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/10 p-2">
              <Building2 className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalSumare}</p>
              <p className="text-xs text-gray-400">Sumaré</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-500/10 p-2">
              <Clock className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{criticos}</p>
              <p className="text-xs text-gray-400">Críticos (+24h)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        {(['todos', 'anhanguera', 'sumare'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              filtro === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {f === 'todos' ? 'Todos' : f === 'anhanguera' ? 'Anhanguera' : 'Sumaré'}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-900/30 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && leads.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-400" />
          <p className="mt-4 text-sm text-gray-400">Buscando leads parados...</p>
        </div>
      )}

      {/* Table */}
      {!loading && filtered.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Users className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">Nenhum lead parado encontrado</p>
          <p className="text-sm">Todos os leads estão sendo atendidos!</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/80">
                  <th className="px-4 py-3 text-left font-semibold text-gray-300">Lead</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-300">Contato</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-300">Responsável</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-300">Pipeline</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-300">Última Atualização</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-300">Tempo Parado</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-300">Link</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-gray-800/50 transition hover:bg-gray-800/40"
                  >
                    <td className="px-4 py-3 font-medium text-white">{lead.nome}</td>
                    <td className="px-4 py-3 text-gray-300">{lead.contato_nome}</td>
                    <td className="px-4 py-3 text-gray-300">{lead.responsavel_nome}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          lead.pipeline.includes('Anhanguera')
                            ? 'border-orange-500/30 bg-orange-500/10 text-orange-400'
                            : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400'
                        }`}
                      >
                        {lead.pipeline}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{formatDate(lead.updated_at)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold ${getBadgeColor(lead.horas_parado)}`}
                      >
                        {formatHoras(lead.horas_parado)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <a
                        href={`https://academicosoead.kommo.com/leads/detail/${lead.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-700 hover:text-blue-400"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resumo por responsável */}
      {leads.length > 0 && (
        <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="mb-4 text-lg font-semibold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-400" />
            Resumo por Responsável
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[...responsavelMap.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([nome, count]) => (
                <div
                  key={nome}
                  className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-800/50 px-4 py-3"
                >
                  <span className="truncate text-sm text-gray-300">{nome}</span>
                  <span className="ml-2 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-amber-500/20 px-2 text-xs font-bold text-amber-400">
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
