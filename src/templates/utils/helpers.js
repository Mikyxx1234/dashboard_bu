export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR');
}

export function daysUntil(dateStr) {
  if (!dateStr) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diff = target - today;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function computeStatus(template) {
  if (!template.expiryDate) return 'active';

  const daysToExpiry = daysUntil(template.expiryDate);
  if (daysToExpiry < 0) return 'expired';
  if (daysToExpiry <= 7) return 'expiring';
  return 'active';
}

export function getStatusConfig(status) {
  const configs = {
    active: {
      label: 'Ativo',
      color: 'bg-emerald-100 text-emerald-700',
      dotColor: 'bg-emerald-500',
      borderColor: 'border-l-emerald-500',
    },
    expiring: {
      label: 'Próximo do Vencimento',
      color: 'bg-amber-100 text-amber-700',
      dotColor: 'bg-amber-500',
      borderColor: 'border-l-amber-500',
    },
    expired: {
      label: 'Vencido',
      color: 'bg-red-100 text-red-700',
      dotColor: 'bg-red-500',
      borderColor: 'border-l-red-500',
    },
  };
  return configs[status] || configs.active;
}

export function getUrgencyLevel(template) {
  const status = computeStatus(template);
  if (status === 'expired') return 3;
  if (status === 'expiring') return 2;
  return 0;
}

export function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
