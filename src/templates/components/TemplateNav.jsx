import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  List,
  PlusCircle,
  AlertTriangle,
  Lightbulb,
  ClipboardCheck,
} from 'lucide-react';
import { useSuggestions } from '../context/SuggestionContext';

const BASE = '/templates-hub';

const navItems = [
  { to: BASE, icon: LayoutDashboard, label: 'Painel' },
  { to: `${BASE}/list`, icon: List, label: 'Templates' },
  { to: `${BASE}/new`, icon: PlusCircle, label: 'Novo' },
  { to: `${BASE}/alerts`, icon: AlertTriangle, label: 'Alertas' },
  { to: `${BASE}/suggest`, icon: Lightbulb, label: 'Sugerir' },
  { to: `${BASE}/suggestions`, icon: ClipboardCheck, label: 'Sugestões', showBadge: true },
];

export default function TemplateNav() {
  const { getSuggestionStats } = useSuggestions();
  const pending = getSuggestionStats().pending;

  return (
    <nav className="flex items-center gap-1 overflow-x-auto pb-5 mb-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      {navItems.map((item) => {
        const showPending = item.showBadge && pending > 0;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === BASE}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`
            }
            style={({ isActive }) =>
              isActive
                ? {
                    background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(59,130,246,0.1))',
                    border: '1px solid rgba(59,130,246,0.2)',
                    boxShadow: '0 2px 12px rgba(37,99,235,0.15)',
                  }
                : {
                    background: 'transparent',
                    border: '1px solid transparent',
                  }
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
            {showPending && (
              <span
                className="text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none min-w-[18px] text-center"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 2px 8px rgba(245,158,11,0.3)' }}
              >
                {pending}
              </span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
