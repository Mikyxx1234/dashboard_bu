import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Bell, X, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getAvisosNaoConfirmados,
  confirmarAviso,
  type Aviso,
} from '../services/avisosService';

export function AvisoPopup() {
  const { user, isAdmin } = useAuth();
  // IDs postergados ficam apenas em memória: resetam automaticamente
  // quando o componente desmonta (logout) e remonta (novo login)
  const [postergados, setPostergados] = useState<Set<string>>(new Set());
  const [fila, setFila] = useState<Aviso[]>([]);
  const [atual, setAtual] = useState<Aviso | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  const carregarFila = useCallback(async () => {
    if (!user || isAdmin) return;
    try {
      const pendentes = await getAvisosNaoConfirmados(user);
      const paraExibir = pendentes.filter((a) => !postergados.has(a.id));
      setFila(paraExibir);
      setAtual(paraExibir[0] ?? null);
    } catch {
      // falha silenciosa — não bloqueia o dashboard
    }
  }, [user, isAdmin, postergados]);

  useEffect(() => {
    carregarFila();
  }, [carregarFila]);

  async function handleCiente() {
    if (!atual || !user) return;
    setConfirmando(true);
    try {
      await confirmarAviso(atual.id, user);
      setConfirmado(true);
      // Breve flash de confirmação antes de avançar
      setTimeout(() => {
        setConfirmado(false);
        setConfirmando(false);
        const restantes = fila.filter((a) => a.id !== atual.id);
        setFila(restantes);
        setAtual(restantes[0] ?? null);
      }, 1200);
    } catch {
      setConfirmando(false);
    }
  }

  function handleLerDepois() {
    if (!atual) return;
    // Apenas esconde nesta sessão de login — na próxima entrada o popup volta
    setPostergados((prev) => new Set([...prev, atual.id]));
    const restantes = fila.filter((a) => a.id !== atual.id);
    setFila(restantes);
    setAtual(restantes[0] ?? null);
  }

  if (!atual) return null;

  const totalPendentes = fila.length;
  const posicao = fila.indexOf(atual) + 1;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
        {/* Header */}
        <div
          className={`flex items-center gap-3 rounded-t-2xl px-5 py-4 ${
            atual.urgente
              ? 'border-b border-red-800/50 bg-red-950/60'
              : 'border-b border-gray-800 bg-gray-900'
          }`}
        >
          <div
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
              atual.urgente ? 'bg-red-500/20' : 'bg-amber-500/15'
            }`}
          >
            {atual.urgente ? (
              <ShieldAlert className="h-5 w-5 text-red-400" />
            ) : (
              <Bell className="h-5 w-5 text-amber-400" />
            )}
          </div>
          <div className="flex-1">
            <p
              className={`text-xs font-semibold uppercase tracking-wider ${
                atual.urgente ? 'text-red-400' : 'text-amber-400'
              }`}
            >
              {atual.urgente ? 'Aviso Urgente' : 'Comunicado'}
            </p>
            {totalPendentes > 1 && (
              <p className="text-xs text-gray-500">
                {posicao} de {totalPendentes} avisos pendentes
              </p>
            )}
          </div>
          {/* Indicador de múltiplos avisos */}
          {totalPendentes > 1 && (
            <div className="flex gap-1">
              {fila.map((a, i) => (
                <div
                  key={a.id}
                  className={`h-1.5 w-1.5 rounded-full ${
                    i === posicao - 1 ? 'bg-blue-400' : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="px-5 py-5">
          <h2 className="mb-3 text-lg font-bold text-white leading-snug">
            {atual.titulo}
          </h2>
          <p className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">
            {atual.corpo}
          </p>
          {atual.expira_em && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-yellow-600">
              <Clock className="h-3.5 w-3.5" />
              Válido até {new Date(atual.expira_em).toLocaleDateString('pt-BR')}
            </div>
          )}
          <p className="mt-3 text-[11px] text-gray-600">
            por {atual.criado_por} ·{' '}
            {new Date(atual.criado_em).toLocaleDateString('pt-BR')}
          </p>
        </div>

        {/* Estado de confirmação */}
        {confirmado && (
          <div className="mx-5 mb-4 flex items-center gap-2 rounded-lg bg-emerald-900/40 px-4 py-2.5 text-sm font-medium text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Confirmado! Obrigado.
          </div>
        )}

        {/* Ações */}
        {!confirmado && (
          <div className="flex gap-3 border-t border-gray-800 px-5 py-4">
            <button
              onClick={handleCiente}
              disabled={confirmando}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
            >
              {confirmando ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Ciente
            </button>
            <button
              onClick={handleLerDepois}
              disabled={confirmando}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:border-gray-600 hover:bg-gray-700 hover:text-white disabled:opacity-60"
            >
              <X className="h-4 w-4" />
              Ler depois
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
