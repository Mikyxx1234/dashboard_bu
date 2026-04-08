import { env } from '../../config';

const headers = () => ({
  apikey: env.SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
});

const BASE = () => env.SUPABASE_URL + '/rest/v1';

export async function fetchAll(table, params = '') {
  const res = await fetch(`${BASE()}/${table}?select=*${params}`, { headers: headers() });
  if (!res.ok) throw new Error(`Erro ao buscar ${table}: ${res.status}`);
  return res.json();
}

export async function insertRow(table, data) {
  const res = await fetch(`${BASE()}/${table}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro ao inserir em ${table}: ${text}`);
  }
  return res.json();
}

export async function updateRow(table, id, data) {
  const res = await fetch(`${BASE()}/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro ao atualizar ${table}: ${text}`);
  }
  return res.json();
}

export async function deleteRow(table, id) {
  const res = await fetch(`${BASE()}/${table}?id=eq.${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Erro ao deletar de ${table}: ${res.status}`);
}
