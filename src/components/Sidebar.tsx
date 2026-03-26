import { NavLink } from 'react-router-dom';
import { BarChart3, Target, Megaphone, Share2, Building2, LogOut, Settings2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const allNavItems = [
  { to: '/', label: 'Dashboard de Leads', icon: BarChart3, adminOnly: false },
  { to: '/resultado-geral', label: 'Resultado Geral', icon: Target, adminOnly: true },
  { to: '/meta-campanhas', label: 'Meta - Campanhas', icon: Megaphone, adminOnly: true },
  { to: '/distribuicao-anhanguera', label: 'Distribuição Anhanguera', icon: Building2, adminOnly: true },
  { to: '/distribuicao-sumare', label: 'Distribuição Sumaré', icon: Share2, adminOnly: true },
  { to: '/meta', label: 'Meta', icon: Settings2, adminOnly: true },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const { user, isAdmin, logout } = useAuth();

  const navItems = isAdmin
    ? allNavItems
    : allNavItems.filter((item) => !item.adminOnly);

  return (
    <aside className="flex h-full w-64 flex-col bg-gray-900 shadow-2xl shadow-black/50">
      <div className="flex items-center border-b border-gray-800 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/10 p-2">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <span className="text-lg font-semibold text-white">Analytics</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
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
          </NavLink>
        ))}
      </nav>

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
