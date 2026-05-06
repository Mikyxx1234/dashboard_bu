import { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3, Target, Megaphone, Share2, Building2, LogOut,
  Settings2, FileText, GraduationCap, Users, FileSpreadsheet,
  BookOpen, Globe, AlertTriangle, CalendarDays, Bell, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { env } from '../config';

type SidebarMode = 'comercial' | 'academico';

// ---------------------------------------------------------------------------
// Badge de sugestões pendentes
// ---------------------------------------------------------------------------
function usePendingSuggestionCount(isAdmin: boolean, userName: string | null) {
  const [count, setCount] = useState(0);

  const check = useCallback(async () => {
    try {
      const base = env.SUPABASE_URL + '/rest/v1/Template_Sugestoes';
      const headers: Record<string, string> = {
        apikey: env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      };
      const url = isAdmin
        ? `${base}?select=id&status=eq.pending`
        : `${base}?select=id&submittedBy=eq.${encodeURIComponent(userName || '')}&status=neq.pending&readByUser=eq.false`;
      const res = await fetch(url, { headers });
      const rows = res.ok ? await res.json() : [];
      setCount(Array.isArray(rows) ? rows.length : 0);
    } catch {
      setCount(0);
    }
  }, [isAdmin, userName]);

  useEffect(() => {
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, [check]);

  return count;
}

// ---------------------------------------------------------------------------
// Tipos e estrutura de navegação
// ---------------------------------------------------------------------------
interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  adminOnly: boolean;
}

interface NavSection {
  label?: string;          // undefined = itens soltos no topo (sem collapse)
  items: NavItem[];
}

const comercialSections: NavSection[] = [
  {
    items: [
      { to: '/', label: 'Dashboard de Leads', icon: BarChart3, adminOnly: false },
    ],
  },
  {
    label: 'Análise',
    items: [
      { to: '/resultado-geral',         label: 'Resultado Geral',   icon: Target,        adminOnly: true },
      { to: '/meta-campanhas',          label: 'Meta - Campanhas',  icon: Megaphone,     adminOnly: true },
      { to: '/distribuicao-anhanguera', label: 'Dist. Anhanguera',  icon: Building2,     adminOnly: true },
      { to: '/distribuicao-sumare',     label: 'Dist. Sumaré',      icon: Share2,        adminOnly: true },
      { to: '/meta',                    label: 'Metas',             icon: Settings2,     adminOnly: true },
    ],
  },
  {
    label: 'Equipe',
    items: [
      { to: '/mural-avisos',        label: 'Mural de Avisos', icon: Bell,         adminOnly: false },
      { to: '/calendario-academico',label: 'Calendário',      icon: CalendarDays, adminOnly: false },
    ],
  },
  {
    label: 'Ferramentas',
    items: [
      { to: '/formatar-planilha', label: 'Formatar Planilha', icon: FileSpreadsheet, adminOnly: true },
      { to: '/templates-hub',     label: 'Templates',         icon: FileText,        adminOnly: false },
      { to: '/blog-controle',     label: 'Blog',              icon: BookOpen,        adminOnly: true },
      { to: '/sessoes',           label: 'Sessões & UTMs',    icon: Globe,           adminOnly: true },
      { to: '/leads-parados',     label: 'Leads Parados',     icon: AlertTriangle,   adminOnly: true },
    ],
  },
];

const academicoSections: NavSection[] = [
  {
    label: 'Visão Geral',
    items: [
      { to: '/academico',               label: 'Dashboard Alunos', icon: GraduationCap,  adminOnly: true },
      { to: '/academico/colaboradores', label: 'Colaboradores',    icon: Users,           adminOnly: true },
    ],
  },
  {
    label: 'Recursos',
    items: [
      { to: '/calendario-academico', label: 'Calendário',        icon: CalendarDays,    adminOnly: false },
      { to: '/formatar-planilha',    label: 'Formatar Planilha', icon: FileSpreadsheet, adminOnly: true },
      { to: '/templates-hub',        label: 'Templates',         icon: FileText,        adminOnly: false },
    ],
  },
];

// Retorna quais seções devem começar abertas (a que contém a rota ativa)
function getInitialOpen(pathname: string, sections: NavSection[]): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  for (const sec of sections) {
    if (!sec.label) continue;
    const hasActive = sec.items.some((item) => {
      if (item.to === '/' || item.to === '/academico') return pathname === item.to;
      return pathname.startsWith(item.to);
    });
    state[sec.label] = hasActive;
  }
  return state;
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
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

  const allSections = mode === 'comercial' ? comercialSections : academicoSections;
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => getInitialOpen(location.pathname, allSections),
  );

  // Sincroniza modo com rota
  useEffect(() => {
    setMode(isAcademicoRoute ? 'academico' : 'comercial');
  }, [isAcademicoRoute]);

  // Reabre seção correta ao mudar de modo
  useEffect(() => {
    const sections = mode === 'comercial' ? comercialSections : academicoSections;
    setOpenSections(getInitialOpen(location.pathname, sections));
  }, [mode, location.pathname]);

  const handleModeSwitch = (newMode: SidebarMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    navigate(newMode === 'academico' ? '/academico' : '/');
    onNavigate?.();
  };

  function toggleSection(label: string) {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  const isComercial = mode === 'comercial';
  const activeItemBg   = isComercial ? 'bg-blue-500/10 text-blue-200'   : 'bg-purple-500/10 text-purple-200';
  const activeBar      = isComercial ? 'bg-blue-500'                    : 'bg-purple-500';
  const activeIconCls  = isComercial ? 'text-blue-400'                  : 'text-purple-400';
  const avatarBg       = isAdmin
    ? 'bg-gradient-to-br from-blue-600 to-purple-600'
    : 'bg-gradient-to-br from-blue-600 to-blue-800';

  return (
    <aside className="flex h-full w-72 flex-col" style={{ background: '#0f1623' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-base font-bold leading-tight text-white">Dashboard BU</p>
            <p className="text-xs text-gray-500">
              {isComercial ? 'Comercial' : 'Acadêmico'}
            </p>
          </div>
        </div>

        {/* Mode switcher */}
        {isAdmin && (
          <div className="mt-4 flex rounded-lg bg-white/[0.04] p-[3px]">
            {(['comercial', 'academico'] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleModeSwitch(m)}
                className={`flex-1 rounded-md py-2 text-xs font-semibold transition-all ${
                  mode === m
                    ? m === 'comercial' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {m === 'comercial' ? 'Comercial' : 'Acadêmico'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mx-4 mb-1 mt-2 h-px bg-white/[0.05]" />

      {/* ── Navigation ─────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 scrollbar-none">
        {allSections.map((section, si) => {
          // Filtra por permissão
          const items = isAdmin ? section.items : section.items.filter((i) => !i.adminOnly);
          if (items.length === 0) return null;

          // Seção sem label → itens soltos (não colapsáveis)
          if (!section.label) {
            return (
              <div key={si} className="mb-1">
                {items.map((item) => (
                  <NavItem
                    key={item.to}
                    item={item}
                    badgeCount={badgeCount}
                    activeItemBg={activeItemBg}
                    activeBar={activeBar}
                    activeIconCls={activeIconCls}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            );
          }

          const isOpen = openSections[section.label] ?? false;

          return (
            <div key={section.label} className="mb-1">
              {/* Cabeçalho colapsável */}
              <button
                onClick={() => toggleSection(section.label!)}
                className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-white/[0.03]"
              >
                <span className="flex-1 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-500 group-hover:text-gray-400">
                  {section.label}
                </span>
                <ChevronRight
                  className={`h-3.5 w-3.5 flex-shrink-0 text-gray-600 transition-transform duration-200 group-hover:text-gray-400 ${
                    isOpen ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {/* Itens — animação por max-height */}
              <div
                className="overflow-hidden transition-all duration-200 ease-in-out"
                style={{ maxHeight: isOpen ? `${items.length * 52}px` : '0px' }}
              >
                <div className="ml-2 border-l border-white/[0.06] pl-2">
                  {items.map((item) => (
                    <NavItem
                      key={item.to}
                      item={item}
                      badgeCount={badgeCount}
                      activeItemBg={activeItemBg}
                      activeBar={activeBar}
                      activeIconCls={activeIconCls}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Footer ─────────────────────────────────────────── */}
      <div className="mx-4 h-px bg-white/[0.05]" />
      <div className="px-4 py-4">
        <div className="mb-2 flex items-center gap-3 rounded-lg px-2 py-2">
          <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarBg}`}>
            {user?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-200">{user}</p>
            <p className="text-xs text-gray-500">{isAdmin ? 'Supervisão' : 'Consultor'}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-all hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Sub-componente: item de navegação
// ---------------------------------------------------------------------------
interface NavItemProps {
  item: NavItem;
  badgeCount: number;
  activeItemBg: string;
  activeBar: string;
  activeIconCls: string;
  onNavigate?: () => void;
}

function NavItem({ item, badgeCount, activeItemBg, activeBar, activeIconCls, onNavigate }: NavItemProps) {
  const showBadge = item.to === '/templates-hub' && badgeCount > 0;

  return (
    <NavLink
      to={item.to}
      end={item.to === '/' || item.to === '/academico'}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group relative mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
          isActive
            ? activeItemBg
            : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full ${activeBar}`} />
          )}
          <item.icon
            className={`h-[18px] w-[18px] flex-shrink-0 transition-colors ${
              isActive ? activeIconCls : 'text-gray-500 group-hover:text-gray-300'
            }`}
          />
          <span className="flex-1 truncate">{item.label}</span>
          {showBadge && (
            <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-500 px-1 text-[9px] font-bold text-white">
              {badgeCount}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}
