import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Edit3, Trash2, Eye, EyeOff, Loader2,
  AlertCircle, Clock, BookOpen, RefreshCw,
} from 'lucide-react';
import { fetchAllPosts, deletePost, togglePublished, type BlogPost } from '../services/blogService';

export default function BlogAdminPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAllPosts();
      setPosts(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (post: BlogPost) => {
    if (!confirm(`Tem certeza que deseja excluir "${post.title}"?`)) return;
    setDeleting(post.id);
    try {
      await deletePost(post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } catch (e: any) {
      alert(`Erro ao excluir: ${e.message}`);
    } finally {
      setDeleting(null);
    }
  };

  const handleTogglePublish = async (post: BlogPost) => {
    setToggling(post.id);
    try {
      const updated = await togglePublished(post.id, !post.published);
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    } finally {
      setToggling(null);
    }
  };

  const filtered = posts.filter((post) => {
    const matchesSearch =
      search.trim() === '' ||
      post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.category.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'published' && post.published) ||
      (filterStatus === 'draft' && !post.published);
    return matchesSearch && matchesStatus;
  });

  const publishedCount = posts.filter((p) => p.published).length;
  const draftCount = posts.filter((p) => !p.published).length;

  return (
    <div className="min-h-screen py-8 px-6" style={{ background: 'linear-gradient(135deg, #0c1222 0%, #111a2e 50%, #0f1628 100%)' }}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <BookOpen className="h-7 w-7 text-orange-500" />
              Blog Controle
            </h1>
            <p className="text-sm text-slate-400 mt-1">Gerencie os artigos do blog público</p>
          </div>
          <button
            onClick={() => navigate('/blog-controle/novo')}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo Artigo
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total', value: posts.length, color: 'text-white' },
            { label: 'Publicados', value: publishedCount, color: 'text-green-400' },
            { label: 'Rascunhos', value: draftCount, color: 'text-yellow-400' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/[0.1] bg-[#161b22] p-5">
              <p className="text-sm font-medium text-slate-400">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-white/[0.1] bg-[#161b22] p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título ou categoria..."
                className="w-full pl-10 pr-4 py-2.5 border border-white/[0.1] bg-white/5 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'published', 'draft'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    filterStatus === status
                      ? 'bg-orange-600 text-white'
                      : 'bg-white/5 text-slate-400 border border-white/[0.1] hover:text-white'
                  }`}
                >
                  {status === 'all' ? 'Todos' : status === 'published' ? 'Publicados' : 'Rascunhos'}
                </button>
              ))}
              <button
                onClick={load}
                className="px-3 py-2.5 text-sm rounded-lg bg-white/5 text-slate-400 border border-white/[0.1] hover:text-white transition-colors"
                title="Recarregar"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <p className="text-sm text-slate-400">Carregando artigos...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-400">
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm">{error}</p>
            <button onClick={load} className="text-sm text-orange-500 underline">Tentar novamente</button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <BookOpen className="h-10 w-10 text-slate-600" />
            <p className="text-slate-400 text-sm">
              {posts.length === 0 ? 'Nenhum artigo criado ainda.' : 'Nenhum artigo encontrado para o filtro.'}
            </p>
            {posts.length === 0 && (
              <button
                onClick={() => navigate('/blog-controle/novo')}
                className="mt-2 inline-flex items-center gap-2 text-sm text-orange-500 font-semibold hover:underline"
              >
                <Plus className="h-4 w-4" /> Criar primeiro artigo
              </button>
            )}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((post) => (
              <div
                key={post.id}
                className="rounded-xl border border-white/[0.1] bg-[#161b22] p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-white/[0.2] transition-colors"
              >
                {post.cover_image && (
                  <img
                    src={post.cover_image}
                    alt={post.title}
                    className="w-full sm:w-28 h-20 object-cover rounded-lg flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${
                        post.published
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {post.published ? 'Publicado' : 'Rascunho'}
                    </span>
                    <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                      {post.category}
                    </span>
                  </div>
                  <h3 className="font-semibold text-white truncate">{post.title}</h3>
                  <p className="text-sm text-slate-400 truncate">{post.excerpt}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {post.read_time} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {post.views} views
                    </span>
                    <span>{new Date(post.created_at).toLocaleDateString('pt-BR')}</span>
                    <span>por {post.author_name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleTogglePublish(post)}
                    disabled={toggling === post.id}
                    className={`p-2 rounded-lg transition-colors ${
                      post.published
                        ? 'text-yellow-400 hover:bg-yellow-500/10'
                        : 'text-green-400 hover:bg-green-500/10'
                    }`}
                    title={post.published ? 'Despublicar' : 'Publicar'}
                  >
                    {toggling === post.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : post.published ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => navigate(`/blog-controle/editar/${post.slug}`)}
                    className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"
                    title="Editar"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(post)}
                    disabled={deleting === post.id}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Excluir"
                  >
                    {deleting === post.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
