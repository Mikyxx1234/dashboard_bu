import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function LeadsDashboard() {
  const { user, isAdmin } = useAuth();

  const src = useMemo(() => {
    const p = new URLSearchParams({
      autouser: user || '',
      isAdmin: isAdmin ? '1' : '0',
      sbUrl: import.meta.env.VITE_SUPABASE_URL || '',
      sbAnon: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      sbService: import.meta.env.VITE_SUPABASE_SERVICE_KEY || '',
    });
    return `/dashboard_consultores.html?${p.toString()}`;
  }, [user, isAdmin]);

  return (
    <div className="h-screen w-full">
      <iframe
        src={src}
        title="Dashboard Individual de Consultores"
        className="h-full w-full border-0"
        allow="clipboard-write"
      />
    </div>
  );
}
