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
  const res = await fetch(`/api/sessions/list${qs}`);

  if (!res.ok) throw new Error('Falha ao carregar sessões');
  return res.json();
}
