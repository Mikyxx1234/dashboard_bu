import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Eye, Lightbulb, CheckCircle } from 'lucide-react';
import { useSuggestions } from '../context/SuggestionContext';

const emptyForm = {
  name: '',
  content: '',
  type: 'marketing',
  expiryDate: '',
  permanent: false,
  tags: '',
  notes: '',
  usageRecommendation: '',
  category: '',
  submittedBy: '',
};

export default function SuggestTemplate() {
  const navigate = useNavigate();
  const { addSuggestion } = useSuggestions();
  const [form, setForm] = useState(emptyForm);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const charCount = form.content.length;

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Nome é obrigatório';
    if (!form.content.trim()) errs.content = 'Conteúdo é obrigatório';
    if (!form.permanent && !form.expiryDate) errs.expiryDate = 'Data de validade é obrigatória';
    if (!form.submittedBy.trim()) errs.submittedBy = 'Seu nome é obrigatório';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    await addSuggestion({ ...form, expiryDate: form.permanent ? null : form.expiryDate });
    setSubmitted(true);
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const errBorder = 'border-red-500/50 focus:ring-red-500/20';

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 bg-emerald-500/10">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Sugestão Enviada!</h2>
        <p className="text-slate-400 mb-6">
          Sua sugestão de template foi recebida com sucesso e está aguardando aprovação.
        </p>
        <div className="flex justify-center gap-3">
          <button onClick={() => { setSubmitted(false); setForm(emptyForm); }} className="btn-primary">
            <Lightbulb className="w-4 h-4" />
            Enviar outra sugestão
          </button>
          <button onClick={() => navigate('/templates-hub')} className="btn-secondary">
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-icon">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">Sugerir Template</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Envie uma sugestão de template para aprovação da equipe
          </p>
        </div>
      </div>

      <div
        className="rounded-xl p-4 flex items-start gap-3"
        style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}
      >
        <Lightbulb className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-300">
          <p className="font-medium mb-1">Como funciona?</p>
          <p className="text-blue-300/70">
            Preencha os dados do template que deseja sugerir. Sua sugestão ficará em uma fila de
            aprovação e será revisada pela equipe responsável.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">Seu Nome *</label>
          <input
            type="text"
            value={form.submittedBy}
            onChange={(e) => updateField('submittedBy', e.target.value)}
            className={`input-field ${errors.submittedBy ? errBorder : ''}`}
            placeholder="Digite seu nome completo"
          />
          {errors.submittedBy && <p className="text-xs text-red-400 mt-1">{errors.submittedBy}</p>}
        </div>

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
              placeholder="Digite o conteúdo da mensagem. Use *negrito*, _itálico_ e {{variavel}} para campos dinâmicos."
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
          <label className="block text-sm font-medium text-slate-400 mb-1.5">Observações / Justificativa</label>
          <textarea value={form.notes || ''} onChange={(e) => updateField('notes', e.target.value)} className="input-field min-h-[80px] resize-y" placeholder="Explique por que este template seria útil..." />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancelar</button>
          <button
            type="submit"
            className="btn-primary"
            style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 4px 20px rgba(16,185,129,0.3)' }}
          >
            <Send className="w-4 h-4" />
            Enviar Sugestão
          </button>
        </div>
      </form>
    </div>
  );
}
