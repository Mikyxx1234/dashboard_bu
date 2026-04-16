import { env } from '../../config';

const BASE_URL = () =>
  `https://${env.KOMMO_SUBDOMAIN}.kommo.com/api/v4`;

const headers = () => ({
  Authorization: `Bearer ${env.KOMMO_TOKEN}`,
  'Content-Type': 'application/json',
});

async function request(endpoint, options = {}) {
  const url = `${BASE_URL()}${endpoint}`;
  const res = await fetch(url, { headers: headers(), ...options });

  if (res.status === 204) return null;

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Kommo API ${res.status}: ${body}`);
  }

  return res.json();
}

// ─── Account ───────────────────────────────────────────────

export async function getAccount(withRelations = '') {
  const qs = withRelations ? `?with=${withRelations}` : '';
  return request(`/account${qs}`);
}

// ─── Leads ─────────────────────────────────────────────────

export async function getLeads(params = {}) {
  const qs = new URLSearchParams();
  if (params.limit) qs.set('limit', params.limit);
  if (params.page) qs.set('page', params.page);
  if (params.query) qs.set('query', params.query);
  if (params.with) qs.set('with', params.with);
  if (params.filter) {
    for (const [key, value] of Object.entries(params.filter)) {
      if (Array.isArray(value)) {
        value.forEach((v) => qs.append(`filter[${key}][]`, v));
      } else {
        qs.set(`filter[${key}]`, value);
      }
    }
  }
  const query = qs.toString();
  return request(`/leads${query ? `?${query}` : ''}`);
}

export async function getLeadById(id, withRelations = '') {
  const qs = withRelations ? `?with=${withRelations}` : '';
  return request(`/leads/${id}${qs}`);
}

export async function createLead(data) {
  return request('/leads', {
    method: 'POST',
    body: JSON.stringify([data]),
  });
}

export async function createLeads(leadsArray) {
  return request('/leads', {
    method: 'POST',
    body: JSON.stringify(leadsArray),
  });
}

export async function updateLead(id, data) {
  return request(`/leads/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function updateLeads(leadsArray) {
  return request('/leads', {
    method: 'PATCH',
    body: JSON.stringify(leadsArray),
  });
}

/**
 * Move lead to a different pipeline/status.
 * @param {number} leadId
 * @param {number} pipelineId
 * @param {number} statusId
 */
export async function moveLeadToStatus(leadId, pipelineId, statusId) {
  return updateLead(leadId, {
    pipeline_id: pipelineId,
    status_id: statusId,
  });
}

// ─── Contacts ──────────────────────────────────────────────

export async function getContacts(params = {}) {
  const qs = new URLSearchParams();
  if (params.limit) qs.set('limit', params.limit);
  if (params.page) qs.set('page', params.page);
  if (params.query) qs.set('query', params.query);
  if (params.with) qs.set('with', params.with);
  const query = qs.toString();
  return request(`/contacts${query ? `?${query}` : ''}`);
}

export async function getContactById(id, withRelations = '') {
  const qs = withRelations ? `?with=${withRelations}` : '';
  return request(`/contacts/${id}${qs}`);
}

export async function createContact(data) {
  return request('/contacts', {
    method: 'POST',
    body: JSON.stringify([data]),
  });
}

export async function updateContact(id, data) {
  return request(`/contacts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ─── Pipelines & Statuses ──────────────────────────────────

export async function getPipelines() {
  return request('/leads/pipelines');
}

export async function getPipelineById(id) {
  return request(`/leads/pipelines/${id}`);
}

export async function getStatuses(pipelineId) {
  return request(`/leads/pipelines/${pipelineId}/statuses`);
}

// ─── Users ─────────────────────────────────────────────────

export async function getUsers(params = {}) {
  const qs = new URLSearchParams();
  if (params.with) qs.set('with', params.with);
  const query = qs.toString();
  return request(`/users${query ? `?${query}` : ''}`);
}

export async function getUserById(id) {
  return request(`/users/${id}`);
}

// ─── Tasks ─────────────────────────────────────────────────

export async function getTasks(params = {}) {
  const qs = new URLSearchParams();
  if (params.limit) qs.set('limit', params.limit);
  if (params.page) qs.set('page', params.page);
  if (params.filter) {
    for (const [key, value] of Object.entries(params.filter)) {
      if (Array.isArray(value)) {
        value.forEach((v) => qs.append(`filter[${key}][]`, v));
      } else {
        qs.set(`filter[${key}]`, value);
      }
    }
  }
  const query = qs.toString();
  return request(`/tasks${query ? `?${query}` : ''}`);
}

export async function createTask(data) {
  return request('/tasks', {
    method: 'POST',
    body: JSON.stringify([data]),
  });
}

// ─── Notes (histórico / atividade) ─────────────────────────

export async function getLeadNotes(leadId, params = {}) {
  const qs = new URLSearchParams();
  if (params.limit) qs.set('limit', params.limit);
  if (params.page) qs.set('page', params.page);
  const query = qs.toString();
  return request(`/leads/${leadId}/notes${query ? `?${query}` : ''}`);
}

export async function addLeadNote(leadId, noteData) {
  return request(`/leads/${leadId}/notes`, {
    method: 'POST',
    body: JSON.stringify([noteData]),
  });
}

// ─── Tags ──────────────────────────────────────────────────

export async function getLeadTags(params = {}) {
  const qs = new URLSearchParams();
  if (params.limit) qs.set('limit', params.limit);
  if (params.page) qs.set('page', params.page);
  const query = qs.toString();
  return request(`/leads/tags${query ? `?${query}` : ''}`);
}

export async function addTagsToLead(leadId, tags) {
  return updateLead(leadId, {
    _embedded: {
      tags: tags.map((t) => (typeof t === 'string' ? { name: t } : t)),
    },
  });
}

// ─── Custom Fields ─────────────────────────────────────────

export async function getLeadCustomFields() {
  return request('/leads/custom_fields');
}

export async function getContactCustomFields() {
  return request('/contacts/custom_fields');
}

// ─── Health check ──────────────────────────────────────────

export async function testConnection() {
  try {
    const account = await getAccount('amojo_id');
    return {
      success: true,
      accountName: account.name,
      accountId: account.id,
      subdomain: account.subdomain || env.KOMMO_SUBDOMAIN,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
}
