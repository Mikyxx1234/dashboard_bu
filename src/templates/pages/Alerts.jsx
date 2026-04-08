import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, XCircle,
  ArrowRight, CheckCircle, Inbox,
} from 'lucide-react';
import { useTemplates } from '../context/TemplateContext';
import { formatDate, daysUntil } from '../utils/helpers';
import StatusBadge from '../components/StatusBadge';

const borderColors = {
  expired: 'border-l-red-500',
  expiring: 'border-l-amber-500',
};

export default function Alerts() {
  const navigate = useNavigate();
  const { getAlerts } = useTemplates();
  const alerts = getAlerts();

  const expired = alerts.filter((t) => t.computedStatus === 'expired');
  const expiring = alerts.filter((t) => t.computedStatus === 'expiring');

  const Section = ({ title, icon: Icon, items, color, emptyMsg }) => (
    <div className="card">
      <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Icon className={`w-5 h-5 ${color}`} />
        <h3 className="font-semibold text-white">{title}</h3>
        <span className="ml-auto text-sm text-slate-600">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="p-8 text-center">
          <CheckCircle className="w-8 h-8 text-emerald-500/30 mx-auto mb-2" />
          <p className="text-sm text-slate-600">{emptyMsg}</p>
        </div>
      ) : (
        <div>
          {items.map((template) => {
            const days = daysUntil(template.expiryDate);
            return (
              <div
                key={template.id}
                className={`px-5 py-4 flex items-center justify-between hover:bg-white/[0.03] transition border-l-4 ${borderColors[template.computedStatus] || ''}`}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => navigate(`/templates-hub/${template.id}`)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm text-slate-200 truncate">
                      {template.name}
                    </p>
                    <StatusBadge status={template.computedStatus} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>
                      Validade: {formatDate(template.expiryDate)}
                    </span>
                    {days < 0 && (
                      <span className="text-red-400 font-medium">
                        Vencido há {Math.abs(days)} dia{Math.abs(days) !== 1 ? 's' : ''}
                      </span>
                    )}
                    {days >= 0 && days <= 7 && (
                      <span className="text-amber-400 font-medium">
                        Vence em {days} dia{days !== 1 ? 's' : ''}
                      </span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      template.type === 'marketing' ? 'bg-purple-500/10 text-purple-400' : 'bg-cyan-500/10 text-cyan-400'
                    }`}>
                      {template.type === 'marketing' ? 'Marketing' : 'Utility'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <button
                    onClick={() => navigate(`/templates-hub/${template.id}/edit`)}
                    className="btn-primary text-xs py-1.5 px-3"
                  >
                    Editar
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Avisos e Pendências</h2>
        <p className="text-sm text-slate-500 mt-1">
          Templates que precisam de atenção — {alerts.length} pendência{alerts.length !== 1 ? 's' : ''}
        </p>
      </div>

      {alerts.length === 0 ? (
        <div className="card p-12 text-center">
          <Inbox className="w-12 h-12 text-emerald-500/20 mx-auto mb-3" />
          <p className="text-lg font-medium text-slate-300">Tudo em dia!</p>
          <p className="text-sm text-slate-600 mt-1">Nenhum template precisa de atenção no momento</p>
        </div>
      ) : (
        <div className="space-y-5">
          <Section title="Vencidos — Ação Urgente" icon={XCircle} items={expired} color="text-red-400" emptyMsg="Nenhum template vencido" />
          <Section title="Próximos do Vencimento" icon={AlertTriangle} items={expiring} color="text-amber-400" emptyMsg="Nenhum template próximo do vencimento" />
        </div>
      )}
    </div>
  );
}
