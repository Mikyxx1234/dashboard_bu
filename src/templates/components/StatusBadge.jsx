import { getStatusConfig } from '../utils/helpers';

const darkConfigs = {
  active: {
    label: 'Ativo',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  expiring: {
    label: 'Próximo do Vencimento',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
  },
  expired: {
    label: 'Vencido',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    dot: 'bg-red-400',
  },
};

export default function StatusBadge({ status }) {
  const config = darkConfigs[status] || darkConfigs.active;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} style={{ boxShadow: `0 0 6px currentColor` }} />
      {config.label}
    </span>
  );
}
