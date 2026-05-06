import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Eye, EyeOff, Check, TrendingUp, Bell, CalendarDays, AlertTriangle, ChevronDown, User } from 'lucide-react';
import { useAuth, fetchConsultantNames } from '../contexts/AuthContext';

// Dropdown customizado para evitar o fundo branco do select nativo
function ConsultorDropdown({
  names,
  value,
  onChange,
}: {
  names: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const selected = names.find((n) => n === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-all ${
          open
            ? 'border-blue-500/60 bg-white/[0.07] ring-2 ring-blue-500/20'
            : 'border-white/8 bg-white/[0.04] hover:bg-white/[0.06]'
        }`}
      >
        <User className="h-4 w-4 flex-shrink-0 text-gray-500" />
        <span className={`flex-1 text-left ${selected ? 'text-white' : 'text-gray-600'}`}>
          {selected ?? 'Selecione seu nome'}
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-white/10 bg-[#131f35] py-1">
          {names.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => { onChange(name); setOpen(false); }}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                name === value
                  ? 'bg-blue-600/30 text-blue-200'
                  : 'text-gray-300 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                name === value ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-400'
              }`}>
                {name.charAt(0).toUpperCase()}
              </div>
              {name}
              {name === value && <Check className="ml-auto h-3.5 w-3.5 text-blue-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const FEATURES = [
  { icon: TrendingUp,    text: 'Leads e metas atualizados em tempo real' },
  { icon: Bell,          text: 'Mural de avisos e comunicados da equipe' },
  { icon: CalendarDays,  text: 'Calendário acadêmico integrado' },
  { icon: AlertTriangle, text: 'Monitoramento de leads parados' },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [names, setNames] = useState<string[]>([]);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    fetchConsultantNames().then(setNames);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !password) {
      setError('Selecione o consultor e digite a senha.');
      return;
    }
    setLoading(true);
    setError('');
    const ok = await login(selected, password);
    setLoading(false);
    if (ok) {
      navigate('/', { replace: true });
    } else {
      setError('Consultor ou senha inválidos.');
    }
  };

  return (
    <div className="flex min-h-screen">

      {/* ── Painel esquerdo — branding ──────────────────────── */}
      <div
        className="relative hidden flex-col overflow-hidden lg:flex lg:w-[52%]"
        style={{ background: 'linear-gradient(145deg, #0b1629 0%, #102040 45%, #0d1e3c 100%)' }}
      >
        {/* Grade de pontos decorativa */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Brilhos difusos de fundo */}
        <div className="absolute left-[-80px] top-[-80px] h-80 w-80 rounded-full bg-blue-600/20 blur-[80px]" />
        <div className="absolute bottom-[-60px] right-[-60px] h-64 w-64 rounded-full bg-purple-600/15 blur-[70px]" />
        <div className="absolute bottom-1/3 left-1/3 h-48 w-48 rounded-full bg-blue-400/10 blur-[60px]" />

        {/* Conteúdo do painel esquerdo */}
        <div className="relative flex h-full flex-col justify-between p-12">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Dashboard BU</span>
          </div>

          {/* Texto principal */}
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-400">
              Painel Interno
            </p>
            <h2 className="mb-5 text-4xl font-bold leading-tight text-white">
              Dados em tempo real<br />para sua equipe.
            </h2>
            <p className="mb-8 max-w-xs text-[15px] leading-relaxed text-blue-100/50">
              Acompanhe performance, metas e comunicados das bandeiras Anhanguera e Sumaré em um único lugar.
            </p>

            {/* Selos das bandeiras */}
            <div className="mb-10 flex gap-3">
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3">
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-blue-400">
                  Anhanguera
                </p>
                <p className="text-sm font-semibold text-white">Comercial & Acadêmico</p>
              </div>
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 px-4 py-3">
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-purple-400">
                  Sumaré
                </p>
                <p className="text-sm font-semibold text-white">Comercial & Acadêmico</p>
              </div>
            </div>

            {/* Lista de funcionalidades */}
            <div className="space-y-3">
              {FEATURES.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
                    <Icon className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                  <span className="text-sm text-blue-100/60">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rodapé do painel esquerdo */}
          <p className="text-xs text-blue-100/25">
            © 2026 Dashboard BU — Uso interno
          </p>
        </div>
      </div>

      {/* ── Painel direito — formulário ─────────────────────── */}
      <div
        className="flex flex-1 flex-col items-center justify-center p-8"
        style={{ background: '#0a1120' }}
      >
        {/* Logo mobile (só aparece em telas pequenas) */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Dashboard BU</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Cabeçalho do formulário */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Bem-vindo de volta</h1>
            <p className="mt-1.5 text-sm text-gray-500">
              Acesse com suas credenciais para continuar
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Campo: Consultor */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Consultor
              </label>
              <ConsultorDropdown
                names={names}
                value={selected}
                onChange={setSelected}
              />
            </div>

            {/* Campo: Senha */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-4 py-3 pr-12 text-sm text-white placeholder-gray-600 outline-none transition focus:border-blue-500/60 focus:bg-white/[0.06] focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 transition hover:text-gray-300"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm text-red-400">
                <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400" />
                {error}
              </div>
            )}

            {/* Botão entrar */}
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full overflow-hidden rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-500 disabled:opacity-50"
            >
              {/* Shimmer no hover */}
              <span className="absolute inset-0 -translate-x-full bg-white/10 skew-x-12 transition-transform duration-500 group-hover:translate-x-full" />
              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Entrar
                  </>
                )}
              </span>
            </button>

            <p className="text-center text-xs text-gray-600">
              Cada usuário visualiza apenas os dados do seu perfil.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
