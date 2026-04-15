const API_URL = import.meta.env.VITE_SESSIONS_API_URL || 'https://banco-compose.6tqx2r.easypanel.host';
const SECRET_TOKEN = import.meta.env.VITE_INSCRICAO_SECRET_TOKEN || '7a8f9b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a';

export interface Session {
  id: string;
  session_id: string;
  landing_page: string | null;
  first_page: string | null;
  referrer: string | null;
  device: string | null;
  ip: string | null;
  user_agent: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchSessions(startDate?: string, endDate?: string): Promise<Session[]> {
  const params = new URLSearchParams();
  if (startDate) params.set('start', startDate);
  if (endDate) params.set('end', endDate);

  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_URL}/api/sessions/list${qs}`, {
    headers: { 'X-Secret-Token': SECRET_TOKEN },
  });

  if (!res.ok) throw new Error('Falha ao carregar sessões');
  return res.json();
}
