import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'orange' | 'emerald';
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600 border-blue-100',
  green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  orange: 'bg-amber-50 text-amber-600 border-amber-100',
  emerald: 'bg-teal-50 text-teal-600 border-teal-100',
};

const iconBgClasses = {
  blue: 'bg-blue-100',
  green: 'bg-emerald-100',
  orange: 'bg-amber-100',
  emerald: 'bg-teal-100',
};

export function StatsCard({ title, value, icon: Icon, color }: StatsCardProps) {
  return (
    <div className={`rounded-xl border p-5 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="mt-1 text-3xl font-bold">{value.toLocaleString('pt-BR')}</p>
        </div>
        <div className={`rounded-lg p-3 ${iconBgClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
