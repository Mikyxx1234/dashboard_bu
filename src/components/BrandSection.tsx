import { Users, UserPlus, RefreshCcw, Trophy } from 'lucide-react';
import { StatsCard } from './StatsCard';
import { ConsultantCard } from './ConsultantCard';
import { AggregatedConsultant, BrandMetrics } from '../types/leads';

interface BrandSectionProps {
  brand: 'sumare' | 'anhanguera';
  metrics: BrandMetrics;
  consultants: AggregatedConsultant[];
}

const brandConfig = {
  sumare: {
    name: 'Sumare',
    bgColor: 'bg-teal-600',
    textColor: 'text-teal-600',
    borderColor: 'border-teal-200',
    lightBg: 'bg-teal-50',
  },
  anhanguera: {
    name: 'Anhanguera',
    bgColor: 'bg-blue-600',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    lightBg: 'bg-blue-50',
  },
};

export function BrandSection({ brand, metrics, consultants }: BrandSectionProps) {
  const config = brandConfig[brand];
  const sortedConsultants = [...consultants].sort((a, b) => b.ganhos - a.ganhos);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className={`h-3 w-3 rounded-full ${config.bgColor}`} />
        <h2 className={`text-xl font-bold ${config.textColor}`}>{config.name}</h2>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total de Leads"
          value={metrics.total}
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="Leads Novos"
          value={metrics.novos}
          icon={UserPlus}
          color="green"
        />
        <StatsCard
          title="Recadastro"
          value={metrics.recadastro}
          icon={RefreshCcw}
          color="orange"
        />
        <StatsCard
          title="Total Ganhos"
          value={metrics.totalGanhos}
          icon={Trophy}
          color="emerald"
        />
      </div>

      {sortedConsultants.length > 0 && (
        <>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Performance por Consultor
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedConsultants.map((consultant) => (
              <ConsultantCard key={consultant.name} consultant={consultant} />
            ))}
          </div>
        </>
      )}

      {sortedConsultants.length === 0 && (
        <p className="text-center text-gray-400">
          Nenhum dado de consultor para o periodo selecionado
        </p>
      )}
    </div>
  );
}
