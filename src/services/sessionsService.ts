import { env } from '../config';

export interface Session {
  id: number;
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
}

const TABLE = 'anh_google_sessions';
const PAGE_SIZE = 1000;

function supaHeaders() {
  return {
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  };
}

export async function fetchSessions(startDate?: string, endDate?: string): Promise<Session[]> {
  const filters: string[] = [];
  if (startDate) filters.push(`created_at=gte.${startDate}T00:00:00`);
  if (endDate) filters.push(`created_at=lte.${endDate}T23:59:59`);
  const filterStr = filters.length ? '&' + filters.join('&') : '';

  const all: Session[] = [];
  let offset = 0;

  while (true) {
    const url =
      `${env.SUPABASE_URL}/rest/v1/${TABLE}` +
      `?select=*&order=created_at.desc&limit=${PAGE_SIZE}&offset=${offset}${filterStr}`;
    const res = await fetch(url, { headers: supaHeaders() });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Falha ao carregar sessões (HTTP ${res.status}) ${body}`);
    }
    const batch: Session[] = await res.json();
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return all;
}
