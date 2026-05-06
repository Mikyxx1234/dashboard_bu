import { useState, useEffect, useCallback } from 'react';
import { Target, ChevronDown, ChevronUp, TrendingUp, Award, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { env } from '../config';

interface MetaAtiva {
  Meta: string | null;
  Inter: number | null;
  Super: number | null;
  Inicio: string | null;
  fim: string | null;
}

function readHeaders() {
  return {
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  };
}

function diasRestantes(fim: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fimDate = new Date(fim + 'T00:00:00');
  return Math.max(0, Math.ceil((fimDate.getTime() - hoje.getTime()) / 86400000));
}

function getTier(leads: number, meta: MetaAtiva): { label: string; cor: string; icon: React.ReactNode } {
  const inter = meta.Inter ?? 0;
  const alvo = parseFloat(meta.Meta ?? '0');
  const sup = meta.Super ?? 0;
  if (leads >= sup) return { label: 'Super Meta', cor: 'text-emerald-400', icon: <Award className="h-3.5 w-3.5" /> };
  if (leads >= alvo) return { label: 'Meta', cor: 'text-blue-400', icon: <TrendingUp className="h-3.5 w-3.5" /> };
  if (leads >= inter) return { label: 'Inter', cor: 'text-amber-400', icon: <Zap className="h-3.5 w-3.5" /> };
  return { label: 'Abaixo', cor: 'text-red-400', icon: <Zap className="h-3.5 w-3.5" /> };
}

function getBarColor(pct: number): string {
  if (pct >= 100) return 'bg-emerald-500';
  if (pct >= 75) return 'bg-blue-500';
  if (pct >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

async function countLeads(consultor: string, inicio: string, fim: string): Promise<number> {
  const params =
    `?select=id` +
    `&consultor=eq.${encodeURIComponent(consultor)}` +
    `&created_at=gte.${inicio}T00:00:00` +
    `&created_at=lte.${fim}T23:59:59`;

  const [resSum, resAnh] = await Promise.all([
    fetch(`${env.SUPABASE_URL}/rest/v1/sum_leads_ganhos${params}`, { headers: readHeaders() }),
    fetch(`${env.SUPABASE_URL}/rest/v1/anh_leads_ganhos${params}`, { headers: readHeaders() }),
  ]);

  const [sum, anh] = await Promise.all([
    resSum.ok ? (resSum.json() as Promise<unknown[]>) : Promise.resolve([]),
    resAnh.ok ? (resAnh.json() as Promise<unknown[]>) : Promise.resolve([]),
  ]);

  return sum.length + anh.length;
}

export function MetaCountdown() {
  const { user, isAdmin } = useAuth();
  const [meta, setMeta] = useState<MetaAtiva | null>(null);
  const [leads, setLeads] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState(false);

  const carregar = useCallback(async () => {
    if (!user || isAdmin) return;
    setLoading(true);
    try {
      const hoje = new Date().toISOString().slice(0, 10);
      const res = await fetch(
        `${env.SUPABASE_URL}/rest/v1/Meta_ANH` +
          `?select=Meta,Inter,Super,Inicio,fim` +
          `&Inicio=lte.${hoje}&fim=gte.${hoje}` +
          `&order=id.desc&limit=1`,
        { headers: readHeaders() },
      );
      if (!res.ok) return;
      const rows: MetaAtiva[] = await res.json();
      if (!rows.length) return;

      const m = rows[0];
      setMeta(m);

      if (m.Inicio && m.fim) {
        const total = await countLeads(user, m.Inicio, m.fim);
        setLeads(total);
      }
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Não exibe para admin nem enquanto sem meta ativa
  if (isAdmin || (!loading && !meta)) return null;

  // Skeleton enquanto carrega
  if (loading) {
    return (
      <div className="border-b border-gray-800 bg-gray-900/60 py-3 pl-14 pr-4">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-pulse rounded-full bg-gray-700" />
          <div className="h-2.5 flex-1 animate-pulse rounded-full bg-gray-800" />
          <div className="h-3 w-24 animate-pulse rounded bg-gray-800" />
        </div>
      </div>
    );
  }

  if (!meta) return null;

  const alvo = parseFloat(meta.Meta ?? '0');
  const pct = alvo > 0 ? Math.min(100, Math.round((leads / alvo) * 100)) : 0;
  const dias = meta.fim ? diasRestantes(meta.fim) : 0;
  const tier = getTier(leads, meta);

  return (
    <div className="border-b border-gray-800 bg-gray-900/80">
      {/* Barra compacta — sempre visível. pl-14 evita sobreposição com o botão do menu (fixo, top-3 left-3) */}
      <button
        onClick={() => setExpandido((v) => !v)}
        className="flex w-full items-center gap-3 py-3 pl-14 pr-4 text-left transition hover:bg-gray-800/40"
      >
        <Target className="h-4 w-4 flex-shrink-0 text-blue-400" />

        {/* Barra de progresso */}
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <span className="hidden text-xs font-medium text-gray-400 sm:block whitespace-nowrap">
            Meta do período
          </span>
          <div className="flex-1 h-2.5 overflow-hidden rounded-full bg-gray-700">
            <div
              className={`h-full rounded-full transition-all duration-700 ${getBarColor(pct)}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={`text-xs font-bold whitespace-nowrap ${tier.cor}`}>
            {leads}/{Math.round(alvo)} · {pct}%
          </span>
        </div>

        {/* Countdown */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className={`hidden text-xs font-medium sm:block ${
              dias <= 5 ? 'text-red-400' : dias <= 15 ? 'text-amber-400' : 'text-gray-400'
            }`}
          >
            {dias === 0 ? 'Último dia' : `${dias}d restantes`}
          </span>
          {expandido ? (
            <ChevronUp className="h-3.5 w-3.5 text-gray-500" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
          )}
        </div>
      </button>

      {/* Painel expandido */}
      {expandido && (
        <div className="border-t border-gray-800/60 px-4 py-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Leads realizados */}
            <div className="rounded-lg bg-gray-800/50 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                Leads
              </p>
              <p className={`mt-0.5 text-xl font-bold ${tier.cor}`}>{leads}</p>
              <p className="text-[11px] text-gray-500">de {Math.round(alvo)} na meta</p>
            </div>

            {/* Percentual */}
            <div className="rounded-lg bg-gray-800/50 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                Progresso
              </p>
              <p className={`mt-0.5 text-xl font-bold ${tier.cor}`}>{pct}%</p>
              <div className="mt-1 flex items-center gap-1">
                {tier.icon}
                <span className={`text-[11px] font-semibold ${tier.cor}`}>{tier.label}</span>
              </div>
            </div>

            {/* Dias restantes */}
            <div className="rounded-lg bg-gray-800/50 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                Dias restantes
              </p>
              <p
                className={`mt-0.5 text-xl font-bold ${
                  dias <= 5 ? 'text-red-400' : dias <= 15 ? 'text-amber-400' : 'text-white'
                }`}
              >
                {dias}
              </p>
              <p className="text-[11px] text-gray-500">
                {meta.fim
                  ? `Encerra ${new Date(meta.fim + 'T00:00:00').toLocaleDateString('pt-BR')}`
                  : '—'}
              </p>
            </div>

            {/* Ritmo necessário */}
            <div className="rounded-lg bg-gray-800/50 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                Ritmo necessário
              </p>
              <p className="mt-0.5 text-xl font-bold text-white">
                {dias > 0 && alvo > leads
                  ? `${Math.ceil((alvo - leads) / dias)}/dia`
                  : pct >= 100
                  ? '—'
                  : '0/dia'}
              </p>
              <p className="text-[11px] text-gray-500">
                {alvo - leads > 0 ? `faltam ${Math.round(alvo - leads)} leads` : 'Meta atingida!'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
