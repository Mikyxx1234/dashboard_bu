import { NavLink } from 'react-router-dom';
import { BarChart3, Target, Megaphone } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard de Leads', icon: BarChart3 },
  { to: '/resultado-geral', label: 'Resultado Geral', icon: Target },
  { to: '/meta-campanhas', label: 'Meta - Campanhas', icon: Megaphone },
];

export function Sidebar() {
  return (
    <aside className="w-64 flex-shrink-0 bg-gray-900">
      <div className="sticky top-0 flex h-screen flex-col">
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

        <div className="border-t border-gray-800 px-6 py-4">
          <p className="text-xs text-gray-500">Anhanguera & Sumare</p>
        </div>
      </div>
    </aside>
  );
}
