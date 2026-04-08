import { useNavigate } from 'react-router-dom';
import {
  Eye, Edit3, Copy, Trash2, Star, CheckCircle,
  Clock, AlertTriangle, Clipboard, Smartphone,
} from 'lucide-react';
import { useTemplates } from '../context/TemplateContext';
import { computeStatus, formatDate, daysUntil, truncateText } from '../utils/helpers';
import StatusBadge from './StatusBadge';
import WhatsAppPreview from './WhatsAppPreview';
import { useState } from 'react';

const borderColors = {
  expired: 'border-l-red-500',
  expiring: 'border-l-amber-500',
  updating: 'border-l-blue-500',
  active: 'border-l-emerald-500',
};

export default function TemplateCard({ template }) {
  const navigate = useNavigate();
  const { deleteTemplate, duplicateTemplate, toggleFavorite } = useTemplates();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showWAPreview, setShowWAPreview] = useState(false);

  const status = computeStatus(template);
  const expiryDays = daysUntil(template.expiryDate);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(template.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = template.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (showDeleteConfirm) {
      await deleteTemplate(template.id);
    } else {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  return (
    <div className={`card border-l-4 ${borderColors[status] || borderColors.active} hover:border-white/[0.12] transition-all`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); toggleFavorite(template.id); }}
                className="shrink-0 cursor-pointer"
              >
                <Star
                  className={`w-4 h-4 ${
                    template.isFavorite
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-slate-600 hover:text-yellow-400'
                  }`}
                />
              </button>
              <h3
                className="font-semibold text-white truncate cursor-pointer hover:text-blue-400 transition"
                onClick={() => navigate(`/templates-hub/${template.id}`)}
              >
                {template.name}
              </h3>
            </div>
            <div className="flex items-center flex-wrap gap-2">
              <StatusBadge status={status} />
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                template.type === 'marketing'
                  ? 'bg-purple-500/10 text-purple-400'
                  : 'bg-cyan-500/10 text-cyan-400'
              }`}>
                {template.type === 'marketing' ? 'Marketing' : 'Utility'}
              </span>
              {template.category && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/[0.06] text-slate-400">
                  {template.category}
                </span>
              )}
              {template.version > 1 && (
                <span className="text-xs text-slate-600">v{template.version}</span>
              )}
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-400 mb-3 leading-relaxed">
          {truncateText(template.content, 150)}
        </p>

        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {template.tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-white/[0.04] text-slate-500 rounded text-xs">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-4">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {template.expiryDate ? `Validade: ${formatDate(template.expiryDate)}` : 'Permanente'}
          </span>
          {template.expiryDate && expiryDays <= 7 && expiryDays >= 0 && (
            <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
              <AlertTriangle className="w-3 h-3" />
              Vence em {expiryDays} dia{expiryDays !== 1 ? 's' : ''}
            </span>
          )}
          {template.expiryDate && expiryDays < 0 && (
            <span className="inline-flex items-center gap-1 text-red-400 font-medium">
              <AlertTriangle className="w-3 h-3" />
              Vencido há {Math.abs(expiryDays)} dia{Math.abs(expiryDays) !== 1 ? 's' : ''}
            </span>
          )}
          {template.updatedAt && (
            <span>Editado: {formatDate(template.updatedAt)}</span>
          )}
        </div>

        <div className="flex items-center gap-1 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => navigate(`/templates-hub/${template.id}`)}
            className="btn-icon" title="Visualizar"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(`/templates-hub/${template.id}/edit`)}
            className="btn-icon" title="Editar"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button onClick={handleCopy} className="btn-icon" title="Copiar conteúdo">
            {copied ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <Clipboard className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowWAPreview(true); }}
            className="btn-icon"
            title="Preview WhatsApp"
            style={{ color: '#25d366' }}
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); duplicateTemplate(template.id); }}
            className="btn-icon" title="Duplicar"
          >
            <Copy className="w-4 h-4" />
          </button>
          <div className="flex-1" />
          <button
            onClick={handleDelete}
            className={`btn-icon ${showDeleteConfirm ? 'text-red-400' : ''}`}
            style={showDeleteConfirm ? { background: 'rgba(239,68,68,0.1)' } : {}}
            title={showDeleteConfirm ? 'Clique novamente para confirmar' : 'Excluir'}
          >
            <Trash2 className="w-4 h-4" />
            {showDeleteConfirm && (
              <span className="text-xs font-medium text-red-400">Confirmar?</span>
            )}
          </button>
        </div>
      </div>
      {showWAPreview && (
        <WhatsAppPreview content={template.content} name={template.name} onClose={() => setShowWAPreview(false)} />
      )}
    </div>
  );
}
