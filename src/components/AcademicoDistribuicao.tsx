import { useState, useEffect, useRef, useCallback } from 'react';
import { Inbox, UserCheck, Users, ArrowUpDown } from 'lucide-react';

const TABLE = 'distribuicao_academico_anh';
const WEBHOOK_SAVE = 'https://n8n-new-n8n.ca31ey.easypanel.host/webhook/atualizacaodados';
const REFRESH_WEBHOOK = 'https://n8n-new-n8n.ca31ey.easypanel.host/webhook/atualizarpainel';

interface Responsavel {
  id: number;
  responsavel: string;
  ativo_inativo: string;
  almoco: string | null;
  final_expediente: string | null;
  pausa_distribuicao: number;
  volume_distribuicao: number;
  fila: number;
  tipo_atendimento: string;
  ultima_execucao: string | null;
}

interface DirtyData {
  ativo_inativo?: string;
  almoco?: string | null;
  final_expediente?: string | null;
  pausa_distribuicao?: number;
  volume_distribuicao?: number;
  tipo_atendimento?: string;
}

function AcademicoDistribuicao() {
  const [rows, setRows] = useState<Responsavel[]>([]);
  const [kpiFila, setKpiFila] = useState(0);
  const [kpiEmAtendimento, setKpiEmAtendimento] = useState(0);
  const [kpiAtivos, setKpiAtivos] = useState(0);
  const [kpiTotal, setKpiTotal] = useState(0);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [toast, setToast] = useState({ show: false, message: '', success: true });
  const dirtyRef = useRef<Map<number, DirtyData>>(new Map());
  const rowsRef = useRef<Responsavel[]>([]);
  rowsRef.current = rows;

  const showToast = (message: string, success = true) => {
    setToast({ show: true, message, success });
    setTimeout(() => setToast({ show: false, message: '', success: true }), 3500);
  };

  const fmt = (val: string | null) => {
    if (!val) return '—';
    const d = new Date(val);
    return isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC'
    });
  };

  const toTimeHM = (v: string | null) => {
    if (!v) return '';
    const m = String(v).match(/^(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : '';
  };

  const load = async () => {
    try {
      const r = await fetch(REFRESH_WEBHOOK, { method: 'POST' });
      const raw = await r.json();
      const data = Array.isArray(raw) ? raw[0] : raw;

      setKpiFila(data?.capturar ?? 0);
      setKpiEmAtendimento(data?.em_atendimento ?? 0);
      setKpiAtivos(data?.ativos ?? 0);
      setKpiTotal(data?.total_responsaveis ?? 0);

      const dist: any[] = data?.distribuicao ?? [];
      const mapped: Responsavel[] = dist.map((item: any) => ({
        id: Number(item.id),
        responsavel: item.responsavel ?? '—',
        ativo_inativo: item.ativo_inativo ?? 'Inativo',
        almoco: item.almoco ?? null,
        final_expediente: item.final_expediente ?? null,
        pausa_distribuicao: item.pausa ?? item.pausa_distribuicao ?? 20,
        volume_distribuicao: item.volume ?? item.volume_distribuicao ?? 0,
        fila: item.fila ?? 0,
        tipo_atendimento: item.tipo_atendimento ?? 'Atendimento',
        ultima_execucao: item.ultima_execucao ?? null,
      }));

      setRows(mapped);
    } catch (e) {
      console.error('Erro ao carregar dados:', e);
      setRows([]);
    }
  };

  const runN8nAndReload = async () => {
    try {
      await load();
      showToast('Dados atualizados com sucesso');
    } catch (e) {
      console.warn('Erro ao atualizar:', e);
      showToast('Erro ao atualizar dados', false);
    }
  };

  const handleSave = useCallback(async () => {
    const dirty = dirtyRef.current;
    if (dirty.size === 0) {
      showToast('Nenhuma alteração para salvar', false);
      return;
    }

    const changes = Array.from(dirty.entries()).map(([id, patch]) => {
      const current = rowsRef.current.find(r => r.id === id);
      return {
        id,
        almoco: patch.almoco !== undefined ? patch.almoco : (current?.almoco ?? null),
        final_expediente: patch.final_expediente !== undefined ? patch.final_expediente : (current?.final_expediente ?? null),
        pausa_distribuicao: patch.pausa_distribuicao !== undefined ? patch.pausa_distribuicao : (current?.pausa_distribuicao ?? 0),
        volume_distribuicao: patch.volume_distribuicao !== undefined ? patch.volume_distribuicao : (current?.volume_distribuicao ?? 0),
        tipo_atendimento: patch.tipo_atendimento !== undefined ? patch.tipo_atendimento : (current?.tipo_atendimento ?? null),
        ativo_inativo: patch.ativo_inativo !== undefined ? patch.ativo_inativo : (current?.ativo_inativo ?? null),
      };
    });

    try {
      const res = await fetch(WEBHOOK_SAVE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: TABLE, changes }),
      });

      if (res.ok) {
        dirty.clear();
        showToast('Alterações salvas com sucesso');
        await load();
      } else {
        showToast('Falha ao salvar alterações', false);
      }
    } catch (e: unknown) {
      console.error('Erro ao salvar:', e);
      showToast('Erro ao salvar alterações', false);
    }
  }, []);

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  const runN8nRef = useRef(runN8nAndReload);
  runN8nRef.current = runN8nAndReload;

  useEffect(() => {
    load();

    const handleSalvarEvent = () => handleSaveRef.current();
    const handleAtualizarEvent = () => runN8nRef.current();

    window.addEventListener('academico-salvar', handleSalvarEvent);
    window.addEventListener('academico-atualizar', handleAtualizarEvent);

    return () => {
      window.removeEventListener('academico-salvar', handleSalvarEvent);
      window.removeEventListener('academico-atualizar', handleAtualizarEvent);
    };
  }, []);

  const handleChange = (id: number, field: keyof DirtyData, value: any) => {
    const dirty = dirtyRef.current;
    const existing = dirty.get(id) || {};
    dirty.set(id, { ...existing, [field]: value });

    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  return (
    <>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Inbox className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Capturar</p>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{kpiFila}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Em Atendimento</p>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{kpiEmAtendimento}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Ativos</p>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{kpiAtivos}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <Users className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Responsáveis</p>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{kpiTotal}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">RESPONSÁVEL</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">STATUS</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-600 dark:text-blue-400 uppercase">ALMOÇO</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-600 dark:text-blue-400 uppercase">FIM EXPEDIENTE</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">PAUSA (MIN)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">VOLUME</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">FILA</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">TIPO</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="flex items-center gap-2 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                      ÚLTIMA EXECUÇÃO
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">Carregando…</td>
                  </tr>
                ) : (
                  [...rows].sort((a, b) => {
                    const dateA = new Date(a.ultima_execucao || 0).getTime();
                    const dateB = new Date(b.ultima_execucao || 0).getTime();
                    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
                  }).map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{r.responsavel || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={(r.ativo_inativo || '').toLowerCase() === 'ativo' ? 'Ativo' : 'Inativo'}
                          onChange={(e) => handleChange(r.id, 'ativo_inativo', e.target.value)}
                          className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="Ativo">Ativo</option>
                          <option value="Inativo">Inativo</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="time"
                          value={toTimeHM(r.almoco)}
                          onChange={(e) => handleChange(r.id, 'almoco', e.target.value || null)}
                          className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="time"
                          value={toTimeHM(r.final_expediente)}
                          onChange={(e) => handleChange(r.id, 'final_expediente', e.target.value || null)}
                          className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="5"
                          value={r.pausa_distribuicao ?? 20}
                          onChange={(e) => handleChange(r.id, 'pausa_distribuicao', Number(e.target.value) || 0)}
                          className="w-20 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={r.volume_distribuicao ?? 0}
                          onChange={(e) => handleChange(r.id, 'volume_distribuicao', Number(e.target.value) || 0)}
                          className="w-20 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{r.fila ?? 0}</span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          disabled
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
                        >
                          <option value="Atendimento">Atendimento</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600 dark:text-slate-400">{fmt(r.ultima_execucao)}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all duration-300 ${
          toast.success
            ? 'bg-emerald-500/90 border-emerald-400/50 text-white'
            : 'bg-red-500/90 border-red-400/50 text-white'
        }`}>
          <p className="font-semibold">{toast.message}</p>
        </div>
      )}
    </>
  );
}

export default AcademicoDistribuicao;
