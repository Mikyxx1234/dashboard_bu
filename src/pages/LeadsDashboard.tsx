import { useAuth } from '../contexts/AuthContext';

export function LeadsDashboard() {
  const { user } = useAuth();

  const src = `/dashboard_consultores.html?autouser=${encodeURIComponent(user || '')}`;

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
