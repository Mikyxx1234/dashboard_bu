import { useState, useEffect, useCallback } from 'react';
import { Users, TrendingUp, Search, RefreshCw, FileText } from 'lucide-react';

interface CampaignData {
  campaign_name: string;
  campaign_type: string;
  source: string;
  total: number;
  novos: number;
  ganhos: number;
  perdidos: number;
  conversion_rate: number;
}

interface ApiResponse {
  dia_brasilia: string;
  utm_campaign: string;
  utm_content: string;
  utm_source: string;
  utm_medium: string;
  novos: string;
  ganhos: string;
  perdidos: string;
  saldo: string;
  conv_ganho_sobre_novo_pct: string | null;
  perda_sobre_novo_pct: string | null;
  winrate_pct: string | null;
  total_funil: string;
  total_registros: string;
  total_leads_unicos_por_status: string;
}

const WEBHOOK_URL =
  'https://n8n-new-n8n.ca31ey.easypanel.host/webhook/meta_leads_anh';

function getDefaultDates() {
  const today = new Date();
  return {
    startDate: today.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0],
  };
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function MetaCampanhas() {
  const [data, setData] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(getDefaultDates().startDate);
  const [endDate, setEndDate] = useState(getDefaultDates().endDate);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('Todos os Tipos');
  const [selectedCampaign, setSelectedCampaign] = useState('Todas as Campanhas');

  const fetchData = useCallback(async (start: string, end: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: start, to: end }),
      });
      if (!response.ok) throw new Error('Falha ao carregar dados');
      const jsonData: ApiResponse[] = await response.json();

      const campaignMap = new Map<string, CampaignData>();

      if (Array.isArray(jsonData)) {
        jsonData.forEach((item) => {
          const campaignName = item.utm_campaign || 'Sem nome';
          const existing = campaignMap.get(campaignName);

          const novos = parseInt(item.novos, 10) || 0;
          const ganhos = parseInt(item.ganhos, 10) || 0;
          const perdidos = parseInt(item.perdidos, 10) || 0;
          const totalFunil = parseInt(item.total_funil, 10) || 0;

          if (existing) {
            existing.total += totalFunil;
            existing.novos += novos;
            existing.ganhos += ganhos;
            existing.perdidos += perdidos;
          } else {
            campaignMap.set(campaignName, {
              campaign_name: campaignName,
              campaign_type: item.utm_content || 'Não definido',
              source: `${item.utm_source || 'Meta'} • ${item.utm_medium || 'whatsapp_ads'}`,
              total: totalFunil,
              novos,
              ganhos,
              perdidos,
              conversion_rate: 0,
            });
          }
        });
      }

      const campaigns = Array.from(campaignMap.values()).sort((a, b) => b.total - a.total);
      setData(campaigns);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(startDate, endDate);
  }, []);

  const filteredData = data.filter((campaign) => {
    const matchesSearch = campaign.campaign_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'Todos os Tipos' || campaign.campaign_type === selectedType;
    const matchesCampaign = selectedCampaign === 'Todas as Campanhas' || campaign.campaign_name === selectedCampaign;
    return matchesSearch && matchesType && matchesCampaign;
  });

  const totals = {
    total: filteredData.reduce((sum, d) => sum + d.total, 0),
    novos: filteredData.reduce((sum, d) => sum + d.novos, 0),
    ganhos: filteredData.reduce((sum, d) => sum + d.ganhos, 0),
  };

  const overallConversionRate = totals.novos > 0 ? ((totals.ganhos / totals.novos) * 100).toFixed(1) : '0';

  const campaignTypes = ['Todos os Tipos', ...new Set(data.map((d) => d.campaign_type))];
  const campaignNames = ['Todas as Campanhas', ...new Set(data.map((d) => d.campaign_name))];

  return (
    <div className="bg-[#0d1117] min-h-screen">
      <div className="px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white tracking-tight">Campaign Performance</h1>
          <p className="text-sm text-gray-400 uppercase tracking-wider mt-1">LEAD TRACKING & CONVERSION DASHBOARD</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">TOTAL FUNIL</p>
                <p className="text-4xl font-bold text-white">{totals.total}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-[#1f6feb]/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-[#58a6ff]" />
              </div>
            </div>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">TOTAL GANHOS</p>
                <p className="text-4xl font-bold text-green-400">{totals.ganhos}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">CONVERSAO TOTAL</p>
                <p className="text-4xl font-bold text-[#f97316]">{overallConversionRate}%</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-[#f97316]/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[#f97316]" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">CRIATIVO</p>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-[#161b22] border border-[#30363d] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#58a6ff] min-w-[160px]"
            >
              {campaignTypes.map((type) => (
                <option key={type} value={type} className="bg-[#161b22] text-white">{type}</option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">CAMPANHA</p>
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="bg-[#161b22] border border-[#30363d] text-white rounded-lg px-4 py-2.5 text-sm [color-scheme:dark] focus:outline-none focus:border-[#58a6ff] min-w-[200px]"
            >
              {campaignNames.map((name) => (
                <option key={name} value={name} className="bg-[#161b22] text-white">{name}</option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">TIMEFRAME</p>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-[#161b22] border border-[#30363d] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#58a6ff]"
                />
              </div>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-[#161b22] border border-[#30363d] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#58a6ff]"
                />
              </div>
            </div>
          </div>

          <div className="flex-1">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 opacity-0">SEARCH</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#161b22] border border-[#30363d] text-white rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#58a6ff] w-full max-w-xs"
              />
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 opacity-0">ACTION</p>
            <button
              onClick={() => fetchData(startDate, endDate)}
              disabled={loading}
              className="bg-[#f97316] hover:bg-[#ea580c] text-white font-medium rounded-lg px-6 py-2.5 text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4 text-sm text-gray-400">
          <span>Mostrando <span className="text-[#f97316] font-semibold">{filteredData.length}</span> campanhas</span>
          <span>Status: <span className="text-green-400 font-semibold">{error ? 'ERROR' : 'OK'}</span></span>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#30363d]">
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">CAMPAIGN NAME</th>
                <th className="text-left px-4 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">TYPE</th>
                <th className="text-center px-4 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">TOTAL FUNIL</th>
                <th className="text-center px-4 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">NOVOS</th>
                <th className="text-center px-4 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">GANHOS</th>
                <th className="text-center px-4 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">PERDIDOS</th>
                <th className="text-left px-4 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">CONV. RATE (%)</th>
              </tr>
            </thead>
            <tbody>
              {loading && data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-400">Carregando dados...</p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    Nenhuma campanha encontrada
                  </td>
                </tr>
              ) : (
                filteredData.map((campaign, idx) => {
                  const convRate = campaign.novos > 0 ? ((campaign.ganhos / campaign.novos) * 100) : 0;
                  return (
                    <tr key={idx} className="border-b border-[#30363d] hover:bg-[#1c2128] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-[#30363d] flex items-center justify-center">
                            <FileText className="w-4 h-4 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm truncate max-w-[200px]">{campaign.campaign_name}</p>
                            <p className="text-gray-500 text-xs">{campaign.source}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-[#f97316] text-white truncate max-w-[100px]">
                          {campaign.campaign_type}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-white font-semibold">{campaign.total}</td>
                      <td className="px-4 py-4 text-center text-blue-400 font-semibold">{campaign.novos}</td>
                      <td className="px-4 py-4 text-center text-green-400 font-semibold">{campaign.ganhos}</td>
                      <td className="px-4 py-4 text-center text-red-400 font-semibold">{campaign.perdidos}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 max-w-[100px]">
                            <div className="h-2 bg-[#30363d] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#f97316] to-[#fbbf24] rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(convRate, 100)}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-white font-semibold text-sm w-14 text-right">
                            {convRate > 0 ? `${convRate.toFixed(1)}%` : '--'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
