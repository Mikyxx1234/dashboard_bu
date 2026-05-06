import { env } from '../config';

const TABLE = 'eventos_academicos';

function readHeaders(): Record<string, string> {
  return {
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  };
}

function writeHeaders(): Record<string, string> {
  return {
    ...readHeaders(),
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

export type TipoEvento = 'inicio_semestre' | 'rematricula' | 'vestibular' | 'prazo' | 'evento';

export interface EventoAcademico {
  id: string;
  titulo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string | null;
  tipo: TipoEvento;
  polo: string | null;
  criado_por: string;
  criado_em: string;
}

async function parseError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text) as { message?: string };
    return j.message || text || `HTTP ${res.status}`;
  } catch {
    return text || `HTTP ${res.status}`;
  }
}

export async function getEventos(anoFiltro?: number): Promise<EventoAcademico[]> {
  const ano = anoFiltro ?? new Date().getFullYear();
  const inicio = `${ano}-01-01`;
  const fim = `${ano}-12-31`;
  const url =
    `${env.SUPABASE_URL}/rest/v1/${TABLE}` +
    `?select=*&data_inicio=gte.${inicio}&data_inicio=lte.${fim}&order=data_inicio.asc`;
  const res = await fetch(url, { headers: readHeaders() });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function createEvento(
  data: Pick<EventoAcademico, 'titulo' | 'tipo' | 'data_inicio' | 'criado_por'> &
    Partial<Pick<EventoAcademico, 'descricao' | 'data_fim' | 'polo'>>,
): Promise<EventoAcademico> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${TABLE}`, {
    method: 'POST',
    headers: writeHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const rows: EventoAcademico[] = await res.json();
  return rows[0];
}

export async function updateEvento(
  id: string,
  data: Partial<Omit<EventoAcademico, 'id' | 'criado_em' | 'criado_por'>>,
): Promise<void> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${id}`, {
    method: 'PATCH',
    headers: writeHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function deleteEvento(id: string): Promise<void> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${id}`, {
    method: 'DELETE',
    headers: readHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res));
}
