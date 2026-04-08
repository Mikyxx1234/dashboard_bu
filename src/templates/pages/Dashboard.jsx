import { useNavigate } from 'react-router-dom';
import {
  FileText, CheckCircle, AlertTriangle, XCircle,
  Megaphone, Wrench, ArrowRight, PlusCircle,
  Lightbulb, Clock,
} from 'lucide-react';
import { useTemplates } from '../context/TemplateContext';
import { useSuggestions } from '../context/SuggestionContext';
import { computeStatus, formatDate, daysUntil } from '../utils/helpers';
import StatsCard from '../components/StatsCard';
import StatusBadge from '../components/StatusBadge';

export default function Dashboard() {
  const navigate = useNavigate();
  const { getStats, getAlerts, templates } = useTemplates();
  const { getSuggestionStats, getPendingSuggestions } = useSuggestions();
  const stats = getStats();
  const alerts = getAlerts();
  const pendingSuggestions = getPendingSuggestions();

  const recentlyUpdated = [...templates]
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-sm text-slate-500 mt-1">
            Visão geral dos seus templates de mensagens
          </p>
        </div>
        <button onClick={() => navigate('/templates-hub/new')} className="btn-primary">
          <PlusCircle className="w-4 h-4" />
          Novo Template
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatsCard icon={FileText} label="Total" value={stats.total} bgColor="bg-white/[0.06]" color="text-slate-400" />
        <StatsCard icon={CheckCircle} label="Ativos" value={stats.active} bgColor="bg-emerald-500/10" color="text-emerald-400" />
        <StatsCard icon={AlertTriangle} label="Vencendo" value={stats.expiring} bgColor="bg-amber-500/10" color="text-amber-400" />
        <StatsCard icon={XCircle} label="Vencidos" value={stats.expired} bgColor="bg-red-500/10" color="text-red-400" />
        <StatsCard icon={Megaphone} label="Marketing" value={stats.marketing} bgColor="bg-purple-500/10" color="text-purple-400" />
        <StatsCard icon={Wrench} label="Utility" value={stats.utility} bgColor="bg-cyan-500/10" color="text-cyan-400" />
      </div>

      {pendingSuggestions.length > 0 && (
        <div className="card border-l-4 border-l-amber-500">
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold text-white">
                Sugestões Pendentes ({pendingSuggestions.length})
              </h3>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            </div>
            <button
              onClick={() => navigate('/templates-hub/suggestions')}
              className="text-sm text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 transition"
            >
              Revisar <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div>
            {pendingSuggestions.slice(0, 3).map((s) => (
              <div
                key={s.id}
                className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.03] cursor-pointer transition"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                onClick={() => navigate('/templates-hub/suggestions')}
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm text-slate-200 truncate">{s.name}</p>
                  <p className="text-xs text-slate-500">
                    Por {s.submittedBy} • {formatDate(s.submittedAt)}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400">
                  <Clock className="w-3 h-3" />
                  Aguardando
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="card">
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold text-white">
                Avisos e Pendências ({alerts.length})
              </h3>
            </div>
            <button
              onClick={() => navigate('/templates-hub/alerts')}
              className="text-sm text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 transition"
            >
              Ver todos <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div>
            {alerts.slice(0, 5).map((template) => {
              const days = daysUntil(template.expiryDate);
              const dotColors = { expired: 'bg-red-400', expiring: 'bg-amber-400' };
              return (
                <div
                  key={template.id}
                  className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.03] cursor-pointer transition"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                  onClick={() => navigate(`/templates-hub/${template.id}`)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${dotColors[template.computedStatus] || 'bg-slate-500'}`} />
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-slate-200 truncate">
                        {template.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Validade: {formatDate(template.expiryDate)}
                        {days < 0
                          ? ` (vencido há ${Math.abs(days)} dias)`
                          : days <= 7
                          ? ` (vence em ${days} dias)`
                          : ''}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={template.computedStatus} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="font-semibold text-white">Atualizados Recentemente</h3>
          <button
            onClick={() => navigate('/templates-hub/list')}
            className="text-sm text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 transition"
          >
            Ver todos <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div>
          {recentlyUpdated.map((t) => (
            <div
              key={t.id}
              className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.03] cursor-pointer transition"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
              onClick={() => navigate(`/templates-hub/${t.id}`)}
            >
              <div className="min-w-0">
                <p className="font-medium text-sm text-slate-200 truncate">{t.name}</p>
                <p className="text-xs text-slate-500">Editado em {formatDate(t.updatedAt)}</p>
              </div>
              <StatusBadge status={computeStatus(t)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
