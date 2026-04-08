import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Eye, Smartphone } from 'lucide-react';
import { useTemplates } from '../context/TemplateContext';
import WhatsAppPreview from '../components/WhatsAppPreview';

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
};

export default function TemplateForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { templates, addTemplate, updateTemplate } = useTemplates();
  const isEditing = Boolean(id);

  const [form, setForm] = useState(emptyForm);
  const [showPreview, setShowPreview] = useState(false);
  const [showWAPreview, setShowWAPreview] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEditing) {
      const found = templates.find((t) => String(t.id) === id);
      if (found) {
        setForm({
          ...found,
          tags: Array.isArray(found.tags) ? found.tags.join(', ') : found.tags || '',
          permanent: !found.expiryDate,
        });
      } else {
        navigate('/templates-hub/list');
      }
    }
  }, [id, isEditing, templates, navigate]);

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

    const data = {
      ...form,
      expiryDate: form.permanent ? null : form.expiryDate,
      tags: form.tags
        ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
    };

    if (isEditing) {
      await updateTemplate(Number(id), data);
      navigate(`/templates-hub/${id}`);
    } else {
      const newId = await addTemplate(data);
      if (newId) navigate(`/templates-hub/${newId}`);
    }
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const errBorder = 'border-red-500/50 focus:ring-red-500/20';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-icon">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">
            {isEditing ? 'Editar Template' : 'Novo Template'}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {isEditing ? 'Atualize as informações do template' : 'Preencha os dados para criar um novo template'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">
            Nome do Template *
          </label>
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
            <label className="block text-sm font-medium text-slate-400">
              Conteúdo da Mensagem *
            </label>
            <div className="flex items-center gap-3">
              <span className={`text-xs ${charCount > 1024 ? 'text-red-400' : 'text-slate-600'}`}>
                {charCount} caracteres
              </span>
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
              placeholder="Digite o conteúdo da mensagem. Use {{variavel}} para campos dinâmicos."
            />
          )}
          {errors.content && <p className="text-xs text-red-400 mt-1">{errors.content}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">
              Tipo de Template *
            </label>
            <select
              value={form.type}
              onChange={(e) => updateField('type', e.target.value)}
              className="input-field"
            >
              <option value="marketing">Marketing</option>
              <option value="utility">Utility</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">
              Categoria
            </label>
            <input
              type="text"
              value={form.category || ''}
              onChange={(e) => updateField('category', e.target.value)}
              className="input-field"
              placeholder="Ex: Vendas, Atendimento, Financeiro"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">
              Validade *
            </label>
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
              <label className="block text-sm font-medium text-slate-400 mb-1.5">
                Data de Vencimento *
              </label>
              <input
                type="date"
                value={form.expiryDate}
                onChange={(e) => updateField('expiryDate', e.target.value)}
                className={`input-field ${errors.expiryDate ? errBorder : ''}`}
              />
              {errors.expiryDate && <p className="text-xs text-red-400 mt-1">{errors.expiryDate}</p>}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">
            Palavras-chave / Tags
          </label>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => updateField('tags', e.target.value)}
            className="input-field"
            placeholder="Separe por vírgulas: promoção, desconto, maio"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">
            Uso Recomendado
          </label>
          <input
            type="text"
            value={form.usageRecommendation || ''}
            onChange={(e) => updateField('usageRecommendation', e.target.value)}
            className="input-field"
            placeholder="Ex: WhatsApp Business - Campanhas de vendas mensais"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">
            Observações Internas
          </label>
          <textarea
            value={form.notes || ''}
            onChange={(e) => updateField('notes', e.target.value)}
            className="input-field min-h-[80px] resize-y"
            placeholder="Anotações internas sobre este template..."
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button type="submit" className="btn-primary">
            <Save className="w-4 h-4" />
            {isEditing ? 'Salvar Alterações' : 'Criar Template'}
          </button>
        </div>
      </form>

      {showWAPreview && (
        <WhatsAppPreview content={form.content} name={form.name || 'Novo Template'} onClose={() => setShowWAPreview(false)} />
      )}
    </div>
  );
}
