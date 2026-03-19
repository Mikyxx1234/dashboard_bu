import { useState, useEffect } from 'react';
import { Save, RefreshCw, Users, CheckCircle, Clock, ArrowUpDown } from 'lucide-react';
import AcademicoDistribuicao from '../components/AcademicoDistribuicao';

interface Registro {
  id_usuario: string;
  nome: string;
  status: string;
  qnt_distribuir: number;
  obs: string;
  ultimo_lead: string | null;
}

export default function AnhangueraDashboard() {
  const [currentRows, setCurrentRows] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', success: true });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState<'comercial' | 'academico'>('comercial');
  const [academicoKey, setAcademicoKey] = useState(0);

  const showToast = (message: string, success = true) => {
    setToast({ show: true, message, success });
    setTimeout(() => setToast({ show: false, message: '', success: true }), 3500);
  };

  const fmtDate = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(+d) ? String(iso) : d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const normalizeRows = (rows: any[]): Registro[] => {
    return (rows || []).map(r => ({
      id_usuario: r.id_usuario ?? r.id_lead ?? '',
      nome: r.nome ?? '—',
      status: (r.status || '').toUpperCase().includes('INATIVO') ? 'INATIVO' : 'ATIVO',
      qnt_distribuir: Math.max(1, Math.min(3, Number(r.qnt_distribuir ?? r.quantidade_leads ?? 1))),
      obs: (r.obs ?? r.observacao ?? '').length <= 1 ? '' : (r.obs ?? r.observacao ?? ''),
      ultimo_lead: r.ultimo_lead ?? null
    }));
  };

  const handleAtualizar = async () => {
    setLoading(true);
    try {
      const body = { source: 'dashboard-anhanguera', action: 'atualizar', ts: new Date().toISOString() };
      const res = await fetch('https://n8n-new-n8n.ca31ey.easypanel.host/webhook/dados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        const rows = Array.isArray(data) ? data : (data && Array.isArray(data.output)) ? data.output : null;
        if (rows) {
          setCurrentRows(normalizeRows(rows));
          showToast('Dados atualizados com sucesso', true);
        } else {
          showToast('Formato de resposta inesperado', false);
        }
      } else {
        showToast('Falha ao atualizar dados', false);
      }
    } catch (err) {
      showToast('Erro ao atualizar dados', false);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async () => {
    setLoading(true);
    try {
      const body = {
        source: 'dashboard-anhanguera',
        action: 'salvar',
        ts: new Date().toISOString(),
        registros: currentRows
      };
      const res = await fetch('https://n8n-new-n8n.ca31ey.easypanel.host/webhook/edicao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      showToast(res.ok ? 'Alterações salvas com sucesso' : 'Falha ao salvar alterações', res.ok);
    } catch (err) {
      showToast('Erro ao salvar alterações', false);
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (index: number, field: keyof Registro, value: any) => {
    const newRows = [...currentRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setCurrentRows(newRows);
  };

  useEffect(() => {
    handleAtualizar();
  }, []);

  const pessoas = currentRows.length;
  const ativos = currentRows.filter(r => r.status === 'ATIVO').length;
  const ultimoLead = currentRows.reduce((max, r) => Math.max(max, +new Date(r.ultimo_lead || 0)), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100">
      <div className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 shadow-lg shadow-orange-500/30"></div>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-400 to-transparent opacity-50 blur-sm"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Faculdade Anhanguera</h1>
                <p className="text-sm text-slate-600">Gestão de Leads e Distribuição</p>
              </div>
              <div className="flex gap-2 ml-8">
                <button
                  onClick={() => setActiveTab('comercial')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'comercial'
                      ? 'bg-orange-600 text-white shadow-lg'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Distribuição Comercial
                </button>
                <button
                  onClick={() => setActiveTab('academico')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'academico'
                      ? 'bg-orange-600 text-white shadow-lg'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Distribuição Acadêmico
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {activeTab === 'comercial' ? (
                <>
                  <button
                    onClick={handleSalvar}
                    disabled={loading}
                    className="group relative px-5 py-2.5 bg-white text-slate-700 rounded-xl font-semibold shadow-sm hover:shadow-md border border-slate-200 hover:border-slate-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                  >
                    <div className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      <span>Salvar</span>
                    </div>
                  </button>

                  <button
                    onClick={handleAtualizar}
                    disabled={loading}
                    className="group relative px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-xl font-semibold shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                  >
                    <div className="flex items-center gap-2">
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      <span>Atualizar</span>
                    </div>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      const event = new CustomEvent('academico-salvar');
                      window.dispatchEvent(event);
                    }}
                    disabled={loading}
                    className="group relative px-5 py-2.5 bg-white text-slate-700 rounded-xl font-semibold shadow-sm hover:shadow-md border border-slate-200 hover:border-slate-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                  >
                    <div className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      <span>Salvar</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      const event = new CustomEvent('academico-atualizar');
                      window.dispatchEvent(event);
                    }}
                    disabled={loading}
                    className="group relative px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-xl font-semibold shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                  >
                    <div className="flex items-center gap-2">
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      <span>Atualizar</span>
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="py-6 px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {activeTab === 'academico' ? (
            <AcademicoDistribuicao />
          ) : (
            <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group relative bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200/50 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-orange-100 rounded-2xl">
                    <Users className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-600 mb-1">Total de Pessoas</p>
                <p className="text-4xl font-bold text-slate-900">{pessoas}</p>
              </div>
            </div>

            <div className="group relative bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200/50 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-emerald-100 rounded-2xl">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-600 mb-1">Usuários Ativos</p>
                <p className="text-4xl font-bold text-slate-900">{ativos}</p>
              </div>
            </div>

            <div className="group relative bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200/50 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-amber-100 rounded-2xl">
                    <Clock className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-600 mb-1">Última Distribuição</p>
                <p className="text-lg font-bold text-slate-900">
                  {ultimoLead ? fmtDate(new Date(ultimoLead).toISOString()) : '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/50 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Distribuição de Leads</h2>
              <p className="text-sm text-slate-600 mt-1">Gerencie status e configurações de distribuição</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Nome</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">ID Usuário</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Qtd Distribuir</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Observação</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                      <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="flex items-center gap-2 hover:text-orange-600 transition-colors"
                      >
                        Última Distribuição
                        <ArrowUpDown className="w-4 h-4" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {[...currentRows].sort((a, b) => {
                    const dateA = new Date(a.ultimo_lead || 0).getTime();
                    const dateB = new Date(b.ultimo_lead || 0).getTime();
                    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
                  }).map((row) => {
                    const originalIndex = currentRows.findIndex(r => r.id_usuario === row.id_usuario);
                    return (
                    <tr key={row.id_usuario} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{row.nome}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">{row.id_usuario}</td>
                      <td className="px-6 py-4">
                        <select
                          value={row.status}
                          onChange={(e) => updateRow(originalIndex, 'status', e.target.value)}
                          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        >
                          <option value="ATIVO">Ativo</option>
                          <option value="INATIVO">Inativo</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={row.qnt_distribuir}
                          onChange={(e) => updateRow(originalIndex, 'qnt_distribuir', Number(e.target.value))}
                          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        >
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={row.obs}
                          onChange={(e) => updateRow(originalIndex, 'obs', e.target.value)}
                          placeholder="Adicionar observação"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">{fmtDate(row.ultimo_lead)}</td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          </>
          )}
        </div>
      </div>

      {toast.show && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border ${
          toast.success
            ? 'bg-orange-500/90 border-orange-400/50 text-white'
            : 'bg-red-500/90 border-red-400/50 text-white'
        } animate-in slide-in-from-bottom-5 duration-300`}>
          <p className="font-semibold">{toast.message}</p>
        </div>
      )}
    </div>
  );
}
