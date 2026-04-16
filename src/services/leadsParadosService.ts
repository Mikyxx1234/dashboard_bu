const KOMMO_TOKEN =
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6Ijg1MmFlMWE2ZmUzNzk3OWY1NDk1YWRlNmQ1Y2QyODRjNTEwODc3MDI5NmJkMWJhNzMwMjdmNzQ0YTkxN2Y3YWIxMzQxYTkwOTFiNTY1MWRiIn0.eyJhdWQiOiJlMmRhYWM3Mi0yMWUwLTQxYmMtODRjZi04NzUyY2IzZjQwYTUiLCJqdGkiOiI4NTJhZTFhNmZlMzc5NzlmNTQ5NWFkZTZkNWNkMjg0YzUxMDg3NzAyOTZiZDFiYTczMDI3Zjc0NGE5MTdmN2FiMTM0MWE5MDkxYjU2NTFkYiIsImlhdCI6MTc1ODIwNjIwMiwibmJmIjoxNzU4MjA2MjAyLCJleHAiOjE4MzE1MDcyMDAsInN1YiI6IjExNjE2MDY4IiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMxNjk3MzQ3LCJiYXNlX2RvbWFpbiI6ImtvbW1vLmNvbSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwidXNlcl9mbGFncyI6MCwiaGFzaF91dWlkIjoiZTdjNjZjZGEtMzcyZC00YjU3LWI4MWQtYTg4MThlMGZiMjM5IiwiYXBpX2RvbWFpbiI6ImFwaS1nLmtvbW1vLmNvbSJ9.SqZZHlGXFpdcE7oD3IOqWexZ_o3maMkJ2E1LWpHz91IJMFEekentANdh6txCxxIs1jhA7ThezdgK9vpTVSHny1SMnRtOx4aL4dxSiar2hVYR9R4cfihvNsGoq3UUfgz3xzHyFuYqBnkMYh-7F8_GN-s0TrUHg1cl3fGPGVpR4d1i3sgUVatDrhQILOpa2e3p-F3EaD1p97ZqzdRI0R-UjB10K9qt6Qbuvk1-5V3-G5bBxJNJMR8hWcvLlK1sKUjFBhkcliZcwmG-gTAil5oaX9px_CtGale9haLWS5AhkjgoZckdhBIeWh5WpHwcx7i1qhuOXkSdo84VdVifbyJazw';

const BASE = '/kommo-api';

export interface KommoLead {
  id: number;
  name: string;
  responsible_user_id: number;
  pipeline_id: number;
  status_id: number;
  updated_at: number;
  created_at: number;
  _embedded?: {
    contacts?: { id: number; name?: string }[];
  };
}

export interface LeadParado {
  id: number;
  nome: string;
  responsavel_id: number;
  responsavel_nome: string;
  pipeline: string;
  updated_at: Date;
  horas_parado: number;
  contato_nome: string;
}

interface PipelineConfig {
  pipeline_id: number;
  status_id: number;
  label: string;
}

const PIPELINES: PipelineConfig[] = [
  { pipeline_id: 13080164, status_id: 100859856, label: 'Atendimento Anhanguera' },
  { pipeline_id: 13080160, status_id: 100859840, label: 'Atendimento Sumaré' },
];

async function fetchLeadsFromStatus(
  pipelineId: number,
  statusId: number,
): Promise<KommoLead[]> {
  const allLeads: KommoLead[] = [];
  let page = 1;
  const limit = 250;

  while (true) {
    const params = new URLSearchParams({
      'filter[statuses][0][pipeline_id]': String(pipelineId),
      'filter[statuses][0][status_id]': String(statusId),
      with: 'contacts',
      limit: String(limit),
      page: String(page),
    });

    const res = await fetch(`${BASE}/api/v4/leads?${params}`, {
      headers: { Authorization: `Bearer ${KOMMO_TOKEN}` },
    });

    if (res.status === 204 || !res.ok) break;

    const data = await res.json();
    const leads: KommoLead[] = data?._embedded?.leads ?? [];
    if (leads.length === 0) break;

    allLeads.push(...leads);
    if (leads.length < limit) break;
    page++;
  }

  return allLeads;
}

let usersCache: Record<number, string> = {};

async function fetchUsers(): Promise<Record<number, string>> {
  if (Object.keys(usersCache).length > 0) return usersCache;

  const map: Record<number, string> = {};
  let page = 1;

  while (true) {
    const res = await fetch(`${BASE}/api/v4/users?page=${page}&limit=250`, {
      headers: { Authorization: `Bearer ${KOMMO_TOKEN}` },
    });
    if (!res.ok) break;
    const data = await res.json();
    const users = data?._embedded?.users ?? [];
    if (users.length === 0) break;
    for (const u of users) map[u.id] = u.name;
    if (users.length < 250) break;
    page++;
  }

  usersCache = map;
  return map;
}

export async function getLeadsParados(): Promise<LeadParado[]> {
  const nowUnix = Math.floor(Date.now() / 1000);
  const oneHourAgo = nowUnix - 3600;

  const [users, ...leadsArrays] = await Promise.all([
    fetchUsers(),
    ...PIPELINES.map((p) => fetchLeadsFromStatus(p.pipeline_id, p.status_id)),
  ]);

  const result: LeadParado[] = [];

  PIPELINES.forEach((pipeline, idx) => {
    const leads = leadsArrays[idx];
    for (const lead of leads) {
      if (lead.updated_at > oneHourAgo) continue;

      const horasParado = (nowUnix - lead.updated_at) / 3600;
      const contatoNome =
        lead._embedded?.contacts?.[0]?.name ?? '—';

      result.push({
        id: lead.id,
        nome: lead.name,
        responsavel_id: lead.responsible_user_id,
        responsavel_nome: users[lead.responsible_user_id] ?? `ID ${lead.responsible_user_id}`,
        pipeline: pipeline.label,
        updated_at: new Date(lead.updated_at * 1000),
        horas_parado: Math.round(horasParado * 10) / 10,
        contato_nome: contatoNome,
      });
    }
  });

  result.sort((a, b) => b.horas_parado - a.horas_parado);
  return result;
}
