import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import {
  ArrowLeft, Edit3, Copy, Trash2, Star, CheckCircle,
  Clipboard, Clock, Tag, MessageSquare, History, Info,
  Bookmark, RefreshCw, Smartphone,
} from 'lucide-react';
import { useTemplates } from '../context/TemplateContext';
import { computeStatus, formatDate, daysUntil } from '../utils/helpers';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import WhatsAppPreview from '../components/WhatsAppPreview';

export default function TemplateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { templates, deleteTemplate, duplicateTemplate, toggleFavorite } = useTemplates();
  const [copied, setCopied] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showWAPreview, setShowWAPreview] = useState(false);

  const template = templates.find((t) => String(t.id) === id);

  if (!template) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Template não encontrado.</p>
        <button onClick={() => navigate('/templates-hub/list')} className="btn-primary mt-4">
          Voltar para lista
        </button>
      </div>
    );
  }

  const status = computeStatus(template);
  const expiryDays = daysUntil(template.expiryDate);
  const charCount = template.content.length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(template.content);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = template.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDuplicate = async () => {
    await duplicateTemplate(template.id);
    navigate('/templates-hub/list');
  };

  const handleDelete = async () => {
    await deleteTemplate(template.id);
    navigate('/templates-hub/list');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate(-1)} className="btn-icon mt-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => toggleFavorite(template.id)} className="cursor-pointer">
                <Star
                  className={`w-5 h-5 ${
                    template.isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600 hover:text-yellow-400'
                  }`}
                />
              </button>
              <h2 className="text-2xl font-bold text-white">{template.name}</h2>
            </div>
            <div className="flex items-center flex-wrap gap-2">
              <StatusBadge status={status} />
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                template.type === 'marketing' ? 'bg-purple-500/10 text-purple-400' : 'bg-cyan-500/10 text-cyan-400'
              }`}>
                {template.type === 'marketing' ? 'Marketing' : 'Utility'}
              </span>
              {template.category && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/[0.06] text-slate-400">
                  {template.category}
                </span>
              )}
              <span className="text-xs text-slate-600">v{template.version || 1}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => navigate(`/templates-hub/${id}/edit`)} className="btn-secondary">
            <Edit3 className="w-4 h-4" />
            Editar
          </button>
        </div>
      </div>

      {(status === 'expired' || status === 'expiring') && (
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{
            background: status === 'expired' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
            border: `1px solid ${status === 'expired' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
          }}
        >
          <div className={`w-3 h-3 rounded-full animate-pulse ${status === 'expired' ? 'bg-red-400' : 'bg-amber-400'}`} />
          <p className={`text-sm font-medium ${status === 'expired' ? 'text-red-300' : 'text-amber-300'}`}>
            {status === 'expired'
              ? `Este template está vencido há ${Math.abs(expiryDays)} dia${Math.abs(expiryDays) !== 1 ? 's' : ''}. Atualize-o o mais rápido possível.`
              : `Este template vence em ${expiryDays} dia${expiryDays !== 1 ? 's' : ''}. Revise e atualize antes do vencimento.`}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="card">
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-slate-500" />
                <h3 className="font-semibold text-white">Conteúdo da Mensagem</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-600">{charCount} caracteres</span>
                <button onClick={handleCopy} className="btn-secondary text-xs py-1.5 px-2.5">
                  {copied ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-3.5 h-3.5" />
                      Copiar
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="p-5">
              <div
                className="rounded-xl p-4 whitespace-pre-wrap text-sm text-slate-300 leading-relaxed font-mono"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                {template.content}
              </div>
            </div>
          </div>

          {(template.usageRecommendation || template.notes) && (
            <div className="card p-5 space-y-4">
              {template.usageRecommendation && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Bookmark className="w-4 h-4 text-slate-500" />
                    <h4 className="text-sm font-medium text-slate-300">Uso Recomendado</h4>
                  </div>
                  <p className="text-sm text-slate-400 ml-6">{template.usageRecommendation}</p>
                </div>
              )}
              {template.notes && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Info className="w-4 h-4 text-slate-500" />
                    <h4 className="text-sm font-medium text-slate-300">Observações</h4>
                  </div>
                  <p className="text-sm text-slate-400 ml-6">{template.notes}</p>
                </div>
              )}
            </div>
          )}

          {template.history && template.history.length > 0 && (
            <div className="card">
              <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <History className="w-4 h-4 text-slate-500" />
                <h3 className="font-semibold text-white">Histórico</h3>
              </div>
              <div className="p-5">
                <div className="space-y-3">
                  {[...template.history].reverse().map((entry, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" style={{ boxShadow: '0 0 6px rgba(96,165,250,0.4)' }} />
                      <div>
                        <p className="text-sm text-slate-300">{entry.action}</p>
                        <p className="text-xs text-slate-600">
                          {formatDate(entry.date)} • {entry.user}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="card p-5 space-y-4">
            <h3 className="font-semibold text-white text-sm">Informações</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Validade
                </span>
                <span className="font-medium text-slate-200">
                  {template.expiryDate ? formatDate(template.expiryDate) : 'Permanente'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Criado em</span>
                <span className="text-slate-400">{formatDate(template.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Última edição</span>
                <span className="text-slate-400">{formatDate(template.updatedAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Versão</span>
                <span className="text-slate-400">v{template.version || 1}</span>
              </div>
            </div>
          </div>

          {template.tags && template.tags.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-slate-500" />
                <h3 className="font-semibold text-white text-sm">Tags</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {template.tags.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-medium">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="card p-5 space-y-2">
            <h3 className="font-semibold text-white text-sm mb-3">Ações</h3>
            <button
              onClick={() => setShowWAPreview(true)}
              className="w-full justify-center flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer"
              style={{ background: 'rgba(37,211,102,0.12)', color: '#25d366', border: '1px solid rgba(37,211,102,0.2)' }}
            >
              <Smartphone className="w-4 h-4" />
              Preview WhatsApp
            </button>
            <button onClick={handleCopy} className="btn-secondary w-full justify-center">
              <Clipboard className="w-4 h-4" />
              Copiar Conteúdo
            </button>
            <button onClick={handleDuplicate} className="btn-secondary w-full justify-center">
              <Copy className="w-4 h-4" />
              Duplicar Template
            </button>
            <button onClick={() => navigate(`/templates-hub/${id}/edit`)} className="btn-secondary w-full justify-center">
              <Edit3 className="w-4 h-4" />
              Editar Template
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="btn-secondary w-full justify-center"
              style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.2)' }}
            >
              <Trash2 className="w-4 h-4" />
              Excluir Template
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        title="Excluir Template"
        message={`Tem certeza que deseja excluir "${template.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />

      {showWAPreview && (
        <WhatsAppPreview content={template.content} name={template.name} onClose={() => setShowWAPreview(false)} />
      )}
    </div>
  );
}
