import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, Eye, Loader2, Image, Tag, Clock, User, BookOpen, Calendar, ImageOff,
  Bold, Italic, Heading2, Heading3, List, ListOrdered, Link2, Quote, Code, Minus,
} from 'lucide-react';
import {
  createPost, updatePost, fetchPostBySlug,
  type BlogPost, type BlogPostInsert,
} from '../services/blogService';
import { renderBlogMarkdown, normalizeMarkdown, BLOG_CONTENT_CLASS, installBrokenImageFallback } from '../lib/markdown';

const CATEGORIES = ['Administração', 'Concursos', 'Direito', 'Gestão', 'Tecnologia', 'Educação', 'Geral'];

type PublishMode = 'draft' | 'now' | 'scheduled';

interface FormData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  author_name: string;
  author_avatar: string;
  category: string;
  tags: string;
  read_time: number;
  publishMode: PublishMode;
  scheduledDate: string;
  scheduledTime: string;
}

const emptyForm: FormData = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  cover_image: '',
  author_name: 'Equipe Editorial',
  author_avatar: '',
  category: 'Geral',
  tags: '',
  read_time: 5,
  publishMode: 'draft',
  scheduledDate: '',
  scheduledTime: '',
};

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getDefaultScheduleDate() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 30);
  return d.toISOString().slice(0, 10);
}

function getDefaultScheduleTime() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 30);
  return d.toTimeString().slice(0, 5);
}

interface MarkdownEditorProps {
  value: string;
  onChange: (v: string) => void;
}

