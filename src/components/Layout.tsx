import { useState, useCallback } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useAuth } from '../contexts/AuthContext';

const SIDEBAR_W = 256;

export function Layout() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  const toggleSidebar = useCallback(() => {
    setVisible((v) => !v);
  }, []);

  const closeSidebar = useCallback(() => {
    setVisible(false);
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="relative flex min-h-screen">
      {/* Toggle button — hidden when sidebar is open */}
      {!visible && (
        <button
          onClick={toggleSidebar}
          aria-label="Abrir menu"
          className="fixed left-3 top-3 z-[60] flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-gray-900/80 text-slate-300 shadow-lg backdrop-blur transition-all hover:bg-gray-800 hover:text-white active:scale-95"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* Sidebar panel */}
      <div
        className="fixed left-0 top-0 z-50 h-screen transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ width: SIDEBAR_W, transform: visible ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <Sidebar onNavigate={closeSidebar} />
      </div>

      {/* Backdrop */}
      {visible && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      {/* Content */}
      <div className="min-h-screen flex-1" style={{ background: '#0c1222' }}>
        <Outlet />
      </div>
    </div>
  );
}
