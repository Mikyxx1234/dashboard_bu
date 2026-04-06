import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { env } from '../config';

export function LeadsDashboard() {
  const { user, isAdmin } = useAuth();

  const src = useMemo(() => {
    const p = new URLSearchParams({
      autouser: user || '',
      isAdmin: isAdmin ? '1' : '0',
      sbUrl: env.SUPABASE_URL,
      sbAnon: env.SUPABASE_ANON_KEY,
      sbService: env.SUPABASE_SERVICE_KEY,
      _t: String(Date.now()),
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
