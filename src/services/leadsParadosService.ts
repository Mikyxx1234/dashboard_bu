import { env } from '../config';

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
      headers: { Authorization: `Bearer ${env.KOMMO_TOKEN}` },
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
      headers: { Authorization: `Bearer ${env.KOMMO_TOKEN}` },
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
