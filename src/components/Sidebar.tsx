import { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Target, Megaphone, Share2, Building2, LogOut, Settings2, FileText, GraduationCap, Users, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { env } from '../config';

type SidebarMode = 'comercial' | 'academico';

function usePendingSuggestionCount(isAdmin: boolean, userName: string | null) {
  const [count, setCount] = useState(0);
  const check = useCallback(async () => {
    try {
      const base = env.SUPABASE_URL + '/rest/v1/Template_Sugestoes';
      const headers: Record<string, string> = {
        apikey: env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      };
      let url: string;
      if (isAdmin) {
        url = `${base}?select=id&status=eq.pending`;
      } else {
        url = `${base}?select=id&submittedBy=eq.${encodeURIComponent(userName || '')}&status=neq.pending&readByUser=eq.false`;
      }
      const res = await fetch(url, { headers });
      if (res.ok) {
        const rows = await res.json();
        setCount(Array.isArray(rows) ? rows.length : 0);
      } else {
        setCount(0);
      }
    } catch { setCount(0); }
  }, [isAdmin, userName]);

  useEffect(() => {
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, [check]);

  return count;
}

const comercialNavItems = [
  { to: '/', label: 'Dashboard de Leads', icon: BarChart3, adminOnly: false },
  { to: '/resultado-geral', label: 'Resultado Geral', icon: Target, adminOnly: true },
  { to: '/meta-campanhas', label: 'Meta - Campanhas', icon: Megaphone, adminOnly: true },
  { to: '/distribuicao-anhanguera', label: 'Distribuição Anhanguera', icon: Building2, adminOnly: true },
  { to: '/distribuicao-sumare', label: 'Distribuição Sumaré', icon: Share2, adminOnly: true },
  { to: '/meta', label: 'Meta', icon: Settings2, adminOnly: true },
  { to: '/formatar-planilha', label: 'Formatar Planilha', icon: FileSpreadsheet, adminOnly: true },
  { to: '/templates-hub', label: 'Templates', icon: FileText, adminOnly: false },
];

const academicoNavItems = [
  { to: '/academico', label: 'Dashboard Alunos', icon: GraduationCap, adminOnly: true },
  { to: '/academico/colaboradores', label: 'Colaboradores', icon: Users, adminOnly: true },
  { to: '/formatar-planilha', label: 'Formatar Planilha', icon: FileSpreadsheet, adminOnly: true },
  { to: '/templates-hub', label: 'Templates', icon: FileText, adminOnly: false },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const badgeCount = usePendingSuggestionCount(isAdmin, user);

  const isAcademicoRoute = location.pathname.startsWith('/academico');
  const [mode, setMode] = useState<SidebarMode>(isAcademicoRoute ? 'academico' : 'comercial');

  useEffect(() => {
    setMode(isAcademicoRoute ? 'academico' : 'comercial');
  }, [isAcademicoRoute]);

  const handleModeSwitch = (newMode: SidebarMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    if (newMode === 'academico') {
      navigate('/academico');
    } else {
      navigate('/');
    }
    onNavigate?.();
  };

  const allItems = mode === 'academico' ? academicoNavItems : comercialNavItems;
  const navItems = isAdmin ? allItems : allItems.filter((item) => !item.adminOnly);

  return (
    <aside className="flex h-full w-64 flex-col bg-gray-900 shadow-2xl shadow-black/50">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/10 p-2">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <span className="text-lg font-semibold text-white">Analytics</span>
        </div>

        {/* Mode switcher — admin only */}
        {isAdmin && (
          <div className="mt-4 flex rounded-lg bg-white/5 p-1">
            <button
              onClick={() => handleModeSwitch('comercial')}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                mode === 'comercial'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Comercial
            </button>
            <button
              onClick={() => handleModeSwitch('academico')}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                mode === 'academico'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Acadêmico
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const showBadge = item.to === '/templates-hub' && badgeCount > 0;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/' || item.to === '/academico'}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
              {showBadge && (
                <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-500 px-1.5 text-[10px] font-bold text-white">
                  {badgeCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-800 px-4 py-4">
        <div className="mb-3 flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm font-bold text-blue-400">
            {user?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user}</p>
            <p className="text-xs text-gray-500">
              {isAdmin ? 'Supervisão' : 'Consultor'}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