function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const wrap = useCallback((before: string, after: string) => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    const replacement = `${before}${selected || 'texto'}${after}`;
    const next = value.slice(0, start) + replacement + value.slice(end);
    onChange(next);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + (selected || 'texto').length);
    }, 0);
  }, [value, onChange]);

  const insertLine = useCallback((prefix: string) => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(next);
    setTimeout(() => { ta.focus(); }, 0);
  }, [value, onChange]);

  const tools = [
    { icon: Bold, label: 'Negrito', action: () => wrap('**', '**') },
    { icon: Italic, label: 'Itálico', action: () => wrap('_', '_') },
    { icon: null, label: 'sep1', action: () => {} },
    { icon: Heading2, label: 'Título H2', action: () => insertLine('## ') },
    { icon: Heading3, label: 'Subtítulo H3', action: () => insertLine('### ') },
    { icon: null, label: 'sep2', action: () => {} },
    { icon: List, label: 'Lista', action: () => insertLine('- ') },
    { icon: ListOrdered, label: 'Lista numerada', action: () => insertLine('1. ') },
    { icon: Quote, label: 'Citação', action: () => insertLine('> ') },
    { icon: null, label: 'sep3', action: () => {} },
    { icon: Link2, label: 'Link', action: () => wrap('[', '](url)') },
    { icon: Image, label: 'Imagem', action: () => wrap('![alt](', ')') },
    { icon: Code, label: 'Código', action: () => wrap('`', '`') },
    { icon: Minus, label: 'Linha horizontal', action: () => { onChange(value + '\n\n---\n\n'); } },
  ];

  return (
    <div className="border border-white/[0.1] rounded-lg overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-white/[0.03] border-b border-white/[0.1]">
        {tools.map((tool, i) => {
          if (!tool.icon) return <div key={tool.label} className="w-px h-5 bg-white/10 mx-1" />;
          const Icon = tool.icon;
          return (
            <button
              key={i}
              type="button"
              onClick={tool.action}
              title={tool.label}
              className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={20}
        placeholder={"## Título da seção\n\nEscreva seu artigo aqui...\n\n**negrito**, _itálico_, [link](url)\n\n- Item de lista\n1. Item numerado\n\n> Citação"}
        className="w-full px-4 py-3 bg-white/5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none resize-y"
      />
    </div>
  );
}

export default function BlogCreatePage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const isEditing = !!slug;

  const [form, setForm] = useState<FormData>(emptyForm);
  const [existingPost, setExistingPost] = useState<BlogPost | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingPost, setLoadingPost] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const [sidebarCoverFailed, setSidebarCoverFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [sidebarAvatarFailed, setSidebarAvatarFailed] = useState(false);
  const previewContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) return;
    setLoadingPost(true);
    fetchPostBySlug(slug)
      .then((post) => {
        if (post) {
          setExistingPost(post);
          setForm({
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            content: post.content,
            cover_image: post.cover_image,
            author_name: post.author_name,
            author_avatar: post.author_avatar,
            category: post.category,
            tags: (post.tags || []).join(', '),
            read_time: post.read_time,
            publishMode: post.published ? 'now' : 'draft',
            scheduledDate: '',
            scheduledTime: '',
          });
        } else {
          setError('Artigo não encontrado.');
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingPost(false));
  }, [slug]);

  useEffect(() => {
    setCoverFailed(false);
    setSidebarCoverFailed(false);
  }, [form.cover_image]);

  useEffect(() => {
    setAvatarFailed(false);
    setSidebarAvatarFailed(false);
  }, [form.author_avatar]);

  useEffect(() => {
    if (showPreview) installBrokenImageFallback(previewContentRef.current);
  }, [showPreview, form.content]);

  const handleChange = (field: keyof FormData, value: string | number) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'title' && !isEditing) {
        updated.slug = generateSlug(value as string);
      }
      if (field === 'publishMode' && value === 'scheduled') {
        if (!updated.scheduledDate) updated.scheduledDate = getDefaultScheduleDate();
        if (!updated.scheduledTime) updated.scheduledTime = getDefaultScheduleTime();
      }
      return updated;
    });
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.slug.trim() || !form.excerpt.trim() || !form.content.trim()) {
      setError('Preencha título, slug, resumo e conteúdo.');
      return;
    }

    if (form.publishMode === 'scheduled' && (!form.scheduledDate || !form.scheduledTime)) {
      setError('Preencha a data e hora do agendamento.');
      return;
    }

    setSaving(true);
    setError('');

    const isPublishNow = form.publishMode === 'now';
    const isScheduled = form.publishMode === 'scheduled';

    const data: BlogPostInsert & { created_at?: string } = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      excerpt: form.excerpt.trim(),
      content: normalizeMarkdown(form.content),
      cover_image: form.cover_image.trim(),
      author_name: form.author_name.trim() || 'Equipe Editorial',
      author_avatar: form.author_avatar.trim(),
      category: form.category,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      read_time: form.read_time || 5,
      published: isPublishNow || isScheduled,
    };

    if (isScheduled) {
      data.created_at = new Date(`${form.scheduledDate}T${form.scheduledTime}:00`).toISOString();
    }

    try {
      if (isEditing && existingPost) {
        await updatePost(existingPost.id, data);
      } else {
        await createPost(data);
      }
      navigate('/blog-controle');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingPost) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: '#0c1222' }}>
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <p className="text-sm text-slate-400">Carregando artigo...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-6" style={{ background: 'linear-gradient(135deg, #0c1222 0%, #111a2e 50%, #0f1628 100%)' }}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/blog-controle')}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {isEditing ? 'Editar Artigo' : 'Novo Artigo'}
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                {isEditing ? 'Atualize as informações do artigo' : 'Preencha os campos para criar um novo artigo'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors"
            >
              <Eye className="h-4 w-4" />
              {showPreview ? 'Editor' : 'Preview'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {form.publishMode === 'draft' ? 'Salvar Rascunho' : form.publishMode === 'scheduled' ? 'Agendar' : 'Publicar'}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {showPreview ? (
          /* Preview — fiel ao site público */
          <div className="rounded-xl border border-white/[0.1] overflow-hidden">
            {/* Hero escuro */}
            <div className="bg-gray-900 px-8 py-10">
              <div className="max-w-3xl">
                <span className="inline-block px-3 py-1 bg-orange-600 text-white text-xs font-bold tracking-widest uppercase mb-4">
                  {form.category}
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-4">
                  {form.title || 'Título do artigo'}
                </h1>
                <p className="text-gray-400 text-lg leading-relaxed mb-6">{form.excerpt || 'Resumo do artigo...'}</p>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    {form.author_avatar && !avatarFailed ? (
                      <img
                        src={form.author_avatar}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-white/20"
                        onError={() => setAvatarFailed(true)}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-slate-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-white text-sm">{form.author_name || 'Autor'}</p>
                      <p className="text-xs text-gray-500">Autor</p>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-white/10" />
                  <span className="flex items-center gap-1 text-gray-400 text-xs"><Clock className="h-3 w-3" />{form.read_time} min de leitura</span>
                  {form.tags && (
                    <span className="flex items-center gap-1 text-gray-400 text-xs"><Tag className="h-3 w-3" />{form.tags}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="h-0.5 bg-gradient-to-r from-transparent via-orange-600 to-transparent" />

            {/* Imagem de capa — sem cortar */}
            {form.cover_image && !coverFailed && (
              <div className="bg-gray-50">
                <div className="max-w-5xl mx-auto px-8">
                  <img
                    src={form.cover_image}
                    alt="Capa"
                    className="w-full object-contain max-h-[500px] shadow-lg"
                    onError={() => setCoverFailed(true)}
                  />
                </div>
              </div>
            )}
            {form.cover_image && coverFailed && (
              <div className="bg-gray-50">
                <div className="max-w-5xl mx-auto px-8">
                  <div className="flex flex-col items-center justify-center gap-2 bg-white border-2 border-dashed border-gray-200 py-16 text-gray-400">
                    <ImageOff className="h-10 w-10" />
                    <span className="text-sm">Imagem de capa não disponível (URL retornou erro)</span>
                    <span className="text-xs text-gray-400 break-all max-w-xl text-center px-4">{form.cover_image}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo */}
            <div className="bg-gray-50 px-8 py-10">
              <div className="flex gap-10">
                <div className="flex-1 bg-white shadow-sm border border-gray-100 p-8">
                  <div
                    ref={previewContentRef}
                    className={BLOG_CONTENT_CLASS}
                    dangerouslySetInnerHTML={{ __html: form.content ? renderBlogMarkdown(form.content) : '<p style="color:#999">Conteúdo do artigo aparecerá aqui...</p>' }}
                  />
                  {form.tags && (
                    <div className="mt-8 pt-6 border-t border-gray-100">
                      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-3">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {form.tags.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
                          <span key={tag} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-sm">
                            <Tag className="h-3 w-3" />{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="w-64 flex-shrink-0 space-y-4 hidden lg:block">
                  <div className="bg-white shadow-sm border border-gray-100 p-6 text-center">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-4 rounded-full bg-orange-600" />
                      <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Sobre o Autor</h3>
                    </div>
                    {form.author_avatar && !sidebarAvatarFailed && (
                      <img
                        src={form.author_avatar}
                        alt=""
                        className="w-16 h-16 rounded-full object-cover mx-auto mb-3 ring-4 ring-gray-100"
                        onError={() => setSidebarAvatarFailed(true)}
                      />
                    )}
                    <p className="font-bold text-gray-900 text-sm">{form.author_name || 'Autor'}</p>
                  </div>
                  <div className="bg-orange-600 p-6 text-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="h-4 w-4 text-orange-200" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Detalhes</h3>
                    </div>
                    <dl className="space-y-2">
                      <div className="flex justify-between"><dt className="text-orange-200 text-xs">Categoria</dt><dd className="font-bold text-white text-xs">{form.category}</dd></div>
                      <div className="h-px bg-orange-800/40" />
                      <div className="flex justify-between"><dt className="text-orange-200 text-xs">Leitura</dt><dd className="font-bold text-white text-xs">{form.read_time} min</dd></div>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Editor Mode */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-5">
              <div className="rounded-xl border border-white/[0.1] bg-[#161b22] p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">Título *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="Digite o título do artigo"
                    className="w-full px-4 py-3 border border-white/[0.1] bg-white/5 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">Slug (URL) *</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">/blog/</span>
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(e) => handleChange('slug', e.target.value)}
                      placeholder="titulo-do-artigo"
                      className="flex-1 px-4 py-3 border border-white/[0.1] bg-white/5 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">Resumo *</label>
                  <textarea
                    value={form.excerpt}
                    onChange={(e) => handleChange('excerpt', e.target.value)}
                    rows={3}
                    placeholder="Breve descrição do artigo (aparece nos cards)"
                    className="w-full px-4 py-3 border border-white/[0.1] bg-white/5 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">Conteúdo (Markdown) *</label>
                  <MarkdownEditor
                    value={form.content}
                    onChange={(v) => handleChange('content', v)}
                  />
                </div>
              </div>
            </div>

            {/* Sidebar settings */}
            <div className="space-y-5">
              {/* Publicação / Agendamento */}
              <div className="rounded-xl border border-white/[0.1] bg-[#161b22] p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  Publicação
                </h3>

                <div className="space-y-2">
                  {([
                    { value: 'draft', label: 'Salvar como rascunho', desc: 'Não será visível no blog' },
                    { value: 'now', label: 'Publicar agora', desc: 'Visível imediatamente' },
                    { value: 'scheduled', label: 'Agendar publicação', desc: 'Escolha data e hora' },
                  ] as const).map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
                        form.publishMode === opt.value
                          ? 'border-orange-500/50 bg-orange-500/10'
                          : 'border-white/[0.05] hover:bg-white/5'
                      }`}
                    >
                      <input
                        type="radio"
                        name="publishMode"
                        value={opt.value}
                        checked={form.publishMode === opt.value}
                        onChange={() => handleChange('publishMode', opt.value)}
                        className="mt-0.5 h-4 w-4 text-orange-600 focus:ring-orange-500 bg-transparent border-slate-600"
                      />
                      <div>
                        <p className="text-sm font-medium text-white">{opt.label}</p>
                        <p className="text-xs text-slate-500">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {form.publishMode === 'scheduled' && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Data</label>
                      <input
                        type="date"
                        value={form.scheduledDate}
                        onChange={(e) => handleChange('scheduledDate', e.target.value)}
                        className="w-full px-4 py-2.5 border border-white/[0.1] bg-white/5 rounded-lg text-sm text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Hora</label>
                      <input
                        type="time"
                        value={form.scheduledTime}
                        onChange={(e) => handleChange('scheduledTime', e.target.value)}
                        className="w-full px-4 py-2.5 border border-white/[0.1] bg-white/5 rounded-lg text-sm text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    {form.scheduledDate && form.scheduledTime && (
                      <p className="text-xs text-orange-400">
                        Será publicado em {new Date(`${form.scheduledDate}T${form.scheduledTime}`).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Configurações */}
              <div className="rounded-xl border border-white/[0.1] bg-[#161b22] p-6 space-y-5">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Configurações</h3>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">Categoria *</label>
                  <select
                    value={form.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    className="w-full px-4 py-3 border border-white/[0.1] bg-white/5 rounded-lg text-sm text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-gray-900">{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                    <Tag className="inline h-3.5 w-3.5 mr-1" />Tags
                  </label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={(e) => handleChange('tags', e.target.value)}
                    placeholder="Separadas por vírgula"
                    className="w-full px-4 py-3 border border-white/[0.1] bg-white/5 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                    <Clock className="inline h-3.5 w-3.5 mr-1" />Tempo de leitura (min)
                  </label>
                  <input
                    type="number"
                    value={form.read_time}
                    onChange={(e) => handleChange('read_time', parseInt(e.target.value) || 1)}
                    min={1}
                    className="w-full px-4 py-3 border border-white/[0.1] bg-white/5 rounded-lg text-sm text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Mídia & Autor */}
              <div className="rounded-xl border border-white/[0.1] bg-[#161b22] p-6 space-y-5">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Mídia & Autor</h3>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                    <Image className="inline h-3.5 w-3.5 mr-1" />URL da imagem de capa
                  </label>
                  <input
                    type="url"
                    value={form.cover_image}
                    onChange={(e) => handleChange('cover_image', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-3 border border-white/[0.1] bg-white/5 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  {form.cover_image && !sidebarCoverFailed && (
                    <img
                      src={form.cover_image}
                      alt="Preview"
                      className="mt-2 w-full rounded-lg object-contain max-h-40 bg-black/20"
                      onError={() => setSidebarCoverFailed(true)}
                    />
                  )}
                  {form.cover_image && sidebarCoverFailed && (
                    <div className="mt-2 flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-red-500/30 bg-red-500/10 py-6 text-red-300">
                      <ImageOff className="h-6 w-6" />
                      <span className="text-xs font-medium">URL não carregou (verifique se a imagem existe)</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                    <User className="inline h-3.5 w-3.5 mr-1" />Nome do autor
                  </label>
                  <input
                    type="text"
                    value={form.author_name}
                    onChange={(e) => handleChange('author_name', e.target.value)}
                    placeholder="Nome do autor"
                    className="w-full px-4 py-3 border border-white/[0.1] bg-white/5 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">URL do avatar do autor</label>
                  <input
                    type="url"
                    value={form.author_avatar}
                    onChange={(e) => handleChange('author_avatar', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-3 border border-white/[0.1] bg-white/5 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
