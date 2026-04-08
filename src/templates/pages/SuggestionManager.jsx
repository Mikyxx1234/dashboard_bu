import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, CheckCircle, XCircle, Eye,
  Inbox, User, Calendar,
  Clipboard, Bookmark, Info,
  ChevronDown, ChevronUp, Shield,
} from 'lucide-react';
import { useSuggestions } from '../context/SuggestionContext';
import { useTemplates } from '../context/TemplateContext';
import { formatDate, truncateText } from '../utils/helpers';

const statusConfig = {
  pending: { label: 'Aguardando Aprovação', bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  approved: { label: 'Aprovado', bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  rejected: { label: 'Rejeitado', bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
};

function SuggestionStatusBadge({ status }) {
  const c = statusConfig[status] || statusConfig.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function ApprovalDialog({ open, suggestion, onClose, onApprove, onReject }) {
  const [rejectReason, setRejectReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [action, setAction] = useState(null);

  if (!open || !suggestion) return null;

  const handleConfirm = async () => {
    if (action === 'approve') {
      await onApprove(suggestion.id, feedback);
    } else {
      await onReject(suggestion.id, rejectReason, feedback);
    }
    setRejectReason(''); setFeedback(''); setAction(null); onClose();
  };

  const handleClose = () => { setRejectReason(''); setFeedback(''); setAction(null); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative rounded-2xl p-6 max-w-md w-full mx-4" style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
        {!action ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/10"><Shield className="w-5 h-5 text-blue-400" /></div>
              <div>
                <h3 className="font-semibold text-white">Revisar Sugestão</h3>
                <p className="text-xs text-slate-500">"{suggestion.name}"</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-6">Escolha uma ação para esta sugestão:</p>
            <div className="space-y-3">
              <button onClick={() => setAction('approve')} className="w-full flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer transition" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <div><p className="font-medium text-emerald-300">Aprovar</p><p className="text-xs text-emerald-400/60">O template será adicionado à lista principal</p></div>
              </button>
              <button onClick={() => setAction('reject')} className="w-full flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer transition" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <XCircle className="w-5 h-5 text-red-400" />
                <div><p className="font-medium text-red-300">Rejeitar</p><p className="text-xs text-red-400/60">A sugestão será marcada como rejeitada</p></div>
              </button>
            </div>
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={handleClose} className="btn-secondary w-full justify-center">Cancelar</button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${action === 'approve' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                {action === 'approve'
                  ? <CheckCircle className="w-5 h-5 text-emerald-400" />
                  : <XCircle className="w-5 h-5 text-red-400" />}
              </div>
              <div>
                <h3 className="font-semibold text-white">{action === 'approve' ? 'Aprovar Sugestão' : 'Rejeitar Sugestão'}</h3>
                <p className="text-xs text-slate-500">Sugerido por {suggestion.submittedBy}</p>
              </div>
            </div>
            {action === 'reject' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Motivo da rejeição (opcional)</label>
                <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="input-field min-h-[60px] resize-y" placeholder="Explique o motivo..." />
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-400 mb-1.5">
                Resposta para o consultor <span className="text-slate-600">(será enviada para {suggestion.submittedBy})</span>
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="input-field min-h-[60px] resize-y"
                placeholder={action === 'approve'
                  ? 'Ex: Ótima sugestão! Template adicionado à lista.'
                  : 'Ex: Precisamos de um conteúdo mais específico para esta campanha.'}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAction(null)} className="btn-secondary flex-1 justify-center">Voltar</button>
              <button onClick={handleConfirm} className={`flex-1 justify-center ${action === 'approve' ? 'btn-primary' : 'btn-danger'}`} style={action === 'approve' ? { background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 4px 20px rgba(16,185,129,0.3)' } : {}}>
                {action === 'approve' ? <><CheckCircle className="w-4 h-4" /> Aprovar</> : <><XCircle className="w-4 h-4" /> Rejeitar</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SuggestionCard({ suggestion, onReview }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(suggestion.content); } catch {
      const ta = document.createElement('textarea'); ta.value = suggestion.content; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const borderColor = suggestion.status === 'approved' ? 'border-l-emerald-500' : suggestion.status === 'rejected' ? 'border-l-red-500' : 'border-l-amber-500';

  return (
    <div className={`card border-l-4 ${borderColor}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white mb-1">{suggestion.name}</h3>
            <div className="flex items-center flex-wrap gap-2">
              <SuggestionStatusBadge status={suggestion.status} />
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${suggestion.type === 'marketing' ? 'bg-purple-500/10 text-purple-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
                {suggestion.type === 'marketing' ? 'Marketing' : 'Utility'}
              </span>
              {suggestion.category && <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/[0.06] text-slate-400">{suggestion.category}</span>}
            </div>
          </div>
          {suggestion.status === 'pending' && (
            <button onClick={() => onReview(suggestion)} className="btn-primary text-xs py-1.5 px-3">
              <Shield className="w-3.5 h-3.5" /> Revisar
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
          <span className="inline-flex items-center gap-1"><User className="w-3 h-3" />{suggestion.submittedBy}</span>
          <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />Enviado em {formatDate(suggestion.submittedAt)}</span>
          {suggestion.reviewedAt && <span className="inline-flex items-center gap-1"><CheckCircle className="w-3 h-3" />Revisado em {formatDate(suggestion.reviewedAt)}</span>}
        </div>

        <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
            {expanded ? suggestion.content : truncateText(suggestion.content, 200)}
          </p>
          {suggestion.content.length > 200 && (
            <button onClick={() => setExpanded(!expanded)} className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-flex items-center gap-1 cursor-pointer transition">
              {expanded ? <><ChevronUp className="w-3 h-3" /> Recolher</> : <><ChevronDown className="w-3 h-3" /> Ver tudo</>}
            </button>
          )}
        </div>

        {suggestion.tags && suggestion.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {suggestion.tags.map((tag) => <span key={tag} className="px-2 py-0.5 bg-white/[0.04] text-slate-500 rounded text-xs">#{tag}</span>)}
          </div>
        )}

        <div className="space-y-1.5 text-xs text-slate-500 mb-3">
          {suggestion.usageRecommendation && <div className="flex items-center gap-1.5"><Bookmark className="w-3 h-3" /><span>Uso: {suggestion.usageRecommendation}</span></div>}
          {suggestion.notes && <div className="flex items-center gap-1.5"><Info className="w-3 h-3" /><span>Obs: {suggestion.notes}</span></div>}
          {suggestion.expiryDate && <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" /><span>Validade sugerida: {formatDate(suggestion.expiryDate)}</span></div>}
        </div>

        {suggestion.status === 'rejected' && suggestion.rejectReason && (
          <div className="rounded-xl p-3 text-sm text-red-300" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <p className="font-medium text-xs mb-0.5">Motivo da rejeição:</p>
            {suggestion.rejectReason}
          </div>
        )}

        <div className="flex items-center gap-1 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={handleCopy} className="btn-icon text-xs inline-flex items-center gap-1" title="Copiar conteúdo">
            {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Clipboard className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuggestionManager() {
  const navigate = useNavigate();
  const { suggestions, approveSuggestion, rejectSuggestion, getSuggestionStats } = useSuggestions();
  const { addTemplate } = useTemplates();
  const [reviewTarget, setReviewTarget] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const stats = getSuggestionStats();
  const filtered = filterStatus === 'all' ? suggestions : suggestions.filter((s) => s.status === filterStatus);

  const handleApprove = async (id, feedback) => {
    const success = await approveSuggestion(id, feedback);
    if (success) {
      const suggestion = suggestions.find((s) => s.id === id);
      if (suggestion) {
        await addTemplate({
          name: suggestion.name, content: suggestion.content, type: suggestion.type,
          expiryDate: suggestion.expiryDate, updateStartDate: suggestion.updateStartDate,
          updateEndDate: suggestion.updateEndDate, tags: suggestion.tags,
          notes: suggestion.notes ? `[Sugerido por ${suggestion.submittedBy}] ${suggestion.notes}` : `Sugerido por ${suggestion.submittedBy}`,
          usageRecommendation: suggestion.usageRecommendation, category: suggestion.category, manualStatus: null,
        });
      }
    }
    return success;
  };

  const statBtn = (label, value, filterVal, ringColor) => (
    <button
      onClick={() => setFilterStatus(filterVal)}
      className={`card p-4 text-left cursor-pointer transition-all hover:border-white/[0.12] ${filterStatus === filterVal ? 'ring-2' : ''}`}
      style={filterStatus === filterVal ? { boxShadow: `0 0 0 2px ${ringColor}` } : {}}
    >
      <div className="flex items-center gap-2">
        <p className="text-2xl font-bold text-white">{value}</p>
        {filterVal === 'pending' && value > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
      </div>
      <p className="text-xs text-slate-500">{label}</p>
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Sugestões de Templates</h2>
          <p className="text-sm text-slate-500 mt-1">Gerencie sugestões enviadas pela equipe</p>
        </div>
        <button onClick={() => navigate('/templates-hub/suggest')} className="btn-secondary">
          <Eye className="w-4 h-4" /> Ver formulário
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statBtn('Total', stats.total, 'all', 'rgba(99,102,241,0.5)')}
        {statBtn('Aguardando', stats.pending, 'pending', 'rgba(245,158,11,0.5)')}
        {statBtn('Aprovados', stats.approved, 'approved', 'rgba(16,185,129,0.5)')}
        {statBtn('Rejeitados', stats.rejected, 'rejected', 'rgba(239,68,68,0.5)')}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">
            {filterStatus === 'all' ? 'Nenhuma sugestão recebida' : 'Nenhuma sugestão com este status'}
          </p>
          <p className="text-sm text-slate-600 mt-1">As sugestões dos colaboradores aparecerão aqui</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((s) => <SuggestionCard key={s.id} suggestion={s} onReview={setReviewTarget} />)}
        </div>
      )}

      <ApprovalDialog
        open={!!reviewTarget}
        suggestion={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onApprove={handleApprove}
        onReject={rejectSuggestion}
      />
    </div>
  );
}
