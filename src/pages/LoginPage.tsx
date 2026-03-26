import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { useAuth, getConsultantNames } from '../contexts/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const names = getConsultantNames();

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit(e);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4"
      style={{
        background:
          'radial-gradient(circle at top left, rgba(56,189,248,0.08), transparent 28%), ' +
          'radial-gradient(circle at top right, rgba(251,146,60,0.08), transparent 24%), ' +
          'linear-gradient(180deg, #09101f 0%, #0c1324 100%)',
      }}
    >
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white/10">
            <BarChart3 className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
          <p className="mt-2 text-sm text-gray-400">
            Acesse com suas credenciais para visualizar o painel
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Consultor
            </label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-gray-800 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Selecione seu nome</option>
              {names.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua senha"
              className="w-full rounded-xl border border-white/10 bg-gray-800 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="text-center text-xs text-gray-500">
            Cada usuário visualiza apenas os dados autorizados ao seu perfil.
          </p>
        </form>
      </div>
    </div>
  );
}
