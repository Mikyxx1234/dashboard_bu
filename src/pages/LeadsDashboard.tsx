import { useAuth } from '../contexts/AuthContext';

export function LeadsDashboard() {
  const { user } = useAuth();

  const params = new URLSearchParams({
    autouser: user || '',
    sbUrl: import.meta.env.VITE_SUPABASE_URL || '',
    sbAnon: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    sbService: import.meta.env.VITE_SUPABASE_SERVICE_KEY || '',
  });
  const src = `/dashboard_consultores.html?${params.toString()}`;

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
