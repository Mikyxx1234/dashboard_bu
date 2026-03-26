import { useState, useRef, useCallback } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '../contexts/AuthContext';

export function Layout() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (openTimer.current) { clearTimeout(openTimer.current); openTimer.current = null; }
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }, []);

  const scheduleOpen = useCallback(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    if (!openTimer.current) {
      openTimer.current = setTimeout(() => { setVisible(true); openTimer.current = null; }, 100);
    }
  }, []);

  const scheduleClose = useCallback(() => {
    if (openTimer.current) { clearTimeout(openTimer.current); openTimer.current = null; }
    if (!closeTimer.current) {
      closeTimer.current = setTimeout(() => { setVisible(false); closeTimer.current = null; }, 320);
    }
  }, []);

  const keepOpen = useCallback(() => {
    clearTimers();
  }, [clearTimers]);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="relative flex min-h-screen">
      {/* Hover trigger zone */}
      <div
        className="fixed left-0 top-0 z-40 h-screen w-4"
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
      />

      {/* Indicator strip */}
      <div
        className="pointer-events-none fixed left-0 top-1/2 z-40 -translate-y-1/2 transition-all duration-300"
        style={{
          width: visible ? 0 : 4,
          height: visible ? 0 : 56,
          borderRadius: '0 5px 5px 0',
          background: 'rgba(96,165,250,0.3)',
          opacity: visible ? 0 : 0.7,
          boxShadow: visible ? 'none' : '0 0 12px rgba(96,165,250,0.25)',
        }}
      />

      {/* Sidebar */}
      <div
        className="fixed left-0 top-0 z-50 h-screen transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ width: 256, transform: visible ? 'translateX(0)' : 'translateX(-100%)' }}
        onMouseEnter={keepOpen}
        onMouseLeave={scheduleClose}
      >
        <Sidebar onNavigate={scheduleClose} />
      </div>

      {/* Backdrop on mobile */}
      {visible && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => { clearTimers(); setVisible(false); }}
        />
      )}

      {/* Content — full width */}
      <div className="min-h-screen flex-1 bg-gray-50">
        <Outlet />
      </div>
    </div>
  );
}
