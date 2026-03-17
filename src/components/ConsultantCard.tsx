import { TrendingUp, TrendingDown } from 'lucide-react';
import { AggregatedConsultant } from '../types/leads';

interface ConsultantCardProps {
  consultant: AggregatedConsultant;
}

export function ConsultantCard({ consultant }: ConsultantCardProps) {
  const total = consultant.ganhos + consultant.perdidos;
  const winRate = total > 0 ? ((consultant.ganhos / total) * 100).toFixed(0) : 0;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
          {consultant.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 className="font-semibold text-gray-800">{consultant.name}</h3>
          <p className="text-xs text-gray-500">Taxa: {winRate}%</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          <div>
            <p className="text-xs text-emerald-600">Ganhos</p>
            <p className="text-lg font-bold text-emerald-700">{consultant.ganhos}</p>
          </div>
        </div>

        <div className="flex flex-1 items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
          <TrendingDown className="h-4 w-4 text-red-500" />
          <div>
            <p className="text-xs text-red-500">Perdidos</p>
            <p className="text-lg font-bold text-red-600">{consultant.perdidos}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
