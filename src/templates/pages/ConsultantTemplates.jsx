import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send, Eye, Lightbulb, CheckCircle, XCircle,
  Clock, ChevronDown, ChevronUp, Clipboard, Bell,
  MessageSquare, Inbox, FileText, Search, Tag,
  Smartphone, Filter,
} from 'lucide-react';
import { useSuggestions } from '../context/SuggestionContext';
import { useTemplates } from '../context/TemplateContext';
import { formatDate, truncateText, computeStatus } from '../utils/helpers';
import WhatsAppPreview from '../components/WhatsAppPreview';

const statusLabels = {
  pending: { label: 'Aguardando Análise', bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400', icon: Clock },
  approved: { label: 'Aprovado', bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', icon: CheckCircle },
  rejected: { label: 'Não Aprovado', bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400', icon: XCircle },
};

const emptyForm = {
  name: '', content: '', type: 'marketing', expiryDate: '',
  permanent: false, tags: '', notes: '',
  usageRecommendation: '', category: '',
};

/* ─── Card de Template da Empresa (readonly para consultor) ─── */
function CompanyTemplateCard({ template }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showWAPreview, setShowWAPreview] = useState(false);
  const status = computeStatus(template);

  const statusColors = {
    active: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Ativo' },
    expiring: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Vencendo' },
    expired: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Vencido' },
    updating: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Atualizando' },
  };

  const sc = statusColors[status] || statusColors.active;

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(template.content); } catch {
      const ta = document.createElement('textarea'); ta.value = template.content;
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const borderColors = { active: 'border-l-emerald-500', expiring: 'border-l-amber-500', expired: 'border-l-red-500', updating: 'border-l-blue-500' };

  return (
    <>
      <div className={`card border-l-4 ${borderColors[status] || 'border-l-emerald-500'}`}>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white mb-1.5">{template.name}</h3>
              <div className="flex items-center flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>
                  {sc.label}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${template.type === 'marketing' ? 'bg-purple-500/10 text-purple-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
                  {template.type === 'marketing' ? 'Marketing' : 'Utility'}
                </span>
                {template.category && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/[0.06] text-slate-400">{template.category}</span>
                )}
              </div>
            </div>
            <span className="text-xs text-slate-500 shrink-0">
              {template.expiryDate ? formatDate(template.expiryDate) : 'Permanente'}
            </span>
          </div>

          {/* Content preview */}
          <div
            className="rounded-xl p-3 mb-3 cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
            onClick={() => setExpanded(!expanded)}
          >
            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
              {expanded ? template.content : truncateText(template.content, 200)}
            </p>
            {(template.content || '').length > 200 && (
              <button className="text-xs text-blue-400 mt-2 inline-flex items-center gap-1 transition">
                {expanded ? <><ChevronUp className="w-3 h-3" /> Recolher</> : <><ChevronDown className="w-3 h-3" /> Ver tudo</>}
              </button>
            )}
          </div>

          {template.tags && template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {template.tags.map((tag) => <span key={tag} className="px-2 py-0.5 bg-white/[0.04] text-slate-500 rounded text-xs">#{tag}</span>)}
            </div>
          )}

          {template.usageRecommendation && (
            <p className="text-xs text-slate-500 mb-3">Uso: {template.usageRecommendation}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
              style={copied
                ? { background: 'rgba(16,185,129,0.15)', color: '#34d399' }
                : { background: 'rgba(59,130,246,0.1)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.15)' }
              }
            >
              {copied ? <><CheckCircle className="w-3.5 h-3.5" /> Copiado!</> : <><Clipboard className="w-3.5 h-3.5" /> Copiar Mensagem</>}
            </button>
            <button
              onClick={() => setShowWAPreview(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
              style={{ background: 'rgba(37,211,102,0.1)', color: '#25d366', border: '1px solid rgba(37,211,102,0.15)' }}
            >
              <Smartphone className="w-3.5 h-3.5" /> Preview WhatsApp
            </button>
          </div>
        </div>
      </div>
      {showWAPreview && (
        <WhatsAppPreview content={template.content} name={template.name} onClose={() => setShowWAPreview(false)} />
      )}
    </>
  );
}

/* ─── Card de Sugestão (histórico) ─── */
function SuggestionHistoryCard({ suggestion }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const config = statusLabels[suggestion.status] || statusLabels.pending;
  const Icon = config.icon;
  const isNew = suggestion.status !== 'pending' && !suggestion.readByUser;

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(suggestion.content); } catch {
      const ta = document.createElement('textarea'); ta.value = suggestion.content;
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const borderColor = suggestion.status === 'approved' ? 'border-l-emerald-500' : suggestion.status === 'rejected' ? 'border-l-red-500' : 'border-l-amber-500';

  return (
    <div className={`card border-l-4 ${borderColor} ${isNew ? 'ring-1 ring-blue-500/30' : ''}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              {isNew && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400">
                  <Bell className="w-3 h-3" /> NOVA RESPOSTA
                </span>
              )}
              <h3 className="font-semibold text-white truncate">{suggestion.name}</h3>
            </div>
            <div className="flex items-center flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
                <Icon className="w-3 h-3" /> {config.label}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${suggestion.type === 'marketing' ? 'bg-purple-500/10 text-purple-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
                {suggestion.type === 'marketing' ? 'Marketing' : 'Utility'}
              </span>
              {suggestion.category && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/[0.06] text-slate-400">{suggestion.category}</span>
              )}
            </div>
          </div>
          <span className="text-xs text-slate-500 shrink-0 whitespace-nowrap">{formatDate(suggestion.submittedAt)}</span>
        </div>

        <div
          className="rounded-xl p-3 mb-3 cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
          onClick={() => setExpanded(!expanded)}
        >
          <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
            {expanded ? suggestion.content : truncateText(suggestion.content, 150)}
          </p>
          {suggestion.content.length > 150 && (
            <button className="text-xs text-blue-400 mt-2 inline-flex items-center gap-1 transition">
              {expanded ? <><ChevronUp className="w-3 h-3" /> Recolher</> : <><ChevronDown className="w-3 h-3" /> Ver tudo</>}
            </button>
          )}
        </div>

        {suggestion.status !== 'pending' && suggestion.reviewFeedback && (
          <div
            className="rounded-xl p-4 mb-3"
            style={{
              background: suggestion.status === 'approved' ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
              border: `1px solid ${suggestion.status === 'approved' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className={`w-4 h-4 ${suggestion.status === 'approved' ? 'text-emerald-400' : 'text-red-400'}`} />
              <span className={`text-xs font-semibold ${suggestion.status === 'approved' ? 'text-emerald-400' : 'text-red-400'}`}>
                Resposta da Supervisão — {formatDate(suggestion.reviewedAt)}
              </span>
            </div>
            <p className={`text-sm ${suggestion.status === 'approved' ? 'text-emerald-300/80' : 'text-red-300/80'}`}>
              {suggestion.reviewFeedback}
            </p>
          </div>
        )}

        {suggestion.status === 'pending' && (
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.1)' }}>
            <p className="text-xs text-amber-400/70">
              <Clock className="w-3 h-3 inline mr-1" />
              Sua sugestão está sendo analisada pela supervisão.
            </p>
          </div>
        )}

        <div className="flex items-center gap-1 pt-3 mt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={handleCopy} className="btn-icon text-xs inline-flex items-center gap-1" title="Copiar conteúdo">
            {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Clipboard className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Componente Principal ─── */
export default function ConsultantTemplates({ userName }) {
  const navigate = useNavigate();
  const { addSuggestion, getSuggestionsByUser, getUnreadCountForUser, markAsReadByUser } = useSuggestions();
  const { templates, loading: templatesLoading } = useTemplates();

  const [form, setForm] = useState(emptyForm);
  const [showPreview, setShowPreview] = useState(false);
  const [showWAPreview, setShowWAPreview] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState('templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const mySuggestions = getSuggestionsByUser(userName);
  const unreadCount = getUnreadCountForUser(userName);

  useEffect(() => {
    if (activeTab === 'history' && unreadCount > 0) {
      markAsReadByUser(userName);
    }
  }, [activeTab, unreadCount, userName, markAsReadByUser]);

  // Filter active templates only (not expired or updating)
  const activeTemplates = useMemo(() => {
    return templates.filter((t) => {
      const s = computeStatus(t);
      return s === 'active' || s === 'expiring';
    });
  }, [templates]);

  const categories = useMemo(() => {
    const cats = new Set(activeTemplates.map((t) => t.category).filter(Boolean));
    return [...cats].sort();
  }, [activeTemplates]);

  const filteredTemplates = useMemo(() => {
    let result = [...activeTemplates];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        (t.content || '').toLowerCase().includes(q) ||
        (t.tags || []).some((tag) => tag.toLowerCase().includes(q)) ||
        (t.category || '').toLowerCase().includes(q)
      );
    }
    if (filterType !== 'all') result = result.filter((t) => t.type === filterType);
    if (filterCategory !== 'all') result = result.filter((t) => t.category === filterCategory);
    return result;
  }, [activeTemplates, searchQuery, filterType, filterCategory]);

  const charCount = form.content.length;

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Nome é obrigatório';
    if (!form.content.trim()) errs.content = 'Conteúdo é obrigatório';
    if (!form.permanent && !form.expiryDate) errs.expiryDate = 'Data de validade é obrigatória';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    await addSuggestion({ ...form, expiryDate: form.permanent ? null : form.expiryDate, submittedBy: userName });
    setSubmitted(true);
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const errBorder = 'border-red-500/50 focus:ring-red-500/20';
  const pending = mySuggestions.filter((s) => s.status === 'pending').length;
  const approvedCount = mySuggestions.filter((s) => s.status === 'approved').length;
  const rejected = mySuggestions.filter((s) => s.status === 'rejected').length;

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 bg-emerald-500/10">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Sugestão Enviada!</h2>
        <p className="text-slate-400 mb-2">Sua sugestão foi recebida e está aguardando análise da supervisão.</p>
        <p className="text-sm text-slate-500 mb-6">Você receberá uma resposta assim que ela for revisada.</p>
        <div className="flex justify-center gap-3">
          <button onClick={() => { setSubmitted(false); setForm(emptyForm); }} className="btn-primary">
            <Lightbulb className="w-4 h-4" /> Enviar outra
          </button>
          <button onClick={() => { setSubmitted(false); setActiveTab('history'); }} className="btn-secondary">
            Ver minhas sugestões
          </button>
        </div>
      </div>
    );
  }

  const tabStyle = (tab) => activeTab === tab
    ? { background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(59,130,246,0.1))', border: '1px solid rgba(59,130,246,0.2)', boxShadow: '0 2px 12px rgba(37,99,235,0.15)' }
    : { background: 'transparent', border: '1px solid transparent' };

  const tabClass = (tab) => `flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Templates</h2>
        <p className="text-sm text-slate-500 mt-1">
          Visualize templates da empresa, sugira novos e acompanhe suas sugestões
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
        <button onClick={() => setActiveTab('templates')} className={tabClass('templates')} style={tabStyle('templates')}>
          <FileText className="w-4 h-4" />
          Templates da Empresa
          {activeTemplates.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none min-w-[18px] text-center bg-white/[0.08] text-slate-400">
              {activeTemplates.length}
            </span>
          )}
        </button>
        <button onClick={() => setActiveTab('suggest')} className={tabClass('suggest')} style={tabStyle('suggest')}>
          <Lightbulb className="w-4 h-4" />
          Sugerir Template
        </button>
        <button onClick={() => setActiveTab('history')} className={tabClass('history')} style={tabStyle('history')}>
          <Clock className="w-4 h-4" />
          Minhas Sugestões
          {unreadCount > 0 && (
            <span
              className="text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none min-w-[18px] text-center animate-pulse"
              style={{ background: 'linear-gradient(135deg, #ef4444, #f87171)', boxShadow: '0 2px 8px rgba(239,68,68,0.4)' }}
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* ═══ Tab: Templates da Empresa ═══ */}
      {activeTab === 'templates' && (
        <>
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10 w-full"
                placeholder="Buscar por nome, conteúdo ou tag..."
              />
            </div>
            <div className="flex gap-2">
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input-field text-sm min-w-[120px]">
                <option value="all">Todos os tipos</option>
                <option value="marketing">Marketing</option>
                <option value="utility">Utility</option>
              </select>
              {categories.length > 0 && (
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="input-field text-sm min-w-[140px]">
                  <option value="all">Todas categorias</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} disponíve{filteredTemplates.length !== 1 ? 'is' : 'l'}
            </p>
            {(searchQuery || filterType !== 'all' || filterCategory !== 'all') && (
              <button
                onClick={() => { setSearchQuery(''); setFilterType('all'); setFilterCategory('all'); }}
                className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer transition"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {templatesLoading ? (
            <div className="card p-12 text-center">
              <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-400">Carregando templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="card p-12 text-center">
              <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">
                {searchQuery || filterType !== 'all' || filterCategory !== 'all'
                  ? 'Nenhum template encontrado com esses filtros'
                  : 'Nenhum template disponível no momento'}
              </p>
              <p className="text-sm text-slate-600 mt-1">
                {searchQuery ? 'Tente buscar com outros termos' : 'Os templates cadastrados pela supervisão aparecerão aqui'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredTemplates.map((t) => <CompanyTemplateCard key={t.id} template={t} />)}
            </div>
          )}
        </>
      )}

      {/* ═══ Tab: Sugerir Template ═══ */}
      {activeTab === 'suggest' && (
        <>
          <div
            className="rounded-xl p-4 flex items-start gap-3"
            style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}
          >
            <Lightbulb className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-300">
              <p className="font-medium mb-1">Como funciona?</p>
              <p className="text-blue-300/70">
                Preencha os dados do template que deseja sugerir. Sua sugestão será enviada para a supervisão,
                que irá analisar e aprovar ou recusar. Você receberá uma resposta com feedback.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="card p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Nome do Template *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className={`input-field ${errors.name ? errBorder : ''}`}
                placeholder="Ex: Promoção Maio - Desconto 30%"
              />
              {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-400">Conteúdo da Mensagem *</label>
                <div className="flex items-center gap-3">
                  <span className={`text-xs ${charCount > 1024 ? 'text-red-400' : 'text-slate-600'}`}>{charCount} caracteres</span>
                  {form.content && (
                    <button
                      type="button"
                      onClick={() => setShowWAPreview(true)}
                      className="text-xs inline-flex items-center gap-1 cursor-pointer transition"
                      style={{ color: '#25d366' }}
                    >
                      <Smartphone className="w-3 h-3" /> WhatsApp
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 cursor-pointer transition"
                  >
                    <Eye className="w-3 h-3" />
                    {showPreview ? 'Editar' : 'Pré-visualizar'}
                  </button>
                </div>
              </div>
              {showPreview ? (
                <div className="input-field min-h-[160px] whitespace-pre-wrap" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  {form.content || <span className="text-slate-600">Sem conteúdo</span>}
                </div>
              ) : (
                <textarea
                  value={form.content}
                  onChange={(e) => updateField('content', e.target.value)}
                  className={`input-field min-h-[160px] resize-y ${errors.content ? errBorder : ''}`}
                  placeholder="Digite o conteúdo da mensagem. Use *negrito*, _itálico_, ~tachado~ e {{variavel}} para campos dinâmicos."
                />
              )}
              {errors.content && <p className="text-xs text-red-400 mt-1">{errors.content}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Tipo de Template *</label>
                <select value={form.type} onChange={(e) => updateField('type', e.target.value)} className="input-field">
                  <option value="marketing">Marketing</option>
                  <option value="utility">Utility</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Categoria</label>
                <input type="text" value={form.category || ''} onChange={(e) => updateField('category', e.target.value)} className="input-field" placeholder="Ex: Vendas, Atendimento" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Validade *</label>
                <select
                  value={form.permanent ? 'permanent' : 'expiry'}
                  onChange={(e) => {
                    const isPermanent = e.target.value === 'permanent';
                    updateField('permanent', isPermanent);
                    if (isPermanent) updateField('expiryDate', '');
                  }}
                  className="input-field"
                >
                  <option value="expiry">Com data de vencimento</option>
                  <option value="permanent">Permanente (sem vencimento)</option>
                </select>
              </div>
              {!form.permanent && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Data de Vencimento *</label>
                  <input type="date" value={form.expiryDate} onChange={(e) => updateField('expiryDate', e.target.value)} className={`input-field ${errors.expiryDate ? errBorder : ''}`} />
                  {errors.expiryDate && <p className="text-xs text-red-400 mt-1">{errors.expiryDate}</p>}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Tags</label>
              <input type="text" value={form.tags} onChange={(e) => updateField('tags', e.target.value)} className="input-field" placeholder="Separe por vírgulas: promoção, desconto" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Uso Recomendado</label>
              <input type="text" value={form.usageRecommendation || ''} onChange={(e) => updateField('usageRecommendation', e.target.value)} className="input-field" placeholder="Ex: WhatsApp Business" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Justificativa / Observações</label>
              <textarea value={form.notes || ''} onChange={(e) => updateField('notes', e.target.value)} className="input-field min-h-[80px] resize-y" placeholder="Explique por que este template seria útil para a equipe..." />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                type="submit"
                className="btn-primary"
                style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 4px 20px rgba(16,185,129,0.3)' }}
              >
                <Send className="w-4 h-4" /> Enviar Sugestão
              </button>
            </div>
          </form>
        </>
      )}

      {/* ═══ Tab: Minhas Sugestões ═══ */}
      {activeTab === 'history' && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <p className="text-2xl font-bold text-white">{pending}</p>
              </div>
              <p className="text-xs text-slate-500 mt-1">Aguardando</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <p className="text-2xl font-bold text-white">{approvedCount}</p>
              </div>
              <p className="text-xs text-slate-500 mt-1">Aprovados</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400" />
                <p className="text-2xl font-bold text-white">{rejected}</p>
              </div>
              <p className="text-xs text-slate-500 mt-1">Não Aprovados</p>
            </div>
          </div>

          {mySuggestions.length === 0 ? (
            <div className="card p-12 text-center">
              <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Nenhuma sugestão enviada</p>
              <p className="text-sm text-slate-600 mt-1">Envie sua primeira sugestão clicando em "Sugerir Template"</p>
            </div>
          ) : (
            <div className="space-y-4">
              {mySuggestions.map((s) => <SuggestionHistoryCard key={s.id} suggestion={s} />)}
            </div>
          )}
        </>
      )}

      {/* WhatsApp Preview Modal (form) */}
      {showWAPreview && (
        <WhatsAppPreview content={form.content} name={form.name || 'Nova Sugestão'} onClose={() => setShowWAPreview(false)} />
      )}
    </div>
  );
}
