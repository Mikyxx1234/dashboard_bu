import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, BarChart3, AlertCircle } from 'lucide-react';
import { DateFilter } from '../components/DateFilter';
import { BrandSection } from '../components/BrandSection';
import {
  ApiData,
  DailyMetrics,
  ConsultantPerformance,
  AggregatedConsultant,
  BrandMetrics,
  isDailyMetrics,
  isConsultantPerformance,
} from '../types/leads';

const WEBHOOK_URL =
  'https://n8n-new-n8n.ca31ey.easypanel.host/webhook/contar_leads_anhanguera_e_sumare';

function getDefaultDates() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

export function LeadsDashboard() {
  const [data, setData] = useState<ApiData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(getDefaultDates().startDate);
  const [endDate, setEndDate] = useState(getDefaultDates().endDate);

  const fetchData = useCallback(async (start: string, end: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_date: start,
          end_date: end,
        }),
      });
      if (!response.ok) {
        throw new Error('Falha ao carregar dados');
      }
      const jsonData = await response.json();
      setData(jsonData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(startDate, endDate);
  }, []);

  const dailyMetrics = data.filter(isDailyMetrics) as DailyMetrics[];
  const consultantData = data.filter(isConsultantPerformance) as ConsultantPerformance[];

  const getBrandMetrics = (brand: 'sumare' | 'anhanguera'): BrandMetrics => {
    const brandData = dailyMetrics.filter((d) => d.bandeira === brand);
    const brandConsultants = consultantData.filter((d) => d.bandeira === brand && d.status === 'GANHO');
    const totalGanhos = brandConsultants.reduce((sum, d) => sum + parseInt(d.total, 10), 0);
    return {
      total: brandData.reduce((sum, d) => sum + parseInt(d.total, 10), 0),
      novos: brandData.reduce((sum, d) => sum + parseInt(d.novos, 10), 0),
      recadastro: brandData.reduce((sum, d) => sum + parseInt(d.recadastro, 10), 0),
      totalGanhos,
    };
  };

  const getConsultantsByBrand = (brand: 'sumare' | 'anhanguera'): AggregatedConsultant[] => {
    const brandConsultants = consultantData.filter((d) => d.bandeira === brand);
    const consultantMap = new Map<string, { ganhos: number; perdidos: number }>();

    brandConsultants.forEach((item) => {
      const current = consultantMap.get(item.consultor) || { ganhos: 0, perdidos: 0 };
      const leadsCount = parseInt(item.total, 10) || 0;

      if (item.status === 'GANHO') {
        current.ganhos += leadsCount;
      } else {
        current.perdidos += leadsCount;
      }

      consultantMap.set(item.consultor, current);
    });

    return Array.from(consultantMap.entries()).map(([name, stats]) => ({
      name,
      ganhos: stats.ganhos,
      perdidos: stats.perdidos,
      bandeira: brand,
    }));
  };

  return (
    <>
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gray-900 p-2">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Dashboard de Leads</h1>
                <p className="text-sm text-gray-500">Anhanguera e Sumare</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <DateFilter
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
              />

              <button
                onClick={() => fetchData(startDate, endDate)}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {loading && data.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-gray-400" />
              <p className="mt-3 text-gray-500">Carregando dados...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <BrandSection
              brand="anhanguera"
              metrics={getBrandMetrics('anhanguera')}
              consultants={getConsultantsByBrand('anhanguera')}
            />

            <BrandSection
              brand="sumare"
              metrics={getBrandMetrics('sumare')}
              consultants={getConsultantsByBrand('sumare')}
            />
          </div>
        )}
      </main>
    </>
  );
}
