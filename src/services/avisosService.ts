import { env } from '../config';

const TABLE = 'avisos';

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

export interface Aviso {
  id: string;
  titulo: string;
  corpo: string;
  urgente: boolean;
  ativo: boolean;
  criado_por: string;
  criado_em: string;
  expira_em: string | null;
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

export async function getAvisos(apenasAtivos = true): Promise<Aviso[]> {
  let url = `${env.SUPABASE_URL}/rest/v1/${TABLE}?select=*&order=urgente.desc,criado_em.desc`;
  if (apenasAtivos) url += '&ativo=eq.true';
  const res = await fetch(url, { headers: readHeaders() });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function createAviso(
  data: Pick<Aviso, 'titulo' | 'corpo' | 'urgente' | 'criado_por'> & { expira_em?: string | null },
): Promise<Aviso> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${TABLE}`, {
    method: 'POST',
    headers: writeHeaders(),
    body: JSON.stringify({ ativo: true, ...data }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const rows: Aviso[] = await res.json();
  return rows[0];
}

export async function updateAviso(id: string, data: Partial<Omit<Aviso, 'id' | 'criado_em'>>): Promise<void> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${id}`, {
    method: 'PATCH',
    headers: writeHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function deleteAviso(id: string): Promise<void> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${id}`, {
    method: 'DELETE',
    headers: readHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

// ---------------------------------------------------------------------------
// Confirmações de leitura
// ---------------------------------------------------------------------------

export interface AvisoConfirmacao {
  id: string;
  aviso_id: string;
  consultor: string;
  confirmado_em: string;
}

const TABLE_CONF = 'avisos_confirmacoes';

export async function getConfirmacoesPorConsultor(consultor: string): Promise<AvisoConfirmacao[]> {
  const url = `${env.SUPABASE_URL}/rest/v1/${TABLE_CONF}?select=*&consultor=eq.${encodeURIComponent(consultor)}`;
  const res = await fetch(url, { headers: readHeaders() });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getConfirmacoesPorAviso(avisoId: string): Promise<AvisoConfirmacao[]> {
  const url =
    `${env.SUPABASE_URL}/rest/v1/${TABLE_CONF}` +
    `?select=*&aviso_id=eq.${avisoId}&order=confirmado_em.asc`;
  const res = await fetch(url, { headers: readHeaders() });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function confirmarAviso(avisoId: string, consultor: string): Promise<void> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${TABLE_CONF}`, {
    method: 'POST',
    headers: {
      ...writeHeaders(),
      Prefer: 'return=minimal,resolution=ignore-duplicates',
    },
    body: JSON.stringify({ aviso_id: avisoId, consultor }),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function getAvisosNaoConfirmados(consultor: string): Promise<Aviso[]> {
  const [avisos, confirmacoes] = await Promise.all([
    getAvisos(true),
    getConfirmacoesPorConsultor(consultor),
  ]);
  const confirmadosIds = new Set(confirmacoes.map((c) => c.aviso_id));
  return avisos.filter((a) => !confirmadosIds.has(a.id));
}
