import { useState, useRef, useCallback, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useAuth } from '../contexts/AuthContext';

const SWIPE_THRESHOLD = 50;
const SIDEBAR_W = 256;

export function Layout() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

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

  const closeSidebar = useCallback(() => {
    clearTimers();
    setVisible(false);
  }, [clearTimers]);

  const toggleSidebar = useCallback(() => {
    clearTimers();
    setVisible((v) => !v);
  }, [clearTimers]);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
    }

    function onTouchEnd(e: TouchEvent) {
      if (touchStartX.current === null || touchStartY.current === null) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX.current;
      const dy = Math.abs(touch.clientY - touchStartY.current);

      if (dy > Math.abs(dx)) {
        touchStartX.current = null;
        touchStartY.current = null;
        return;
      }

      if (!visible && touchStartX.current < 30 && dx > SWIPE_THRESHOLD) {
        setVisible(true);
      } else if (visible && dx < -SWIPE_THRESHOLD) {
        setVisible(false);
      }

      touchStartX.current = null;
      touchStartY.current = null;
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [visible]);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="relative flex min-h-screen">
      {/* Desktop: hover trigger zone */}
      <div
        className="fixed left-0 top-0 z-40 hidden h-screen w-4 md:block"
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
      />

      {/* Desktop: indicator strip */}
      <div
        className="pointer-events-none fixed left-0 top-1/2 z-40 hidden -translate-y-1/2 transition-all duration-300 md:block"
        style={{
          width: visible ? 0 : 4,
          height: visible ? 0 : 56,
          borderRadius: '0 5px 5px 0',
          background: 'rgba(96,165,250,0.3)',
          opacity: visible ? 0 : 0.7,
          boxShadow: visible ? 'none' : '0 0 12px rgba(96,165,250,0.25)',
        }}
      />

      {/* Mobile: hamburger button */}
      <button
        onClick={toggleSidebar}
        aria-label="Abrir menu"
        className="fixed left-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-gray-900/80 text-slate-300 shadow-lg backdrop-blur transition-all hover:bg-gray-800 hover:text-white active:scale-95 md:hidden"
        style={{
          opacity: visible ? 0 : 1,
          pointerEvents: visible ? 'none' : 'auto',
          transition: 'opacity 0.2s, transform 0.15s',
        }}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Sidebar panel */}
      <div
        className="fixed left-0 top-0 z-50 h-screen transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ width: SIDEBAR_W, transform: visible ? 'translateX(0)' : 'translateX(-100%)' }}
        onMouseEnter={keepOpen}
        onMouseLeave={scheduleClose}
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
