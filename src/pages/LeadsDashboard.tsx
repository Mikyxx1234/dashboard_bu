import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function LeadsDashboard() {
  const { user } = useAuth();

  const src = useMemo(() => {
    const p = new URLSearchParams({
      autouser: user || '',
      sbUrl: import.meta.env.VITE_SUPABASE_URL || '',
      sbAnon: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      sbService: import.meta.env.VITE_SUPABASE_SERVICE_KEY || '',
      hashes: JSON.stringify({
        Gabriel: import.meta.env.VITE_AUTH_HASH_GABRIEL || '',
        Breno: import.meta.env.VITE_AUTH_HASH_BRENO || '',
        Camilla: import.meta.env.VITE_AUTH_HASH_CAMILLA || '',
        Rahi: import.meta.env.VITE_AUTH_HASH_RAHI || '',
        'Supervisão': import.meta.env.VITE_AUTH_HASH_SUPERVISAO || '',
      }),
    });
    return `/dashboard_consultores.html?${p.toString()}`;
  }, [user]);

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
