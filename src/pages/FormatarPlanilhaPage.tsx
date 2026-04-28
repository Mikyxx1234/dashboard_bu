import { useState, useCallback, useMemo, useRef } from 'react';
import {
  Upload, FileSpreadsheet, Search, Download, RotateCcw, CheckCircle,
  AlertCircle, X, ChevronRight, Zap, SlidersHorizontal,
  Phone, User, BookOpen, MapPin, GitBranch, UserCheck, Hash, ExternalLink, Tag,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { env } from '../config';

// ---------------------------------------------------------------------------
// Types — Formatar
// ---------------------------------------------------------------------------
interface BaseInfo {
  nome: string;
  total: number;
  cpf: number;
  ra: number;
  telefone: number;
  telValido: number;
}

interface BaseRow {
  ID: string;
  CPF: string;
  RA: string;
  Telefone: string;
}

interface SearchResult {
  totalLinhas: number;
  encontrados: number;
  naoEncontrados: number;
  camposUsados: string[];
  amostra: Record<string, string>[];
  colunasResultado: string[];
  workbook: XLSX.WorkBook;
}

type Step = 'inicio' | 'pesquisar' | 'resultado' | 'tratar' | 'tratar-resultado';

// ---------------------------------------------------------------------------
// Types — Atualizar Kommo
// ---------------------------------------------------------------------------
type AkStep = 'upload' | 'mapeamento' | 'buscando' | 'resultado' | 'campos' | 'atualizando' | 'update-resultado'
           | 'pre-criacao' | 'criando' | 'criacao-resultado';
type AkCampoBusca = 'id' | 'telefone' | 'ra' | 'cpf' | 'nome' | 'geral';

interface KommoUser { id: number; name: string; }
interface KommoStatus { id: number; name: string; }
interface KommoPipelineData { id: number; name: string; statuses: KommoStatus[]; }
interface KommoFieldEnum { id: number; value: string; }
interface KommoField {
  id: number;
  name: string;
  field_type?: string; // Kommo v4 usa field_type
  type?: string;       // algumas respostas usam type
  enums?: KommoFieldEnum[];
}

const SELECT_FIELD_TYPES = new Set(['select', 'multiselect', 'radiobutton', 'checkbox']);
// Normaliza o tipo antes de comparar: remove underscores, hífens e espaços (ex: "date_time" → "datetime")
const DATE_FIELD_TYPES   = new Set(['date', 'datetime', 'birthday']);

/** Detecta se o campo é do tipo seleção — checa enums (sinal mais confiável) OU field_type/type */
function fieldIsSelect(f: KommoField): boolean {
  if (f.enums && f.enums.length > 0) return true;
  const t = (f.field_type ?? f.type ?? '').toLowerCase().replace(/[_\s-]/g, '');
  return SELECT_FIELD_TYPES.has(t);
}

/** Detecta campo de data: pelo field_type OU, como fallback, pelo nome do campo */
function fieldIsDate(fieldType: string, fieldLabel?: string): boolean {
  // 1. Pelo tipo normalizado (cobre "date", "datetime", "date_time", "Date", etc.)
  const normalized = (fieldType ?? '').toLowerCase().replace(/[_\s-]/g, '');
  if (DATE_FIELD_TYPES.has(normalized)) return true;

  // 2. Fallback por nome do campo (quando Kommo não retorna field_type ou retorna tipo desconhecido)
  if (fieldLabel) {
    const n = fieldLabel.toLowerCase();
    return n.includes('data') || n.includes('date') || n.includes('nascimento')
        || n.includes('birthday') || n.includes('aniversario') || n.includes('vencimento');
  }
  return false;
}

/**
 * Converte qualquer representação de data para Unix timestamp em segundos —
 * formato obrigatório pelo Kommo para campos de data.
 *
 * Suporta:
 *  - Unix timestamp em segundos (9-12 dígitos)
 *  - Serial do Excel (4-5 dígitos, ~25000-60000 — datas entre 1969-2060)
 *  - ISO: YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss...
 *  - BR: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
 *  - US: MM/DD/YYYY quando o dia > 12 seria inválido no BR
 *  - JavaScript Date object (passado como unknown)
 * Retorna null se não conseguir parsear.
 */
function dateStringToUnix(val: unknown): number | null {
  if (val == null || val === '') return null;

  // Objeto Date nativo (vindo do xlsx com cellDates:true ou de outros parsers)
  // Usa meio-dia UTC para evitar que diferenças de fuso horário desloquem o dia
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return Math.floor(Date.UTC(val.getFullYear(), val.getMonth(), val.getDate(), 12, 0, 0) / 1000);
  }

  // Numérico puro (serial Excel ou timestamp Unix)
  if (typeof val === 'number') {
    if (!isFinite(val)) return null;
    // Serial do Excel moderno: valores entre ~25000 (1969) e ~60000 (2064)
    if (val > 25000 && val < 60000) {
      // Fórmula padrão + 12h (meio-dia UTC) para evitar desvio de fuso horário
      const unix = Math.round((val - 25569) * 86400) + 43200;
      return unix;
    }
    // Unix timestamp em segundos — intervalo razoável: 1980-01-01 a 2099-01-01
    // Rejeita CPFs/telefones (> 4 bilhões) que passariam nessa faixa sem este limite
    if (val >= 315532800 && val <= 4070908800) return Math.floor(val);
    return null;
  }

  const v = String(val).trim();
  if (!v) return null;

  let d: Date | null = null;

  // Unix timestamp como string: apenas 9-10 dígitos em intervalo razoável (1980-2099)
  // NÃO aceita 11+ dígitos para evitar que CPFs/telefones sejam tratados como timestamps
  if (/^\d{9,10}$/.test(v)) {
    const ts = parseInt(v, 10);
    if (ts >= 315532800 && ts <= 4070908800) return ts; // 1980-01-01 a 2099-01-01
  }

  // Serial Excel como string (4-5 dígitos ~25000-60000)
  if (/^\d{4,5}$/.test(v)) {
    const serial = parseInt(v, 10);
    if (serial > 25000 && serial < 60000) return Math.round((serial - 25569) * 86400) + 43200;
  }

  // Todas as conversões usam T12:00:00Z (meio-dia UTC) para evitar
  // que diferenças de fuso horário (ex: UTC-3 Brasília) desloquem a data um dia para trás

  // ISO com ou sem horário: YYYY-MM-DD[T...]
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
    d = new Date(v.slice(0, 10) + 'T12:00:00Z');
  }
  // YYYY/MM/DD
  else if (/^\d{4}\/\d{2}\/\d{2}/.test(v)) {
    d = new Date(`${v.slice(0, 4)}-${v.slice(5, 7)}-${v.slice(8, 10)}T12:00:00Z`);
  }
  // BR com separador / ou - : DD/MM/YYYY ou DD-MM-YYYY
  else if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(v)) {
    const sep = v[2];
    const p   = v.split(sep === '/' ? '/' : '-');
    d = new Date(`${p[2].slice(0, 4)}-${p[1]}-${p[0]}T12:00:00Z`);
  }
  // BR com ponto: DD.MM.YYYY
  else if (/^\d{2}\.\d{2}\.\d{4}/.test(v)) {
    const p = v.split('.');
    d = new Date(`${p[2].slice(0, 4)}-${p[1]}-${p[0]}T12:00:00Z`);
  }
  // YYYY.MM.DD
  else if (/^\d{4}\.\d{2}\.\d{2}/.test(v)) {
    d = new Date(v.slice(0, 10).replace(/\./g, '-') + 'T12:00:00Z');
  }

  if (!d || isNaN(d.getTime())) return null;
  return Math.floor(d.getTime() / 1000);
}

interface FieldConfig {
  key: string;
  label: string;
  kind: 'nome' | 'responsavel' | 'status' | 'custom';
  fieldId?: number;
  fieldType?: string;
  enums?: KommoFieldEnum[];          // opções do campo, quando for select
  enabled: boolean;
  fonte: 'coluna' | 'fixo' | 'enum';
  coluna: string;
  valorFixo: string;
  valorId: string;    // user_id, "pipelineId:statusId", ou String(enum.id)
  enumValue: string;  // valor textual do enum selecionado
}

interface AkUpdateResult {
  leadId: number;
  leadNome: string;
  status: 'ok' | 'erro';
  erro?: string;
}

interface CriacaoResult {
  idx: number;
  nome: string;
  status: 'ok' | 'erro';
  leadId?: number;
  erro?: string;
}

// ---------------------------------------------------------------------------
// Types — Consultar Lead
// ---------------------------------------------------------------------------
type ConsultaMode = 'id' | 'ra' | 'telefone' | 'geral';

interface LeadDetalhe {
  id: number;
  nomeLead: string;
  nomeContato: string;
  telefone: string;
  ra: string;
  polo: string;
  pipeline: string;
  statusNome: string;
  responsavel: string;
}

interface AkRowResult {
  idx: number;
  valorBusca: string;
  leadId: number | null;
  leadNome: string;
  status: 'encontrado' | 'nao_encontrado' | 'erro';
  erro?: string;
  selecionado: boolean;
}

// ---------------------------------------------------------------------------
// Funções de limpeza (port do Python)
// ---------------------------------------------------------------------------
function converterFloatParaInteiro(valor: unknown): string {
  if (typeof valor === 'number' && Number.isFinite(valor) && valor === Math.floor(valor)) {
    return String(Math.floor(valor));
  }
  return String(valor ?? '').trim();
}

function limparCpf(valor: unknown): string {
  if (valor == null || String(valor).trim() === '') return '';
  const texto = converterFloatParaInteiro(valor);
  return texto.replace(/[^\d]/g, '');
}

function limparRa(valor: unknown): string {
  if (valor == null || String(valor).trim() === '') return '';
  const texto = converterFloatParaInteiro(valor);
  return texto.replace(/[^\d]/g, '');
}

function limparTelefone(valor: unknown): string {
  if (valor == null || String(valor).trim() === '') return '';
  const texto = converterFloatParaInteiro(valor).replace(/'/g, '');
  const apenasNumeros = texto.replace(/[^\d]/g, '');

  let fmt: string;
  if (apenasNumeros.startsWith('55') && apenasNumeros.length >= 12) {
    fmt = '+' + apenasNumeros;
  } else if (apenasNumeros.length === 10 || apenasNumeros.length === 11) {
    fmt = '+55' + apenasNumeros;
  } else if (apenasNumeros.length >= 12 && !apenasNumeros.startsWith('55')) {
    fmt = '+' + apenasNumeros;
  } else {
    fmt = '+55' + apenasNumeros;
  }

  return fmt.length > 14 ? fmt.slice(0, 14) : fmt;
}

function consolidar(principal: unknown, secundario: unknown): unknown {
  for (const v of [principal, secundario]) {
    if (v != null && String(v).trim() !== '') return v;
  }
  return '';
}

// ---------------------------------------------------------------------------
// Processamento da base Kommo
// ---------------------------------------------------------------------------
function mapearColuna(colunas: string[], nomesPossiveis: string[]): string | null {
  const colunasLower: Record<string, string> = {};
  for (const c of colunas) colunasLower[String(c).trim().toLowerCase()] = c;
  for (const nome of nomesPossiveis) {
    const key = nome.trim().toLowerCase();
    if (key in colunasLower) return colunasLower[key];
  }
  return null;
}

const COLUNAS_ID = ['ID'];
const COLUNAS_CPF = ['CPF', 'anh_CPF'];
const COLUNAS_RA = ['RA', 'anh_RA'];
const COLUNAS_TEL = ['Telefone comercial (contato)'];

function ehBaseJaTratada(colunas: string[]): boolean {
  const lower = colunas.map(c => String(c).trim().toLowerCase());
  return colunas.length === 4 && new Set(lower).size === 4 &&
    ['id', 'cpf', 'ra', 'telefone'].every(n => lower.includes(n));
}

function processarKommo(data: Record<string, unknown>[]): { rows: BaseRow[]; resumo: BaseInfo & { nome: string } } {
  const colunas = data.length > 0 ? Object.keys(data[0]) : [];
  const resultado: BaseRow[] = [];

  if (ehBaseJaTratada(colunas)) {
    const colId = mapearColuna(colunas, ['ID'])!;
    const colCpf = mapearColuna(colunas, ['CPF']);
    const colRa = mapearColuna(colunas, ['RA']);
    const colTel = mapearColuna(colunas, ['Telefone']);

    for (const row of data) {
      resultado.push({
        ID: String(row[colId] ?? ''),
        CPF: colCpf ? limparCpf(row[colCpf]) : '',
        RA: colRa ? limparRa(row[colRa]) : '',
        Telefone: colTel ? limparTelefone(row[colTel]) : '',
      });
    }
  } else {
    const colId = mapearColuna(colunas, COLUNAS_ID);
    const colCpf1 = mapearColuna(colunas, ['CPF']);
    const colCpf2 = mapearColuna(colunas, ['anh_CPF']);
    const colRa1 = mapearColuna(colunas, ['RA']);
    const colRa2 = mapearColuna(colunas, ['anh_RA']);
    const colTel = mapearColuna(colunas, COLUNAS_TEL);

    if (!colId) throw new Error("Coluna 'ID' não encontrada na planilha.");

    for (const row of data) {
      let cpfVal: unknown = '';
      if (colCpf1 && colCpf2) cpfVal = consolidar(row[colCpf1], row[colCpf2]);
      else if (colCpf1) cpfVal = row[colCpf1];
      else if (colCpf2) cpfVal = row[colCpf2];

      let raVal: unknown = '';
      if (colRa1 && colRa2) raVal = consolidar(row[colRa1], row[colRa2]);
      else if (colRa1) raVal = row[colRa1];
      else if (colRa2) raVal = row[colRa2];

      resultado.push({
        ID: String(row[colId] ?? ''),
        CPF: limparCpf(cpfVal),
        RA: limparRa(raVal),
        Telefone: colTel ? limparTelefone(row[colTel]) : '',
      });
    }
  }

  const resumo: BaseInfo & { nome: string } = {
    nome: '',
    total: resultado.length,
    cpf: resultado.filter(r => r.CPF !== '').length,
    ra: resultado.filter(r => r.RA !== '').length,
    telefone: resultado.filter(r => r.Telefone !== '').length,
    telValido: resultado.filter(r => r.Telefone.length === 14 && r.Telefone.startsWith('+55')).length,
  };

  return { rows: resultado, resumo };
}

// ---------------------------------------------------------------------------
// Busca de IDs
// ---------------------------------------------------------------------------
const PATTERNS_CPF = ['cpf', 'c.p.f', 'documento', 'doc'];
const PATTERNS_ID   = ['id', 'lead_id', 'id lead', 'id kommo', 'id_lead', 'idlead', 'id do lead'];
const PATTERNS_RA   = ['matricula', 'matrícula', 'ra', 'registro academico', 'registro acadêmico', 'reg. acad'];
const PATTERNS_TEL  = ['telefone', 'celular', 'fone', 'tel', 'phone', 'whatsapp', 'whats', 'contato'];
const PATTERNS_NOME = ['nome completo', 'nome', 'name', 'lead', 'aluno', 'candidato'];

function detectarColuna(colunas: string[], patterns: string[]): string | null {
  const colunasLower: Record<string, string> = {};
  for (const c of colunas) colunasLower[String(c).toLowerCase().trim()] = c;

  for (const [, lower] of Object.entries(colunasLower)) {
    const lowerKey = lower.toLowerCase().trim();
    for (const p of patterns) {
      if (lowerKey === p) return lower;
    }
  }
  for (const [, lower] of Object.entries(colunasLower)) {
    const lowerKey = lower.toLowerCase().trim();
    for (const p of patterns) {
      if (lowerKey.includes(p)) return lower;
    }
  }
  return null;
}

function construirIndicesBase(baseRows: BaseRow[]) {
  const idxCpf: Record<string, string> = {};
  const idxRa: Record<string, string> = {};
  const idxRaPrefixo: Record<string, string> = {};
  const idxTel: Record<string, string> = {};

  for (const row of baseRows) {
    const leadId = row.ID.trim();
    const cpf = row.CPF.trim();
    const ra = row.RA.trim();
    const tel = row.Telefone.trim();

    if (cpf && cpf !== 'nan' && !(cpf in idxCpf)) idxCpf[cpf] = leadId;
    if (ra && ra !== 'nan' && !(ra in idxRa)) {
      idxRa[ra] = leadId;
      if (ra.length > 8) {
        const prefixo = ra.slice(0, 8);
        if (!(prefixo in idxRaPrefixo)) idxRaPrefixo[prefixo] = leadId;
      }
    }
    if (tel && tel !== 'nan' && !(tel in idxTel)) idxTel[tel] = leadId;
  }

  return { idxCpf, idxRa, idxRaPrefixo, idxTel };
}

function buscarIdNaBase(
  row: Record<string, unknown>,
  colCpf: string | null, colRa: string | null, colTel: string | null,
  indices: ReturnType<typeof construirIndicesBase>
): string {
  if (colCpf) {
    const val = limparCpf(row[colCpf] ?? '');
    if (val && val in indices.idxCpf) return indices.idxCpf[val];
  }
  if (colRa) {
    const val = limparRa(row[colRa] ?? '');
    if (val) {
      if (val in indices.idxRa) return indices.idxRa[val];
      if (val.length <= 8 && val in indices.idxRaPrefixo) return indices.idxRaPrefixo[val];
    }
  }
  if (colTel) {
    const val = limparTelefone(row[colTel] ?? '');
    if (val && val in indices.idxTel) return indices.idxTel[val];
  }
  return '';
}

// ---------------------------------------------------------------------------
// Utilitários Excel
// ---------------------------------------------------------------------------
function readExcelFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function baseRowsToWorkbook(rows: BaseRow[]): XLSX.WorkBook {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dados');
  return wb;
}

// ---------------------------------------------------------------------------
// Kommo API helpers
// ---------------------------------------------------------------------------
// Sempre usa o proxy relativo /kommo-api/ para evitar CORS.
// Em dev: Vite proxy (/kommo-api → subdomain.kommo.com)
// Em prod: nginx proxy (/kommo-api/ → subdomain.kommo.com)
function kommoBase(): string {
  return '/kommo-api/api/v4';
}

function kommoHeaders() {
  return {
    Authorization: `Bearer ${env.KOMMO_TOKEN}`,
    Accept: 'application/json',
  };
}

async function kommoGet(endpoint: string): Promise<unknown> {
  const res = await fetch(`${kommoBase()}${endpoint}`, { headers: kommoHeaders() });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`Kommo ${res.status}`);
  return res.json();
}

async function kommoFetch(
  endpoint: string,
  method: 'PATCH' | 'POST',
  body: unknown
): Promise<unknown> {
  const res = await fetch(`${kommoBase()}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.KOMMO_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (res.status === 204) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Kommo ${method} ${res.status}${text ? ': ' + text.slice(0, 500) : ''}`);
  }
  return res.json();
}

// Busca metadados para o passo "campos"
async function fetchKommoUsers(): Promise<KommoUser[]> {
  const d = await kommoGet('/users?limit=250') as { _embedded?: { users?: KommoUser[] } };
  return d?._embedded?.users ?? [];
}
async function fetchKommoPipelines(): Promise<KommoPipelineData[]> {
  const d = await kommoGet('/leads/pipelines?limit=50') as {
    _embedded?: { pipelines?: { id: number; name: string; _embedded?: { statuses?: KommoStatus[] } }[] }
  };
  return (d?._embedded?.pipelines ?? []).map(p => ({
    id: p.id, name: p.name, statuses: p._embedded?.statuses ?? [],
  }));
}
async function fetchKommoCustomFields(): Promise<KommoField[]> {
  // Busca com paginação automática (Kommo limita 50 por página por padrão)
  const allFields: KommoField[] = [];
  let page = 1;
  while (true) {
    const d = await kommoGet(`/leads/custom_fields?limit=50&page=${page}`) as {
      _embedded?: { custom_fields?: KommoField[] };
      _links?: { next?: unknown };
    };
    const batch = d?._embedded?.custom_fields ?? [];
    allFields.push(...batch);
    // Para quando não há próxima página ou retornou menos de 50
    if (!d?._links?.next || batch.length < 50) break;
    page++;
  }
  return allFields;
}

async function buscarLeadPorId(id: string): Promise<{ id: number; name: string } | null> {
  try {
    const data = await kommoGet(`/leads/${id.trim()}`) as { id: number; name: string };
    return data ? { id: data.id, name: data.name || '' } : null;
  } catch {
    return null;
  }
}

async function buscarLeadPorTelefone(telefone: string): Promise<{ id: number; name: string } | null> {
  try {
    const digits = telefone.replace(/\D/g, '');
    if (!digits) return null;

    // Monta variações de formato para maximizar chances de match no Kommo
    const variants = new Set<string>();
    if (digits.startsWith('55') && digits.length >= 12) {
      variants.add(digits);               // ex: 5511965117628
      variants.add(digits.slice(2));      // sem DDI: 11965117628
      // Tenta também sem o 9º dígito (celulares antigos SP/BR)
      if (digits.length === 13) {
        const ddd = digits.slice(2, 4);
        const semNove = digits.slice(5);  // remove o "9" após o DDD
        variants.add('55' + ddd + semNove);
        variants.add(ddd + semNove);
      }
    } else if (digits.length === 11 || digits.length === 10) {
      variants.add(digits);
      variants.add('55' + digits);
      // Também tenta com/sem 9º dígito
      if (digits.length === 11) {
        const ddd = digits.slice(0, 2);
        const semNove = digits.slice(3);
        variants.add(ddd + semNove);
        variants.add('55' + ddd + semNove);
      }
    } else {
      variants.add(digits);
    }

    for (const v of variants) {
      const data = await kommoGet(
        `/contacts?query=${encodeURIComponent(v)}&with=leads&limit=5`
      ) as { _embedded?: { contacts?: { _embedded?: { leads?: { id: number }[] } }[] } };
      const contacts = data?._embedded?.contacts;
      if (contacts?.length) {
        const leads = contacts[0]?._embedded?.leads;
        if (leads?.length) {
          const leadId = leads[leads.length - 1].id;
          const lead = await kommoGet(`/leads/${leadId}`) as { id: number; name: string };
          if (lead) return { id: lead.id, name: lead.name || '' };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function buscarLeadPorCpf(cpf: string): Promise<{ id: number; name: string } | null> {
  try {
    const clean = cpf.replace(/\D/g, '');
    if (clean.length < 11) return null;

    // Tenta via contatos (CPF pode estar em campo customizado do contato)
    const contData = await kommoGet(
      `/contacts?query=${encodeURIComponent(clean)}&with=leads&limit=5`
    ) as { _embedded?: { contacts?: { _embedded?: { leads?: { id: number }[] } }[] } };
    const contacts = contData?._embedded?.contacts;
    if (contacts?.length) {
      const leads = contacts[0]?._embedded?.leads;
      if (leads?.length) {
        const leadId = leads[leads.length - 1].id;
        const lead = await kommoGet(`/leads/${leadId}`) as { id: number; name: string };
        if (lead) return { id: lead.id, name: lead.name || '' };
      }
    }

    // Fallback: busca direto em leads (campo customizado indexado)
    const data = await kommoGet(
      `/leads?query=${encodeURIComponent(clean)}&limit=5`
    ) as { _embedded?: { leads?: { id: number; name: string }[] } };
    const leads = data?._embedded?.leads;
    if (!leads?.length) return null;
    return { id: leads[0].id, name: leads[0].name || '' };
  } catch {
    return null;
  }
}

async function buscarLeadPorNome(nome: string): Promise<{ id: number; name: string } | null> {
  const palavras = nome.trim().split(/\s+/).filter(Boolean);
  // Exige ao menos 2 palavras para evitar falsos positivos
  if (palavras.length < 2) return null;
  return buscarLeadGeral(nome.trim());
}

async function buscarLeadGeral(query: string): Promise<{ id: number; name: string } | null> {
  try {
    const data = await kommoGet(
      `/leads?query=${encodeURIComponent(query)}&limit=1`
    ) as { _embedded?: { leads?: { id: number; name: string }[] } };
    const leads = data?._embedded?.leads;
    if (!leads?.length) return null;
    return { id: leads[0].id, name: leads[0].name || '' };
  } catch {
    return null;
  }
}

// Busca por RA via campo customizado (procura o valor em todos os leads)
async function buscarLeadPorRa(ra: string): Promise<{ id: number; name: string } | null> {
  try {
    // Tenta primeiro como query geral (o Kommo indexa campos customizados)
    const data = await kommoGet(
      `/leads?query=${encodeURIComponent(ra.trim())}&limit=5`
    ) as { _embedded?: { leads?: { id: number; name: string; custom_fields_values?: { field_name: string; values: { value: unknown }[] }[] }[] } };
    const leads = data?._embedded?.leads;
    if (!leads?.length) return null;
    // Prefere o lead que tiver o RA exatamente em um campo customizado
    const raLower = ra.trim().toLowerCase();
    const exact = leads.find(l =>
      l.custom_fields_values?.some(cf =>
        cf.values?.some(v => String(v.value).toLowerCase() === raLower)
      )
    );
    const found = exact ?? leads[0];
    return { id: found.id, name: found.name || '' };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers — Detecção de instituição pela pipeline
// ---------------------------------------------------------------------------

/** Retorna 'anhanguera', 'sumare' ou null conforme o nome da pipeline selecionada */
function detectarInstituicao(pipelineName: string): 'anhanguera' | 'sumare' | null {
  const n = pipelineName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (n.includes('anhanguera') || n.includes('anh')) return 'anhanguera';
  if (n.includes('sumare') || n.includes('sum')) return 'sumare';
  return null;
}

/**
 * Monta o payload de custom_fields_values para os campos específicos
 * da instituição (anh_* ou sum_*) a partir dos dados extraídos da planilha.
 */
function buildInstituicaoFields(
  inst: 'anhanguera' | 'sumare',
  dados: { nome: string; telefone: string; ra: string; cpf: string; curso: string; polo: string; situacao: string },
  camposKommo: KommoField[],
): { field_id: number; values: { value: string | number }[] }[] {
  const prefix = inst === 'anhanguera' ? 'anh_' : 'sum_';

  // Mapeamento: nome do campo Kommo → valor da planilha
  const mapa: Record<string, string> = {
    [`${prefix}Nome`]:             dados.nome,
    [`${prefix}Telefone`]:         dados.telefone,
    [`${prefix}RA`]:               dados.ra,
    [`${prefix}CPF`]:              dados.cpf,
    [`${prefix}Curso`]:            dados.curso,
    [`${prefix}Polo`]:             dados.polo,
    [`${prefix}Status Inscrição`]: dados.situacao,
  };

  const result: { field_id: number; values: { value: string | number }[] }[] = [];

  for (const [nomeKommo, valor] of Object.entries(mapa)) {
    if (!valor) continue;
    const campo = camposKommo.find(
      f => f.name.toLowerCase().trim() === nomeKommo.toLowerCase().trim()
    );
    if (!campo) continue;
    result.push({ field_id: campo.id, values: [{ value: valor }] });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helpers — Criação de leads não encontrados
// ---------------------------------------------------------------------------

/** Extrai os campos relevantes de uma linha da planilha para montar o preview e o payload de criação.
 *  Busca por padrões flexíveis para cobrir planilhas brutas e processadas. */
function extrairDadosParaCriacao(row: Record<string, unknown>) {
  const str = (v: unknown) => String(v ?? '').trim();

  // Procura a primeira coluna cujo nome contenha algum dos padrões (case-insensitive)
  const findByPattern = (patterns: string[]): string => {
    const keys = Object.keys(row);
    for (const p of patterns) {
      const pl = p.toLowerCase();
      const key = keys.find(k => k.toLowerCase().trim() === pl);
      if (key) { const v = str(row[key]); if (v) return v; }
    }
    for (const p of patterns) {
      const pl = p.toLowerCase();
      const key = keys.find(k => k.toLowerCase().includes(pl));
      if (key) { const v = str(row[key]); if (v) return v; }
    }
    return '';
  };

  return {
    nome:     findByPattern(['nome completo', 'nome do lead', 'anh_nome', 'sum_nome', 'nome', 'name', 'aluno', 'candidato']),
    telefone: findByPattern(['telefone comercial', 'telefone comercial (contato)', 'anh_telefone', 'sum_telefone', 'telefone', 'celular', 'fone', 'tel', 'phone', 'whatsapp']),
    email:    findByPattern(['e-mail', 'email', 'anh_email', 'sum_email', 'mail']),
    ra:       findByPattern(['ra', 'anh_ra', 'sum_ra', 'registro academico', 'registro acadêmico']),
    cpf:      findByPattern(['cpf', 'anh_cpf', 'sum_cpf', 'c.p.f', 'documento']),
    curso:    findByPattern(['curso', 'anh_curso', 'sum_curso', 'formação', 'formacao', 'graduacao', 'graduação']),
    polo:     findByPattern(['polo', 'anh_polo', 'sum_polo', 'unidade', 'campus']),
    situacao: findByPattern(['situação', 'situacao', 'status', 'anh_situacao', 'sum_situacao', 'anh_status inscrição', 'sum_status inscrição']),
    origem:   findByPattern(['origem', 'anh_origem', 'sum_origem', 'source', 'canal', 'procedencia']),
  };
}

/** Cria um novo lead no Kommo via POST /leads.
 *  Quando telefone é fornecido, embute o contato na mesma requisição. */
async function criarLeadNoKommo(payload: {
  name: string;
  pipelineId?: number;
  statusId?: number;
  responsavelId?: number;
  telefone?: string;
}): Promise<{ id: number; name: string }> {
  const body: Record<string, unknown> = { name: payload.name || 'Sem nome' };
  if (payload.pipelineId)    body.pipeline_id         = payload.pipelineId;
  if (payload.statusId)      body.status_id            = payload.statusId;
  if (payload.responsavelId) body.responsible_user_id  = payload.responsavelId;

  // Kommo API v4: POST /leads não aceita criação de contato inline.
  // Se houver telefone, cria o contato primeiro e depois linka pelo ID.
  if (payload.telefone) {
    const telClean = payload.telefone.replace(/\D/g, '');
    const telFmt   = telClean.startsWith('55') ? `+${telClean}` : `+55${telClean}`;

    const contRes = await kommoFetch('/contacts', 'POST', [{
      name: payload.name || 'Sem nome',
      custom_fields_values: [{
        field_code: 'PHONE',
        values: [{ value: telFmt, enum_code: 'WORK' }],
      }],
    }]) as { _embedded?: { contacts?: { id: number }[] } };

    const contactId = contRes?._embedded?.contacts?.[0]?.id;
    if (contactId) {
      body._embedded = { contacts: [{ id: contactId }] };
    }
  }

  const res = await kommoFetch('/leads', 'POST', [body]) as {
    _embedded?: { leads?: { id: number; name: string }[] };
  };
  const lead = res?._embedded?.leads?.[0];
  if (!lead) throw new Error('Kommo não retornou o lead criado');
  return { id: lead.id, name: lead.name };
}

// ---------------------------------------------------------------------------
// Helpers — Consultar Lead (cache de pipelines e usuários)
// ---------------------------------------------------------------------------
const _pipelineCache: Record<string, { name: string; statuses: Record<number, string> }> = {};
const _userCache: Record<number, string> = {};

type KommoLead = {
  id: number; name: string; pipeline_id: number; status_id: number;
  responsible_user_id: number;
  custom_fields_values?: { field_id: number; field_name: string; values: { value: unknown }[] }[];
  _embedded?: { contacts?: { id: number; name: string }[] };
};
type KommoContact = {
  id: number; name: string;
  custom_fields_values?: { field_type: string; field_name: string; values: { value: unknown; enum_code?: string }[] }[];
};
type KommoPipeline = { id: number; name: string; _embedded?: { statuses?: { id: number; name: string }[] } };

async function kommoFetchPipeline(pipelineId: number, statusId: number): Promise<{ pipeline: string; statusNome: string }> {
  const key = String(pipelineId);
  if (!_pipelineCache[key]) {
    try {
      const data = await kommoGet(`/leads/pipelines/${pipelineId}`) as KommoPipeline;
      const statuses: Record<number, string> = {};
      for (const s of data?._embedded?.statuses ?? []) statuses[s.id] = s.name;
      _pipelineCache[key] = { name: data?.name ?? `Pipeline ${pipelineId}`, statuses };
    } catch {
      _pipelineCache[key] = { name: `Pipeline ${pipelineId}`, statuses: {} };
    }
  }
  const cached = _pipelineCache[key];
  return { pipeline: cached.name, statusNome: cached.statuses[statusId] ?? `Status ${statusId}` };
}

async function kommoFetchUser(userId: number): Promise<string> {
  if (_userCache[userId]) return _userCache[userId];
  try {
    const data = await kommoGet(`/users/${userId}`) as { name?: string };
    _userCache[userId] = data?.name ?? `Usuário ${userId}`;
  } catch {
    _userCache[userId] = `Usuário ${userId}`;
  }
  return _userCache[userId];
}

function extractCustomFieldValue(
  fields: KommoLead['custom_fields_values'],
  names: string[]
): string {
  if (!fields?.length) return '';
  const lower = names.map(n => n.toLowerCase());
  for (const f of fields) {
    const fn = String(f.field_name ?? '').toLowerCase();
    if (lower.some(n => fn.includes(n))) {
      return String(f.values?.[0]?.value ?? '');
    }
  }
  return '';
}

function extractContactPhone(contact: KommoContact): string {
  for (const f of contact?.custom_fields_values ?? []) {
    const isPhone =
      f.field_type === 'multitext' ||
      String(f.field_name ?? '').toLowerCase().includes('telefone') ||
      String(f.field_name ?? '').toLowerCase().includes('phone') ||
      String(f.field_name ?? '').toLowerCase().includes('cel');
    if (isPhone) {
      const val = String(f.values?.[0]?.value ?? '').trim();
      if (val) return val;
    }
  }
  return '';
}

async function buscarDetalhesLead(leadId: number): Promise<LeadDetalhe | null> {
  try {
    const lead = await kommoGet(`/leads/${leadId}?with=contacts`) as KommoLead;
    if (!lead?.id) return null;

    // Contato principal
    let nomeContato = '';
    let telefone = '';
    const contactStub = lead._embedded?.contacts?.[0];
    if (contactStub?.id) {
      try {
        const c = await kommoGet(`/contacts/${contactStub.id}`) as KommoContact;
        nomeContato = c?.name ?? contactStub.name ?? '';
        telefone = extractContactPhone(c);
      } catch {
        nomeContato = contactStub.name ?? '';
      }
    }

    const cf = lead.custom_fields_values ?? [];
    const ra   = extractCustomFieldValue(cf, ['ra', 'anh_ra', 'sum_ra', 'matricula', 'matrícula', 'registro']);
    const polo = extractCustomFieldValue(cf, ['polo', 'anh_polo', 'sum_polo']);

    const { pipeline, statusNome } = await kommoFetchPipeline(lead.pipeline_id, lead.status_id);
    const responsavel = await kommoFetchUser(lead.responsible_user_id);

    return {
      id: lead.id,
      nomeLead: lead.name ?? '',
      nomeContato,
      telefone,
      ra,
      polo,
      pipeline,
      statusNome,
      responsavel,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Componentes auxiliares compartilhados
// ---------------------------------------------------------------------------
function StatCard({ value, label, gradient }: { value: number | string; label: string; gradient?: string }) {
  return (
    <div className="group relative bg-[#161b22] rounded-2xl p-5 border border-white/[0.07] transition-all hover:border-white/[0.12]">
      <p className="text-3xl font-bold text-white" style={gradient ? {
        background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
      } : undefined}>{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</p>
      <p className="text-sm text-slate-400 mt-1">{label}</p>
    </div>
  );
}

function UploadZone({ onFile, accept, label, sublabel }: {
  onFile: (file: File) => void;
  accept?: string;
  label: string;
  sublabel?: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    onFile(file);
  }, [onFile]);

  return (
    <div
      className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
        dragOver ? 'border-blue-500 bg-blue-500/10' : 'border-white/[0.1] hover:border-white/[0.2] bg-white/[0.02]'
      }`}
      onClick={() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept || '.xlsx,.xls';
        input.onchange = () => input.files?.[0] && handleFile(input.files[0]);
        input.click();
      }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
      }}
    >
      <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
      <p className="text-lg text-slate-300 font-medium">{label}</p>
      {sublabel && <p className="text-sm text-slate-500 mt-1">{sublabel}</p>}
      {fileName && (
        <p className="text-sm text-blue-400 mt-3 font-medium">
          <FileSpreadsheet className="w-4 h-4 inline mr-1" />{fileName}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba: Atualizar Kommo
// ---------------------------------------------------------------------------
function AtualizarKommoTab() {
  const [step, setStep] = useState<AkStep>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ atual: 0, total: 0 });

  const [akData, setAkData] = useState<Record<string, unknown>[]>([]);
  const [akColunas, setAkColunas] = useState<string[]>([]);
  const [akFileName, setAkFileName] = useState('');
  const [akPreview, setAkPreview] = useState<Record<string, string[]>>({});

  // Colunas mapeadas por tipo — cada linha usa a primeira que tiver valor
  const [colunaId,   setColunaId]   = useState('');
  const [colunaTel,  setColunaTel]  = useState('');
  const [colunaRa,   setColunaRa]   = useState('');
  const [colunaCpf,  setColunaCpf]  = useState('');
  const [colunaName, setColunaName] = useState('');
  const [autoDetectado, setAutoDetectado] = useState(false);
  const [mostrarManual, setMostrarManual] = useState(false);

  const [resultados, setResultados] = useState<AkRowResult[]>([]);
  const abortRef = useRef(false);

  // ── Estado para o passo "campos" ─────────────────────────────────────────
  const [kommoUsers, setKommoUsers] = useState<KommoUser[]>([]);
  const [kommoPipelines, setKommoPipelines] = useState<KommoPipelineData[]>([]);
  const [kommoCustomFields, setKommoCustomFields] = useState<KommoField[]>([]);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState('');
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([]);
  const [updateResults, setUpdateResults] = useState<AkUpdateResult[]>([]);
  const [cfTab, setCfTab] = useState<'principal' | 'sumare' | 'anhanguera'>('principal');

  // ── Estado para criação de leads não encontrados ─────────────────────────
  const [criacaoSelecionados, setCriacaoSelecionados] = useState<Set<number>>(new Set());
  const [criacaoMeta, setCriacaoMeta] = useState({ pipelineId: '', statusId: '', responsavelId: '' });
  const [criacaoResults, setCriacaoResults] = useState<CriacaoResult[]>([]);
  // Tag(s) a aplicar em todos os leads atualizados/criados pela planilha (vírgula separa múltiplas)
  const [akTag, setAkTag] = useState('');
  // Origem fixa a aplicar em todos os leads criados (enum_id como string; '' = usar planilha ou não definir)
  const [akOrigemEnumId, setAkOrigemEnumId]   = useState('');
  const [akOrigemEnumVal, setAkOrigemEnumVal] = useState('');

  const handleUpload = useCallback(async (file: File) => {
    setLoading(true);
    setError('');
    try {
      const data = await readExcelFile(file);
      const colunas = data.length > 0 ? Object.keys(data[0]) : [];
      setAkData(data);
      setAkColunas(colunas);
      setAkFileName(file.name);

      const preview: Record<string, string[]> = {};
      for (const col of colunas) {
        preview[col] = data.slice(0, 3).map(r => String(r[col] ?? '')).filter(Boolean);
      }
      setAkPreview(preview);

      // Detecta as colunas para cada tipo — independentemente
      const sugId   = detectarColuna(colunas, PATTERNS_ID)   || '';
      const sugTel  = detectarColuna(colunas, PATTERNS_TEL)  || '';
      const sugRa   = detectarColuna(colunas, PATTERNS_RA)   || '';
      const sugCpfAk = detectarColuna(colunas, PATTERNS_CPF) || '';
      const sugName = detectarColuna(colunas, PATTERNS_NOME) || '';

      setColunaId(sugId);
      setColunaTel(sugTel);
      setColunaRa(sugRa);
      setColunaCpf(sugCpfAk);
      setColunaName(sugName);

      const detectado = !!(sugId || sugTel || sugRa || sugCpfAk || sugName);
      setAutoDetectado(detectado);
      setMostrarManual(!detectado);

      setStep('mapeamento');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao ler arquivo');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleIniciarBusca = useCallback(async () => {
    if (!colunaId && !colunaTel && !colunaRa && !colunaCpf && !colunaName) {
      setError('Configure pelo menos uma coluna de busca (ID, Telefone, RA, CPF ou Nome).');
      return;
    }
    if (!env.KOMMO_SUBDOMAIN || !env.KOMMO_TOKEN) {
      setError('Token/Subdomínio do Kommo não configurado. Defina KOMMO_TOKEN e KOMMO_SUBDOMAIN nas variáveis de ambiente.');
      return;
    }

    setLoading(true);
    setError('');
    setStep('buscando');
    setProgress({ atual: 0, total: akData.length });
    abortRef.current = false;

    const results: AkRowResult[] = [];

    for (let i = 0; i < akData.length; i++) {
      if (abortRef.current) break;

      const row = akData[i];
      setProgress({ atual: i + 1, total: akData.length });

      // Monta lista de tentativas na ordem de prioridade, pulando colunas vazias
      const tentativas: { valor: string; tipo: AkCampoBusca }[] = [];
      const vId   = colunaId   ? String(row[colunaId]   ?? '').trim() : '';
      const vTel  = colunaTel  ? String(row[colunaTel]  ?? '').trim() : '';
      const vRa   = colunaRa   ? String(row[colunaRa]   ?? '').trim() : '';
      const vCpf  = colunaCpf  ? String(row[colunaCpf]  ?? '').trim() : '';
      const vName = colunaName ? String(row[colunaName] ?? '').trim() : '';

      if (vId)   tentativas.push({ valor: vId,   tipo: 'id' });
      if (vTel)  tentativas.push({ valor: vTel,  tipo: 'telefone' });
      if (vRa)   tentativas.push({ valor: vRa,   tipo: 'ra' });
      if (vCpf)  tentativas.push({ valor: vCpf,  tipo: 'cpf' });
      if (vName) tentativas.push({ valor: vName, tipo: 'nome' });

      if (tentativas.length === 0) {
        results.push({ idx: i, valorBusca: '—', leadId: null, leadNome: '', status: 'nao_encontrado', selecionado: false });
        continue;
      }

      try {
        let lead: { id: number; name: string } | null = null;
        let valorUsado = '';

        for (const t of tentativas) {
          if (t.tipo === 'id')           lead = await buscarLeadPorId(t.valor);
          else if (t.tipo === 'telefone') lead = await buscarLeadPorTelefone(t.valor);
          else if (t.tipo === 'ra')       lead = await buscarLeadPorRa(t.valor);
          else if (t.tipo === 'cpf')      lead = await buscarLeadPorCpf(t.valor);
          else if (t.tipo === 'nome')     lead = await buscarLeadPorNome(t.valor);

          if (lead) { valorUsado = `${t.tipo.toUpperCase()}: ${t.valor}`; break; }
        }

        if (lead) {
          results.push({ idx: i, valorBusca: valorUsado, leadId: lead.id, leadNome: lead.name, status: 'encontrado', selecionado: true });
        } else {
          const tentado = tentativas.map(t => t.valor).join(' / ');
          results.push({ idx: i, valorBusca: tentado, leadId: null, leadNome: '', status: 'nao_encontrado', selecionado: false });
        }
      } catch (err: unknown) {
        results.push({
          idx: i, valorBusca: tentativas[0]?.valor ?? '?', leadId: null, leadNome: '',
          status: 'erro', erro: err instanceof Error ? err.message : 'Erro',
          selecionado: false,
        });
      }

      if (i < akData.length - 1) await new Promise(r => setTimeout(r, 200));
    }

    setResultados(results);
    setLoading(false);
    setStep('resultado');
  }, [akData, colunaId, colunaTel, colunaRa, colunaCpf, colunaName]);

  const toggleSelecionado = useCallback((idx: number) => {
    setResultados(prev => prev.map(r => r.idx === idx ? { ...r, selecionado: !r.selecionado } : r));
  }, []);

  const toggleTodos = useCallback((sel: boolean) => {
    setResultados(prev => prev.map(r => r.status === 'encontrado' ? { ...r, selecionado: sel } : r));
  }, []);

  const handleReset = useCallback(() => {
    setStep('upload');
    setAkData([]); setAkColunas([]); setAkFileName(''); setAkPreview({});
    setColunaId(''); setColunaTel(''); setColunaRa(''); setColunaCpf(''); setColunaName('');
    setAutoDetectado(false); setMostrarManual(false);
    setResultados([]); setError('');
    setProgress({ atual: 0, total: 0 });
    setFieldConfigs([]); setKommoUsers([]); setKommoPipelines([]); setKommoCustomFields([]);
    setUpdateResults([]); setMetaError('');
    setCriacaoSelecionados(new Set());
    setCriacaoMeta({ pipelineId: '', statusId: '', responsavelId: '' });
    setCriacaoResults([]);
    setAkTag('');
    setAkOrigemEnumId(''); setAkOrigemEnumVal('');
  }, []);

  // ── Criar leads não encontrados ──────────────────────────────────────────
  const handleCriarLeads = useCallback(async () => {
    const indices = Array.from(criacaoSelecionados);
    if (!indices.length) return;

    if (!env.KOMMO_SUBDOMAIN || !env.KOMMO_TOKEN) {
      setError('Token/Subdomínio do Kommo não configurado.');
      return;
    }

    setStep('criando');
    setProgress({ atual: 0, total: indices.length });
    abortRef.current = false;
    const results: CriacaoResult[] = [];

    const pipeId = criacaoMeta.pipelineId    ? parseInt(criacaoMeta.pipelineId,    10) : undefined;
    const statId = criacaoMeta.statusId      ? parseInt(criacaoMeta.statusId,      10) : undefined;
    const respId = criacaoMeta.responsavelId ? parseInt(criacaoMeta.responsavelId, 10) : undefined;

    // Detecta instituição pelo nome da pipeline selecionada
    const pipeNome = kommoPipelines.find(p => String(p.id) === criacaoMeta.pipelineId)?.name ?? '';
    const instituicao = detectarInstituicao(pipeNome);

    // ── Garante campos customizados do Kommo para preencher no lead após criação ──
    let camposKommo = kommoCustomFields;
    if (!camposKommo.length) {
      try { camposKommo = await fetchKommoCustomFields(); setKommoCustomFields(camposKommo); }
      catch { /* prossegue sem campos */ }
    }

    // Prioridade 1: usa fieldConfigs já habilitados pelo usuário (passo "campos")
    // Prioridade 2: auto-mapeia por nome de coluna = nome do campo Kommo
    const enabledCustom = fieldConfigs.filter(c => c.enabled && c.kind === 'custom' && !!c.fieldId && c.coluna);
    const autoMapeados: FieldConfig[] = enabledCustom.length > 0
      ? enabledCustom
      : camposKommo
          .filter(f => !fieldIsSelect(f))
          .flatMap(f => {
            const col = akColunas.find(c => c.toLowerCase().trim() === f.name.toLowerCase().trim());
            if (!col) return [];
            const temDado = akData.some(r => String(r[col] ?? '').trim() !== '');
            if (!temDado) return [];
            return [{
              key: `cf_${f.id}`, label: f.name, kind: 'custom' as const,
              fieldId: f.id, fieldType: f.field_type ?? f.type ?? '',
              enums: [], enabled: true, fonte: 'coluna' as const,
              coluna: col, valorFixo: '', valorId: '', enumValue: '',
            } satisfies FieldConfig];
          });

    for (let i = 0; i < indices.length; i++) {
      if (abortRef.current) break;
      const idx  = indices[i];
      const row  = akData[idx] ?? {};
      const dados = extrairDadosParaCriacao(row);
      setProgress({ atual: i + 1, total: indices.length });

      try {
        // 1. Cria lead (com contato vinculado, se tiver telefone)
        const lead = await criarLeadNoKommo({
          name:          dados.nome,
          pipelineId:    pipeId,
          statusId:      statId,
          responsavelId: respId,
          telefone:      dados.telefone || undefined,
        });

        // 2. Preenche campos customizados via PATCH
        {
          const customFieldsValues: { field_id: number; values: { value: string | number }[] }[] = [];

          // 2a. Campos mapeados manualmente ou por auto-mapeamento de colunas
          for (const cfg of autoMapeados) {
            const rawVal  = row[cfg.coluna] ?? '';
            const textVal = String(rawVal).trim();
            if (!textVal) continue;
            if (fieldIsDate(cfg.fieldType ?? '', cfg.label)) {
              const unix = dateStringToUnix(rawVal);
              if (unix !== null) customFieldsValues.push({ field_id: cfg.fieldId!, values: [{ value: unix }] });
            } else {
              customFieldsValues.push({ field_id: cfg.fieldId!, values: [{ value: textVal }] });
            }
          }

          // 2b. Campos específicos da instituição (anh_* ou sum_*) baseados na pipeline
          if (instituicao) {
            const instFields = buildInstituicaoFields(instituicao, dados, camposKommo);
            for (const f of instFields) {
              if (!customFieldsValues.some(v => v.field_id === f.field_id)) {
                customFieldsValues.push(f);
              }
            }

            // 2c. Campo Origem (select/enum) — prioridade: valor fixo selecionado > coluna da planilha
            const prefix      = instituicao === 'anhanguera' ? 'anh_' : 'sum_';
            const origemField = camposKommo.find(
              f => f.name.toLowerCase().trim() === `${prefix}origem`
            );
            if (origemField && !customFieldsValues.some(v => v.field_id === origemField.id)) {
              // Valor fixo selecionado pelo usuário
              if (akOrigemEnumId && akOrigemEnumVal) {
                customFieldsValues.push({
                  field_id: origemField.id,
                  values: [{ value: akOrigemEnumVal, enum_id: parseInt(akOrigemEnumId, 10) } as { value: string; enum_id?: number }],
                });
              } else if (dados.origem) {
                // Fallback: tenta casar texto da planilha com um enum do Kommo
                const matchEnum = origemField.enums?.find(
                  en => en.value.toLowerCase().trim() === dados.origem.toLowerCase().trim()
                );
                if (matchEnum) {
                  customFieldsValues.push({
                    field_id: origemField.id,
                    values: [{ value: matchEnum.value, enum_id: matchEnum.id } as { value: string; enum_id?: number }],
                  });
                }
              }
            }
          }

          if (customFieldsValues.length > 0) {
            await kommoFetch('/leads', 'PATCH', [{ id: lead.id, custom_fields_values: customFieldsValues }]);
          }
        }

        // Tags a aplicar no lead criado (se configuradas)
        const tagsParsed = akTag.split(',').map(t => t.trim()).filter(Boolean);
        if (tagsParsed.length) {
          await kommoFetch('/leads', 'PATCH', [{
            id: lead.id,
            _embedded: { tags: tagsParsed.map(name => ({ name })) },
          }]);
        }

        results.push({ idx, nome: dados.nome, status: 'ok', leadId: lead.id });
      } catch (err: unknown) {
        results.push({
          idx, nome: dados.nome, status: 'erro',
          erro: err instanceof Error ? err.message : 'Erro desconhecido',
        });
      }

      if (i < indices.length - 1) await new Promise(r => setTimeout(r, 350));
    }

    setCriacaoResults(results);
    setStep('criacao-resultado');
  }, [criacaoSelecionados, criacaoMeta, akData, kommoCustomFields, kommoPipelines, fieldConfigs, akColunas, akTag, akOrigemEnumId, akOrigemEnumVal]);

  // ── Entrar no passo "campos": busca metadados do Kommo e auto-mapeia colunas ──
  const handleEntrarCampos = useCallback(async () => {
    setStep('campos');

    let users     = kommoUsers;
    let pipelines = kommoPipelines;
    let fields    = kommoCustomFields;

    // Só busca da API se ainda não carregou
    if (!fields.length) {
      setMetaLoading(true);
      setMetaError('');
      try {
        [users, pipelines, fields] = await Promise.all([
          fetchKommoUsers(),
          fetchKommoPipelines(),
          fetchKommoCustomFields(),
        ]);
        setKommoUsers(users);
        setKommoPipelines(pipelines);
        setKommoCustomFields(fields);
      } catch (err: unknown) {
        setMetaError(err instanceof Error ? err.message : 'Erro ao carregar metadados do Kommo');
        setMetaLoading(false);
        return;
      }
      setMetaLoading(false);
    }

    // ── Monta configs base ───────────────────────────────────────────────────
    const configs: FieldConfig[] = [
      { key: 'nome', label: 'Nome do Lead', kind: 'nome', enabled: false, fonte: 'coluna', coluna: '', valorFixo: '', valorId: '', enumValue: '' },
      { key: 'responsavel', label: 'Responsável', kind: 'responsavel', enabled: false, fonte: 'fixo', coluna: '', valorFixo: '', valorId: '', enumValue: '' },
      { key: 'status', label: 'Fase / Status', kind: 'status', enabled: false, fonte: 'fixo', coluna: '', valorFixo: '', valorId: '', enumValue: '' },
      ...fields.map(f => ({
        key: `cf_${f.id}`,
        label: f.name,
        kind: 'custom' as const,
        fieldId: f.id,
        fieldType: f.field_type ?? f.type ?? '',
        enums: f.enums ?? [],
        enabled: false,
        fonte: fieldIsSelect(f) ? 'enum' as const : 'coluna' as const,
        coluna: '',
        valorFixo: '',
        valorId: '',
        enumValue: '',
      })),
    ];

    // ── Auto-mapeamento: cruza nomes de colunas da planilha × labels do Kommo ──
    // Monta índice lowercase das colunas disponíveis na planilha
    const colunasIdx: Record<string, string> = {};
    for (const c of akColunas) colunasIdx[c.toLowerCase().trim()] = c;

    // Verifica se a coluna tem ao menos um valor não-vazio na planilha
    const temDados = (col: string) =>
      akData.some(row => String(row[col] ?? '').trim() !== '');

    const configsAutoMapeados = configs.map(cfg => {
      // Responsável e Status requerem seleção manual (IDs do Kommo)
      if (cfg.kind === 'responsavel' || cfg.kind === 'status') return cfg;
      // Campos select: não é possível inferir o enum automaticamente
      if (cfg.fonte === 'enum') return cfg;

      // Tenta match exato (case-insensitive) entre label do campo e nome da coluna
      const colunaMatch = colunasIdx[cfg.label.toLowerCase().trim()];
      if (colunaMatch && temDados(colunaMatch)) {
        return { ...cfg, enabled: true, coluna: colunaMatch };
      }
      return cfg;
    });

    setFieldConfigs(configsAutoMapeados);
  }, [kommoUsers, kommoPipelines, kommoCustomFields, akColunas, akData]);

  // ── Aplicar atualizações no Kommo ────────────────────────────────────────
  const handleAplicarAtualizacoes = useCallback(async () => {
    const selecionados = resultados.filter(r => r.selecionado && r.leadId);
    if (!selecionados.length) return;

    const enabledConfigs = fieldConfigs.filter(c => c.enabled);
    if (!enabledConfigs.length) {
      setMetaError('Selecione pelo menos um campo para atualizar.');
      return;
    }

    setStep('atualizando');
    setProgress({ atual: 0, total: selecionados.length });
    abortRef.current = false;
    const results: AkUpdateResult[] = [];

    for (let i = 0; i < selecionados.length; i++) {
      if (abortRef.current) break;
      const r = selecionados[i];
      const row = akData[r.idx] ?? {};
      setProgress({ atual: i + 1, total: selecionados.length });

      try {
        const body: Record<string, unknown> = {};
        const customFieldsValues: { field_id: number; values: { value: string | number }[] }[] = [];

        console.log('[AK] Lead', r.leadId, '- campos habilitados:', enabledConfigs
          .filter(c => c.kind === 'custom')
          .map(c => ({ label: c.label, fieldType: c.fieldType, isDate: fieldIsDate(c.fieldType ?? '', c.label), col: c.coluna, val: c.fonte === 'coluna' ? row[c.coluna] : c.valorFixo }))
        );

        for (const cfg of enabledConfigs) {
          // rawVal preserva o valor original (pode ser Date, number ou string vindo do xlsx)
          const rawVal  = cfg.fonte === 'coluna' ? (row[cfg.coluna] ?? '') : cfg.valorFixo;
          const textVal = String(rawVal).trim();

          if (cfg.kind === 'nome') {
            if (textVal) body.name = textVal;
          } else if (cfg.kind === 'responsavel') {
            const uid = parseInt(cfg.valorId, 10);
            if (!isNaN(uid)) body.responsible_user_id = uid;
          } else if (cfg.kind === 'status') {
            if (cfg.fonte === 'coluna') {
              // Status vem da planilha: busca o status pelo nome no pipeline de destino
              const pipelineId = parseInt(cfg.valorId.split(':')[0], 10);
              const pipeline   = kommoPipelines.find(p => p.id === pipelineId);
              const nomeStatus = textVal.toLowerCase().trim();
              const matched    = pipeline?.statuses.find(
                s => s.name.toLowerCase().trim() === nomeStatus
              );
              if (!isNaN(pipelineId) && matched) {
                body.pipeline_id = pipelineId;
                body.status_id   = matched.id;
              }
            } else {
              const parts = cfg.valorId.split(':');
              if (parts.length === 2) {
                body.pipeline_id = parseInt(parts[0], 10);
                body.status_id   = parseInt(parts[1], 10);
              }
            }
          } else if (cfg.kind === 'custom' && cfg.fieldId) {
            if (cfg.enums && cfg.enums.length > 0) {
              // Campo select: envia enum_id + value
              const enumId = parseInt(cfg.valorId, 10);
              if (!isNaN(enumId) && cfg.enumValue) {
                customFieldsValues.push({
                  field_id: cfg.fieldId,
                  values: [{ value: cfg.enumValue, enum_id: enumId } as { value: string; enum_id?: number }],
                });
              }
            } else if (fieldIsDate(cfg.fieldType ?? '', cfg.label)) {
              // Campo de data: envia como número inteiro (Unix timestamp em segundos)
              // O Kommo API v4 rejeita strings para campos de data — requer integer JSON
              const unix = dateStringToUnix(rawVal);
              if (unix !== null) {
                customFieldsValues.push({
                  field_id: cfg.fieldId,
                  values: [{ value: unix }],
                });
              }
              // Se rawVal não está vazio mas não parseou como data, avisa nos erros do lead
              else if (textVal) {
                throw new Error(
                  `Campo "${cfg.label}" tem valor de data inválido: "${textVal}". Use o formato DD/MM/AAAA.`
                );
              }
            } else {
              // Campo de texto livre
              if (textVal) customFieldsValues.push({ field_id: cfg.fieldId, values: [{ value: textVal }] });
            }
          }
        }

        if (customFieldsValues.length) body.custom_fields_values = customFieldsValues;

        // Tags a aplicar neste lead (se configuradas pelo usuário)
        const tagsParsed = akTag.split(',').map(t => t.trim()).filter(Boolean);
        if (tagsParsed.length) {
          body._embedded = { tags: tagsParsed.map(name => ({ name })) };
        }

        if (Object.keys(body).length === 0) {
          results.push({ leadId: r.leadId!, leadNome: r.leadNome, status: 'ok' });
          continue;
        }

        console.log('[AK] PATCH lead', r.leadId, '- custom_fields_values:', JSON.stringify(customFieldsValues, null, 2));
        await kommoFetch('/leads', 'PATCH', [{ id: r.leadId, ...body }]);
        results.push({ leadId: r.leadId!, leadNome: r.leadNome, status: 'ok' });
      } catch (err: unknown) {
        results.push({
          leadId: r.leadId!, leadNome: r.leadNome, status: 'erro',
          erro: err instanceof Error ? err.message : 'Erro desconhecido',
        });
      }

      if (i < selecionados.length - 1) await new Promise(res => setTimeout(res, 300));
    }

    setUpdateResults(results);
    setStep('update-resultado');
  }, [resultados, fieldConfigs, akData, akTag, kommoPipelines]);

  const updateFieldConfig = useCallback((key: string, patch: Partial<FieldConfig>) => {
    setFieldConfigs(prev => prev.map(c => c.key === key ? { ...c, ...patch } : c));
  }, []);

  const encontrados = resultados.filter(r => r.status === 'encontrado').length;
  const naoEncontrados = resultados.filter(r => r.status === 'nao_encontrado').length;
  const erros = resultados.filter(r => r.status === 'erro').length;
  const selecionadosCount = resultados.filter(r => r.selecionado).length;
  const progressPercent = progress.total > 0 ? Math.round((progress.atual / progress.total) * 100) : 0;

  const alertaErro = error ? (
    <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
      <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
      <span className="text-red-300 text-sm flex-1">{error}</span>
      <button onClick={() => setError('')}><X className="w-4 h-4 text-red-400" /></button>
    </div>
  ) : null;

  // ── Step: upload ──────────────────────────────────────────────────────────
  if (step === 'upload') return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-white mb-2">Atualizar Leads no Kommo</h2>
        <p className="text-slate-400 max-w-xl mx-auto">
          Faça upload de uma planilha, pesquise os leads no Kommo e configure as atualizações em massa.
        </p>
      </div>

      {alertaErro}

      {/* Visão geral das etapas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { n: 1, label: 'Upload da Planilha', desc: 'Carregue os dados', ativo: true },
          { n: 2, label: 'Configurar Busca', desc: 'Mapeie as colunas', ativo: false },
          { n: 3, label: 'Resultados', desc: 'Leads encontrados', ativo: false },
          { n: 4, label: 'Atualizar', desc: 'Configure e aplique', ativo: false },
        ].map((s) => (
          <div key={s.n} className={`rounded-xl p-4 border text-center transition-all ${s.ativo ? 'border-purple-500/40 bg-purple-500/5' : 'border-white/[0.06] bg-white/[0.02] opacity-40'}`}>
            <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-bold ${s.ativo ? 'bg-purple-500/20 text-purple-400' : 'bg-white/[0.05] text-slate-500'}`}>{s.n}</div>
            <p className={`text-sm font-semibold ${s.ativo ? 'text-white' : 'text-slate-500'}`}>{s.label}</p>
            <p className="text-xs text-slate-600 mt-0.5">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#161b22] rounded-2xl border border-white/[0.07] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <span className="text-white font-semibold">
            <Upload className="w-4 h-4 inline mr-2 text-purple-400" />
            Carregar Planilha com Dados dos Leads
          </span>
        </div>
        <div className="p-6 space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <RotateCcw className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Processando arquivo...</p>
            </div>
          ) : (
            <UploadZone
              onFile={handleUpload}
              label="Arraste a planilha com os dados dos leads"
              sublabel="ou clique para selecionar (.xlsx / .xls)"
            />
          )}
          <div className="rounded-xl bg-white/[0.03] p-4 text-sm text-slate-400 space-y-1.5">
            <p className="font-semibold text-slate-300">Modos de busca disponíveis:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong className="text-blue-400">ID do Lead</strong> — busca direta pelo ID Kommo (mais rápido e preciso)</li>
              <li><strong className="text-purple-400">Telefone</strong> — busca pelo contato associado ao lead</li>
              <li><strong className="text-emerald-400">Pesquisa Geral</strong> — busca por nome, e-mail ou qualquer campo</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Step: mapeamento ──────────────────────────────────────────────────────
  if (step === 'mapeamento') {
    const temAlguma = !!(colunaId || colunaTel || colunaRa || colunaCpf || colunaName);

    // Mini-componente para cada linha de coluna detectada
    const ColunaBadge = ({
      label, cor, coluna, setColuna,
    }: { label: string; cor: string; coluna: string; setColuna: (v: string) => void }) => (
      <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <span className={`text-xs font-bold w-24 shrink-0 ${cor}`}>{label}</span>
        {mostrarManual ? (
          <select
            value={coluna}
            onChange={e => setColuna(e.target.value)}
            className="flex-1 px-2 py-1 bg-[#0d1117] border border-white/[0.08] rounded-lg text-xs text-white [color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="">— não usar —</option>
            {akColunas.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        ) : (
          <span className={`flex-1 text-xs font-mono ${coluna ? 'text-slate-300' : 'text-slate-600 italic'}`}>
            {coluna || 'não encontrada'}
          </span>
        )}
        {coluna && akPreview[coluna]?.length > 0 && (
          <span className="text-xs text-slate-500 font-mono truncate max-w-[120px]">
            ex: {akPreview[coluna][0]}
          </span>
        )}
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${
          coluna ? 'bg-green-500/15 text-green-400' : 'bg-white/[0.04] text-slate-600'
        }`}>
          {coluna ? '✓' : '—'}
        </span>
      </div>
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('upload')} className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-slate-400 transition-all">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white">Busca no Kommo</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              <FileSpreadsheet className="w-3 h-3 inline mr-1" />
              {akFileName} — {akData.length.toLocaleString('pt-BR')} linhas detectadas
            </p>
          </div>
        </div>

        {alertaErro}

        <div className="bg-[#161b22] rounded-2xl border border-white/[0.07] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <span className="text-white font-semibold">Colunas de busca detectadas</span>
              <p className="text-xs text-slate-500 mt-0.5">
                Cada linha usa a primeira coluna que tiver valor — na ordem: ID → Telefone → RA → CPF → Nome
              </p>
            </div>
            {autoDetectado ? (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30 shrink-0">
                ✓ Auto-detectado
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                Configurar manualmente
              </span>
            )}
          </div>

          <div className="p-6 space-y-5">
            {/* Cinco colunas em ordem de prioridade */}
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">Ordem de prioridade por linha:</p>

              <div className="flex items-center gap-2 text-xs text-slate-600 mb-1 px-3">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0">1</span>
              </div>
              <ColunaBadge label="ID do Lead"   cor="text-blue-400"   coluna={colunaId}   setColuna={setColunaId} />

              <div className="flex items-center gap-2 text-xs text-slate-600 px-3">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center shrink-0">2</span>
              </div>
              <ColunaBadge label="Telefone"     cor="text-purple-400" coluna={colunaTel}  setColuna={setColunaTel} />

              <div className="flex items-center gap-2 text-xs text-slate-600 px-3">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0">3</span>
              </div>
              <ColunaBadge label="RA / Matríc." cor="text-amber-400"  coluna={colunaRa}   setColuna={setColunaRa} />

              <div className="flex items-center gap-2 text-xs text-slate-600 px-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">4</span>
              </div>
              <ColunaBadge label="CPF"          cor="text-emerald-400" coluna={colunaCpf}  setColuna={setColunaCpf} />

              <div className="flex items-center gap-2 text-xs text-slate-600 px-3">
                <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center shrink-0">5</span>
              </div>
              <ColunaBadge label="Nome (fallback)" cor="text-rose-400" coluna={colunaName} setColuna={setColunaName} />
            </div>

            <p className="text-xs text-slate-600 italic px-1">
              * Cada linha usa a primeira coluna com valor disponível. Nome é usado como último recurso (pode ter falsos positivos).
            </p>

            {/* Botão principal */}
            <button
              onClick={handleIniciarBusca}
              disabled={!temAlguma}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-base shadow-lg hover:shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Search className="w-4 h-4 inline mr-2" />
              Iniciar Busca ({akData.length.toLocaleString('pt-BR')} leads)
            </button>

            {/* Toggle edição manual */}
            <div className="text-center">
              <button
                onClick={() => setMostrarManual(m => !m)}
                className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-all"
              >
                {mostrarManual ? 'Ocultar edição de colunas' : 'Editar colunas manualmente'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: buscando ────────────────────────────────────────────────────────
  if (step === 'buscando') return (
    <div className="flex flex-col items-center justify-center py-20 space-y-6">
      <div className="w-20 h-20 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
        <RotateCcw className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-1">Buscando no Kommo...</h2>
        <p className="text-sm text-slate-400">
          {progress.atual.toLocaleString('pt-BR')} de {progress.total.toLocaleString('pt-BR')} leads processados
        </p>
      </div>
      <div className="w-80 space-y-1">
        <div className="w-full h-2 bg-white/[0.05] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-right text-xs text-slate-500">{progressPercent}%</p>
      </div>
      <button
        onClick={() => { abortRef.current = true; }}
        className="px-4 py-2 rounded-lg bg-white/[0.05] text-slate-400 border border-white/[0.08] hover:bg-white/[0.08] text-sm transition-all"
      >
        <X className="w-4 h-4 inline mr-1" />Cancelar Busca
      </button>
    </div>
  );

  // ── Step: resultado ───────────────────────────────────────────────────────
  if (step === 'resultado') return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep('mapeamento')} className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-slate-400 transition-all">
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
        <h2 className="text-xl font-bold text-white">Resultados da Busca</h2>
        <span className="ml-auto text-xs px-3 py-1 bg-white/[0.05] text-slate-400 rounded-full">
          {akFileName}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard value={resultados.length} label="Total Processado" />
        <StatCard value={encontrados} label="Encontrados" gradient="linear-gradient(135deg, #00b894, #55efc4)" />
        <StatCard value={naoEncontrados} label="Não Encontrados" gradient="linear-gradient(135deg, #e17055, #fab1a0)" />
        <StatCard value={selecionadosCount} label="Selecionados" gradient="linear-gradient(135deg, #6c5ce7, #a29bfe)" />
      </div>

      {erros > 0 && (
        <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-amber-300 text-sm">{erros} lead(s) tiveram erro na busca. Verifique o token e subdomínio do Kommo.</span>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => toggleTodos(true)}
            className="px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-slate-300 hover:bg-white/[0.08] transition-all"
          >
            Selecionar todos encontrados
          </button>
          <button
            onClick={() => toggleTodos(false)}
            className="px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-slate-300 hover:bg-white/[0.08] transition-all"
          >
            Limpar seleção
          </button>
        </div>
        <button
          onClick={handleEntrarCampos}
          disabled={selecionadosCount === 0}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Zap className="w-4 h-4 inline mr-2" />
          Configurar Atualização ({selecionadosCount})
        </button>
      </div>

      <div className="bg-[#161b22] rounded-2xl border border-white/[0.07] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/[0.06]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Valor Buscado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">ID Lead</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Nome do Lead</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">Selecionar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {resultados.map((r) => (
                <tr key={r.idx} className={`hover:bg-white/[0.02] transition-colors ${r.status !== 'encontrado' ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-2.5 text-xs text-slate-600">{r.idx + 1}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-300 font-mono max-w-[160px] truncate">{r.valorBusca}</td>
                  <td className="px-4 py-2.5">
                    {r.leadId ? (
                      <a
                        href={`https://${env.KOMMO_SUBDOMAIN}.kommo.com/leads/detail/${r.leadId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 font-mono text-sm"
                      >
                        {r.leadId}
                      </a>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-white max-w-[200px] truncate">{r.leadNome || '—'}</td>
                  <td className="px-4 py-2.5">
                    {r.status === 'encontrado' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-medium">
                        <CheckCircle className="w-3 h-3" />Encontrado
                      </span>
                    )}
                    {r.status === 'nao_encontrado' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-xs font-medium">
                        <X className="w-3 h-3" />Não encontrado
                      </span>
                    )}
                    {r.status === 'erro' && (
                      <span
                        title={r.erro}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-xs font-medium cursor-help"
                      >
                        <AlertCircle className="w-3 h-3" />Erro
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {r.status === 'encontrado' && (
                      <input
                        type="checkbox"
                        checked={r.selecionado}
                        onChange={() => toggleSelecionado(r.idx)}
                        className="w-4 h-4 accent-purple-500 cursor-pointer"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Painel: Leads não encontrados ──────────────────────────────────── */}
      {naoEncontrados > 0 && (() => {
        const naoEncontradosList = resultados.filter(r => r.status === 'nao_encontrado' || r.status === 'erro');
        const totalSel = criacaoSelecionados.size;

        const toggleCriacao = (idx: number) => {
          setCriacaoSelecionados(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx); else next.add(idx);
            return next;
          });
        };
        const toggleTodosCriacao = (sel: boolean) => {
          if (sel) setCriacaoSelecionados(new Set(naoEncontradosList.map(r => r.idx)));
          else     setCriacaoSelecionados(new Set());
        };

        return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <h3 className="text-base font-semibold text-white">
                  Leads não encontrados no Kommo
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-400">{naoEncontrados}</span>
                </h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleTodosCriacao(true)}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-slate-300 hover:bg-white/[0.08] transition-all"
                >
                  Selecionar todos
                </button>
                <button
                  onClick={() => toggleTodosCriacao(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-slate-300 hover:bg-white/[0.08] transition-all"
                >
                  Limpar
                </button>
                {totalSel > 0 && (
                  <button
                    onClick={() => {
                      // Garante que metadados do Kommo estejam carregados (reusa o mesmo fetch do passo "campos")
                      if (!kommoUsers.length && !kommoPipelines.length) {
                        setMetaLoading(true);
                        setMetaError('');
                        Promise.all([fetchKommoUsers(), fetchKommoPipelines()])
                          .then(([users, pipes]) => { setKommoUsers(users); setKommoPipelines(pipes); })
                          .catch(e => setMetaError(e instanceof Error ? e.message : 'Erro'))
                          .finally(() => setMetaLoading(false));
                      }
                      setStep('pre-criacao');
                    }}
                    className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 text-white text-xs font-bold shadow hover:shadow-md transition-all"
                  >
                    <Zap className="w-3 h-3 inline mr-1" />
                    Revisar e Criar ({totalSel})
                  </button>
                )}
              </div>
            </div>

            <div className="bg-[#161b22] rounded-2xl border border-red-500/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-red-500/5 border-b border-red-500/15">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Nome</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Telefone</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">RA / CPF</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">E-mail</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Curso</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">Criar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {naoEncontradosList.map((r) => {
                      const dados = extrairDadosParaCriacao(akData[r.idx] ?? {});
                      const sel   = criacaoSelecionados.has(r.idx);
                      return (
                        <tr
                          key={r.idx}
                          className={`hover:bg-white/[0.02] transition-colors cursor-pointer ${sel ? 'bg-red-500/5' : ''}`}
                          onClick={() => toggleCriacao(r.idx)}
                        >
                          <td className="px-4 py-2.5 text-xs text-slate-600">{r.idx + 1}</td>
                          <td className="px-4 py-2.5 text-sm text-white max-w-[160px] truncate">{dados.nome || <span className="text-slate-600 italic">sem nome</span>}</td>
                          <td className="px-4 py-2.5 text-xs font-mono text-slate-300 max-w-[130px] truncate">{dados.telefone || <span className="text-slate-600">—</span>}</td>
                          <td className="px-4 py-2.5 text-xs font-mono text-slate-300">
                            {dados.ra ? <span className="mr-1">RA: {dados.ra}</span> : null}
                            {dados.cpf ? <span className="text-slate-500">CPF: {dados.cpf}</span> : null}
                            {!dados.ra && !dados.cpf && <span className="text-slate-600">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-300 max-w-[160px] truncate">{dados.email || <span className="text-slate-600">—</span>}</td>
                          <td className="px-4 py-2.5 text-xs text-slate-300 max-w-[120px] truncate">{dados.curso || <span className="text-slate-600">—</span>}</td>
                          <td className="px-4 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={sel}
                              onChange={() => toggleCriacao(r.idx)}
                              className="w-4 h-4 accent-red-500 cursor-pointer"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="text-center">
        <button onClick={handleReset} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-300 transition-all">
          <RotateCcw className="w-3 h-3 inline mr-1" />Nova Busca
        </button>
      </div>
    </div>
  );

  // ── Step: campos (skeleton para futuras funções) ───────────────────────────
  // ── Step: campos ─────────────────────────────────────────────────────────
  if (step === 'campos') {
    const stdConfigs = fieldConfigs.filter(c => c.kind !== 'custom');

    // Separa campos customizados por aba (igual ao Kommo)
    const cfPrincipal = fieldConfigs.filter(c => c.kind === 'custom' && !c.label.toLowerCase().startsWith('anh_') && !c.label.toLowerCase().startsWith('sum_'));
    const cfSumare    = fieldConfigs.filter(c => c.kind === 'custom' && c.label.toLowerCase().startsWith('sum_'));
    const cfAnhanguera = fieldConfigs.filter(c => c.kind === 'custom' && c.label.toLowerCase().startsWith('anh_'));

    const cfTabMap = { principal: cfPrincipal, sumare: cfSumare, anhanguera: cfAnhanguera } as const;
    const cfTabVisible = cfTabMap[cfTab];

    const enabledCount = fieldConfigs.filter(c => c.enabled).length;

    const selectCls = 'w-full px-3 py-2 bg-[#0d1117] border border-white/[0.08] rounded-lg text-sm text-white [color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-purple-500';
    const inputCls  = 'w-full px-3 py-2 bg-[#0d1117] border border-white/[0.08] rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500';

    // Campo considerado auto-mapeado quando: habilitado + tem coluna definida + coluna existe na planilha
    const eAutoMapeado = (cfg: FieldConfig) =>
      cfg.enabled && cfg.coluna !== '' && akColunas.includes(cfg.coluna);

    const renderFieldRow = (cfg: FieldConfig) => (
      <div key={cfg.key} className={`flex flex-col gap-2 p-3 rounded-xl border transition-all ${cfg.enabled ? 'border-purple-500/30 bg-purple-500/5' : 'border-white/[0.05] bg-transparent'}`}>
        {/* Cabeçalho */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={cfg.enabled}
            onChange={e => updateFieldConfig(cfg.key, { enabled: e.target.checked })}
            className="w-4 h-4 accent-purple-500 shrink-0 cursor-pointer"
          />
          <span className={`text-sm font-medium ${cfg.enabled ? 'text-white' : 'text-slate-400'}`}>{cfg.label}</span>
          {eAutoMapeado(cfg) && (
            <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shrink-0">
              Auto
            </span>
          )}
        </label>

        {cfg.enabled && (
          <div className="ml-6 space-y-2">
            {/* Responsável: só dropdown de usuário */}
            {cfg.kind === 'responsavel' && (
              <select value={cfg.valorId} onChange={e => updateFieldConfig(cfg.key, { valorId: e.target.value })} className={selectCls}>
                <option value="">-- Selecionar usuário --</option>
                {kommoUsers.map(u => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
              </select>
            )}

            {/* Status: pipeline → status */}
            {cfg.kind === 'status' && (() => {
              const parts    = cfg.valorId.split(':');
              const selPipeId = parts[0] ?? '';
              const selStatId = parts[1] ?? '';
              const selPipe   = kommoPipelines.find(p => String(p.id) === selPipeId);
              return (
                <div className="space-y-2">
                  {/* Toggle fonte */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateFieldConfig(cfg.key, { fonte: 'coluna' })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${cfg.fonte === 'coluna' ? 'bg-purple-600 text-white' : 'bg-white/[0.05] text-slate-400 hover:bg-white/[0.08]'}`}
                    >Da planilha</button>
                    <button
                      onClick={() => updateFieldConfig(cfg.key, { fonte: 'fixo' })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${cfg.fonte === 'fixo' ? 'bg-purple-600 text-white' : 'bg-white/[0.05] text-slate-400 hover:bg-white/[0.08]'}`}
                    >Valor fixo</button>
                  </div>

                  {cfg.fonte === 'coluna' ? (
                    /* Da planilha: pipeline de destino fixo + coluna com o nome do status */
                    <div className="space-y-2">
                      <select
                        value={selPipeId}
                        onChange={e => updateFieldConfig(cfg.key, { valorId: e.target.value + ':' })}
                        className={selectCls}
                      >
                        <option value="">-- Pipeline de destino --</option>
                        {kommoPipelines.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                      </select>
                      <select
                        value={cfg.coluna}
                        onChange={e => updateFieldConfig(cfg.key, { coluna: e.target.value })}
                        className={selectCls}
                      >
                        <option value="">-- Coluna com o nome do status --</option>
                        {akColunas.map(col => <option key={col} value={col}>{col}</option>)}
                      </select>
                      {selPipe && cfg.coluna && (
                        <p className="text-xs text-slate-400">
                          O status será buscado pelo nome no pipeline <span className="text-slate-200 font-medium">{selPipe.name}</span>.
                          Se não encontrado, o lead não será movido.
                        </p>
                      )}
                    </div>
                  ) : (
                    /* Valor fixo: pipeline + status específicos */
                    <div className="flex gap-2">
                      <select
                        value={selPipeId}
                        onChange={e => updateFieldConfig(cfg.key, { valorId: e.target.value + ':' })}
                        className={selectCls}
                      >
                        <option value="">-- Pipeline --</option>
                        {kommoPipelines.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                      </select>
                      <select
                        value={selStatId}
                        onChange={e => updateFieldConfig(cfg.key, { valorId: (selPipeId ?? '') + ':' + e.target.value })}
                        className={selectCls}
                        disabled={!selPipe}
                      >
                        <option value="">-- Status --</option>
                        {(selPipe?.statuses ?? []).map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Campo customizado do tipo SELECT → dropdown com opções do Kommo */}
            {cfg.kind === 'custom' && cfg.enums && cfg.enums.length > 0 && (
              <select
                value={cfg.valorId}
                onChange={e => {
                  const chosen = cfg.enums!.find(en => String(en.id) === e.target.value);
                  updateFieldConfig(cfg.key, { valorId: e.target.value, enumValue: chosen?.value ?? '' });
                }}
                className={selectCls}
              >
                <option value="">-- Selecionar --</option>
                {cfg.enums.map(en => (
                  <option key={en.id} value={String(en.id)}>{en.value}</option>
                ))}
              </select>
            )}

            {/* Campo customizado de texto/data / Nome do Lead → coluna ou valor fixo */}
            {(cfg.kind === 'nome' || (cfg.kind === 'custom' && (!cfg.enums || cfg.enums.length === 0))) && (
              <>
                <div className="flex gap-2">
                  <button onClick={() => updateFieldConfig(cfg.key, { fonte: 'coluna' })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${cfg.fonte === 'coluna' ? 'bg-purple-600 text-white' : 'bg-white/[0.05] text-slate-400 hover:bg-white/[0.08]'}`}>
                    Da planilha
                  </button>
                  <button onClick={() => updateFieldConfig(cfg.key, { fonte: 'fixo' })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${cfg.fonte === 'fixo' ? 'bg-purple-600 text-white' : 'bg-white/[0.05] text-slate-400 hover:bg-white/[0.08]'}`}>
                    Valor fixo
                  </button>
                  {fieldIsDate(cfg.fieldType ?? '', cfg.label) && (
                    <span className="px-2 py-1 rounded-lg text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 font-medium">
                      Data
                    </span>
                  )}
                </div>
                {cfg.fonte === 'coluna' ? (
                  <>
                    <select value={cfg.coluna} onChange={e => updateFieldConfig(cfg.key, { coluna: e.target.value })} className={selectCls}>
                      <option value="">-- Selecionar coluna --</option>
                      {akColunas.map(col => <option key={col} value={col}>{col}</option>)}
                    </select>
                    {fieldIsDate(cfg.fieldType ?? '', cfg.label) && cfg.coluna && (
                      <p className="text-xs text-amber-400/70">
                        Formatos aceitos: DD/MM/AAAA · DD-MM-AAAA · DD.MM.AAAA · AAAA-MM-DD · timestamp Unix
                      </p>
                    )}
                  </>
                ) : fieldIsDate(cfg.fieldType ?? '', cfg.label) ? (
                  // Campo de data: usa input date nativo para garantir formato correto
                  <input
                    type="date"
                    value={cfg.valorFixo}
                    onChange={e => updateFieldConfig(cfg.key, { valorFixo: e.target.value })}
                    className={inputCls}
                  />
                ) : (
                  <input type="text" value={cfg.valorFixo} onChange={e => updateFieldConfig(cfg.key, { valorFixo: e.target.value })}
                    placeholder="Digite o valor que será aplicado a todos os leads..."
                    className={inputCls} />
                )}
              </>
            )}
          </div>
        )}
      </div>
    );

    const autoMapeadosCount = fieldConfigs.filter(eAutoMapeado).length;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('resultado')} className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-slate-400 transition-all">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white">Configurar Atualização</h2>
            <p className="text-xs text-slate-500 mt-0.5">{selecionadosCount} leads · {enabledCount} campo{enabledCount !== 1 ? 's' : ''} selecionado{enabledCount !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Banner de auto-mapeamento */}
        {autoMapeadosCount > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="flex-1">
              <span className="text-emerald-300 font-semibold text-sm">
                {autoMapeadosCount} campo{autoMapeadosCount !== 1 ? 's' : ''} auto-detectado{autoMapeadosCount !== 1 ? 's' : ''} da planilha
              </span>
              <p className="text-emerald-400/60 text-xs mt-0.5">
                Campos com o mesmo nome de colunas da planilha foram habilitados automaticamente. Você pode ajustar ou desmarcar qualquer um.
              </p>
            </div>
          </div>
        )}

        {metaError && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span className="text-red-300 text-sm flex-1">{metaError}</span>
            <button onClick={() => setMetaError('')}><X className="w-4 h-4 text-red-400" /></button>
          </div>
        )}

        {metaLoading ? (
          <div className="flex flex-col items-center py-14 gap-4">
            <RotateCcw className="w-8 h-8 text-purple-400 animate-spin" />
            <p className="text-slate-400 text-sm">Carregando campos do Kommo...</p>
          </div>
        ) : (
          <>
            {/* Campos padrão */}
            <div className="bg-[#161b22] rounded-2xl border border-white/[0.07] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-white">Informações do Lead</span>
              </div>
              <div className="p-4 space-y-2">
                {stdConfigs.map(renderFieldRow)}
              </div>
            </div>

            {/* Campos customizados por aba */}
            <div className="bg-[#161b22] rounded-2xl border border-white/[0.07] overflow-hidden">
              {/* Header com abas */}
              <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2 flex-wrap">
                <SlidersHorizontal className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-sm font-semibold text-white mr-2">Campos Customizados</span>
                {/* Abas */}
                {([
                  { key: 'principal',   label: 'Principal',    count: cfPrincipal.length,  color: 'from-slate-600 to-slate-500' },
                  { key: 'sumare',      label: 'Sumaré',       count: cfSumare.length,     color: 'from-blue-600 to-cyan-600' },
                  { key: 'anhanguera',  label: 'Anhanguera',   count: cfAnhanguera.length, color: 'from-orange-600 to-amber-500' },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setCfTab(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      cfTab === tab.key
                        ? `bg-gradient-to-r ${tab.color} text-white shadow-sm`
                        : 'bg-white/[0.05] text-slate-400 hover:bg-white/[0.08]'
                    }`}
                  >
                    {tab.label}
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${cfTab === tab.key ? 'bg-white/20' : 'bg-white/[0.06]'}`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Lista de campos da aba ativa */}
              <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                {cfTabVisible.length === 0
                  ? <p className="text-sm text-slate-600 text-center py-6">Nenhum campo nesta aba</p>
                  : cfTabVisible.map(renderFieldRow)
                }
              </div>
            </div>

            {/* Input de tag opcional */}
            <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Tag className="w-4 h-4 text-purple-400" />
                Tag para aplicar nos leads atualizados
                <span className="text-xs text-slate-500 font-normal">(opcional · separe múltiplas por vírgula)</span>
              </label>
              <input
                type="text"
                placeholder="ex: planilha-abril, atualizado-dashboard"
                value={akTag}
                onChange={e => setAkTag(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/60"
              />
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={handleAplicarAtualizacoes}
                disabled={selecionadosCount === 0 || enabledCount === 0}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Zap className="w-4 h-4 inline mr-2" />
                Aplicar nos {selecionadosCount} leads selecionados
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Step: atualizando ─────────────────────────────────────────────────────
  if (step === 'atualizando') {
    const pct = progress.total > 0 ? Math.round((progress.atual / progress.total) * 100) : 0;
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <div className="w-20 h-20 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
          <Zap className="w-8 h-8 text-purple-400 animate-pulse" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-1">Atualizando no Kommo...</h2>
          <p className="text-sm text-slate-400">{progress.atual} de {progress.total} leads processados</p>
        </div>
        <div className="w-80 space-y-1">
          <div className="w-full h-2 bg-white/[0.05] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-right text-xs text-slate-500">{pct}%</p>
        </div>
        <button onClick={() => { abortRef.current = true; }} className="px-4 py-2 rounded-lg bg-white/[0.05] text-slate-400 border border-white/[0.08] text-sm hover:bg-white/[0.08] transition-all">
          <X className="w-4 h-4 inline mr-1" />Cancelar
        </button>
      </div>
    );
  }

  // ── Step: update-resultado ────────────────────────────────────────────────
  if (step === 'update-resultado') {
    const okCount  = updateResults.filter(r => r.status === 'ok').length;
    const errCount = updateResults.filter(r => r.status === 'erro').length;
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${errCount === 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
            {errCount === 0 ? <CheckCircle className="w-8 h-8 text-emerald-400" /> : <AlertCircle className="w-8 h-8 text-amber-400" />}
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Atualização concluída</h2>
          <p className="text-slate-400 text-sm">{okCount} atualizados com sucesso · {errCount} com erro</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <StatCard value={okCount}  label="Atualizados" gradient="linear-gradient(135deg,#00b894,#55efc4)" />
          <StatCard value={errCount} label="Erros" gradient={errCount > 0 ? 'linear-gradient(135deg,#e17055,#fab1a0)' : undefined} />
        </div>

        {errCount > 0 && (
          <div className="bg-[#161b22] rounded-2xl border border-white/[0.07] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/[0.06]">
              <span className="text-sm font-semibold text-amber-400">Leads com erro</span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {updateResults.filter(r => r.status === 'erro').map(r => (
                <div key={r.leadId} className="px-5 py-3 flex items-center gap-3">
                  <span className="text-sm text-white font-mono shrink-0">{r.leadId}</span>
                  <span className="text-sm text-slate-300 truncate flex-1">{r.leadNome || '—'}</span>
                  <span className="text-xs text-red-400 truncate max-w-[200px]">{r.erro}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 justify-center">
          <button onClick={() => setStep('resultado')} className="px-5 py-2.5 rounded-xl bg-white/[0.05] text-slate-300 border border-white/[0.08] hover:bg-white/[0.08] font-semibold transition-all">
            <ChevronRight className="w-4 h-4 inline mr-1 rotate-180" />Voltar aos resultados
          </button>
          <button onClick={handleReset} className="px-5 py-2.5 rounded-xl bg-white/[0.05] text-slate-300 border border-white/[0.08] hover:bg-white/[0.08] font-semibold transition-all">
            <RotateCcw className="w-4 h-4 inline mr-1" />Nova busca
          </button>
        </div>
      </div>
    );
  }

  // ── Step: pre-criacao ─────────────────────────────────────────────────────
  if (step === 'pre-criacao') {
    const indices  = Array.from(criacaoSelecionados);
    const selectCls = 'w-full px-3 py-2 bg-[#0d1117] border border-white/[0.08] rounded-lg text-sm text-white [color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-red-500';

    // Pipeline selecionada para filtrar os status disponíveis
    const selPipe = kommoPipelines.find(p => String(p.id) === criacaoMeta.pipelineId);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep('resultado')}
            className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-slate-400 transition-all"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white">Confirmar Criação de Leads</h2>
            <p className="text-xs text-slate-500 mt-0.5">{indices.length} lead(s) serão criados no Kommo</p>
          </div>
        </div>

        {/* Banner de aviso */}
        <div className="flex items-start gap-3 px-4 py-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 font-semibold text-sm">Atenção — Ação irreversível</p>
            <p className="text-amber-200/70 text-sm mt-0.5">
              Os {indices.length} leads abaixo <strong>NÃO foram encontrados</strong> no Kommo durante a busca.
              Ao confirmar, eles serão <strong>criados como novos leads</strong> na sua conta.
              Verifique os dados antes de prosseguir.
            </p>
          </div>
        </div>

        {/* Indicador de instituição detectada */}
        {(() => {
          const pNome = kommoPipelines.find(p => String(p.id) === criacaoMeta.pipelineId)?.name ?? '';
          const inst  = detectarInstituicao(pNome);
          if (!inst) return null;
          const isAnh = inst === 'anhanguera';
          return (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
              isAnh
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                : 'bg-purple-500/10 border-purple-500/30 text-purple-300'
            }`}>
              <CheckCircle className="w-4 h-4 shrink-0" />
              <p className="text-sm">
                Pipeline <strong>{pNome}</strong> detectada como{' '}
                <strong>{isAnh ? 'Anhanguera' : 'Sumaré'}</strong> — os campos{' '}
                <code className="text-xs px-1 py-0.5 rounded bg-white/10">
                  {isAnh ? 'anh_Nome, anh_Telefone, anh_CPF, anh_RA, anh_Curso, anh_Polo, anh_Status Inscrição'
                         : 'sum_Nome, sum_Telefone, sum_CPF, sum_RA, sum_Curso, sum_Polo, sum_Status Inscrição'}
                </code>{' '}
                serão preenchidos automaticamente.
              </p>
            </div>
          );
        })()}

        {/* Metadados opcionais para os novos leads */}
        <div className="bg-[#161b22] rounded-2xl border border-white/[0.07] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <span className="text-white font-semibold text-sm">Configurações para os novos leads</span>
            <p className="text-xs text-slate-500 mt-0.5">Opcional — deixe em branco para usar os padrões da conta Kommo</p>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pipeline */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Pipeline</label>
              {metaLoading ? (
                <div className="h-9 rounded-lg bg-white/[0.04] animate-pulse" />
              ) : (
                <select
                  value={criacaoMeta.pipelineId}
                  onChange={e => setCriacaoMeta(m => ({ ...m, pipelineId: e.target.value, statusId: '' }))}
                  className={selectCls}
                >
                  <option value="">— Padrão da conta —</option>
                  {kommoPipelines.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                </select>
              )}
            </div>
            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Fase / Status</label>
              {metaLoading ? (
                <div className="h-9 rounded-lg bg-white/[0.04] animate-pulse" />
              ) : (
                <select
                  value={criacaoMeta.statusId}
                  onChange={e => setCriacaoMeta(m => ({ ...m, statusId: e.target.value }))}
                  disabled={!selPipe}
                  className={selectCls}
                >
                  <option value="">— Padrão do pipeline —</option>
                  {(selPipe?.statuses ?? []).map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                </select>
              )}
            </div>
            {/* Responsável */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Responsável</label>
              {metaLoading ? (
                <div className="h-9 rounded-lg bg-white/[0.04] animate-pulse" />
              ) : (
                <select
                  value={criacaoMeta.responsavelId}
                  onChange={e => setCriacaoMeta(m => ({ ...m, responsavelId: e.target.value }))}
                  className={selectCls}
                >
                  <option value="">— Padrão da conta —</option>
                  {kommoUsers.map(u => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
                </select>
              )}
            </div>
          </div>
          {metaError && (
            <div className="px-5 pb-4">
              <p className="text-xs text-amber-400">Erro ao carregar metadados: {metaError} — os campos acima ficarão vazios, mas a criação ainda funcionará com os padrões da conta.</p>
            </div>
          )}
          {/* Origem (campo select da instituição) */}
          {(() => {
            const pNome    = kommoPipelines.find(p => String(p.id) === criacaoMeta.pipelineId)?.name ?? '';
            const inst     = detectarInstituicao(pNome);
            if (!inst) return null;
            const prefix   = inst === 'anhanguera' ? 'anh_' : 'sum_';
            const origemKommo = kommoCustomFields.find(
              f => f.name.toLowerCase().trim() === `${prefix}origem`
            );
            if (!origemKommo?.enums?.length && !metaLoading) return null;

            // Verifica se alguma linha da planilha tem coluna de origem preenchida
            const temOrigemNaPlanilha = akData.some(r => {
              const v = extrairDadosParaCriacao(r as Record<string, unknown>).origem;
              return !!v;
            });

            return (
              <div className="px-5 pb-4 border-t border-white/[0.05] pt-4 space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                  <GitBranch className="w-3.5 h-3.5 text-orange-400" />
                  <span>Origem — <code className="text-orange-300 font-mono">{prefix}Origem</code></span>
                  <span className="font-normal text-slate-500">(aplicada em todos os {indices.length} leads)</span>
                </label>

                {temOrigemNaPlanilha && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    Coluna de Origem detectada na planilha — será usada por padrão.
                    Selecione abaixo para sobrescrever com um valor fixo.
                  </div>
                )}

                {metaLoading ? (
                  <div className="h-9 rounded-lg bg-white/[0.04] animate-pulse" />
                ) : (
                  <select
                    value={akOrigemEnumId}
                    onChange={e => {
                      const chosen = origemKommo?.enums?.find(en => String(en.id) === e.target.value);
                      setAkOrigemEnumId(e.target.value);
                      setAkOrigemEnumVal(chosen?.value ?? '');
                    }}
                    className="w-full px-3 py-2 bg-[#0d1117] border border-white/[0.08] rounded-lg text-sm text-white [color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="">
                      {temOrigemNaPlanilha ? '— Usar coluna da planilha —' : '— Não definir Origem —'}
                    </option>
                    {(origemKommo?.enums ?? []).map(en => (
                      <option key={en.id} value={String(en.id)}>{en.value}</option>
                    ))}
                  </select>
                )}

                {akOrigemEnumVal && (
                  <p className="text-xs text-orange-300">
                    Todos os leads serão criados com origem: <strong>{akOrigemEnumVal}</strong>
                  </p>
                )}
              </div>
            );
          })()}

          {/* Tag opcional */}
          <div className="px-5 pb-4 space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Tag className="w-3.5 h-3.5 text-purple-400" />
              Tag para aplicar nos leads criados
              <span className="font-normal text-slate-500">(opcional · separe múltiplas por vírgula)</span>
            </label>
            <input
              type="text"
              placeholder="ex: novo-lead, planilha-abril"
              value={akTag}
              onChange={e => setAkTag(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/60"
            />
          </div>
        </div>

        {/* Tabela de preview */}
        <div className="bg-[#161b22] rounded-2xl border border-white/[0.07] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Preview dos leads a criar</span>
            <span className="text-xs text-slate-500">{indices.length} lead(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Telefone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">RA / CPF</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Curso</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Polo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {indices.map((idx, i) => {
                  const dados = extrairDadosParaCriacao(akData[idx] ?? {});
                  return (
                    <tr key={idx} className={i % 2 === 0 ? 'bg-white/[0.01]' : ''}>
                      <td className="px-4 py-2.5 text-xs text-slate-600">{i + 1}</td>
                      <td className="px-4 py-2.5 text-sm text-white font-medium max-w-[160px] truncate">{dados.nome || <span className="italic text-slate-500">sem nome</span>}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-slate-300">{dados.telefone || <span className="text-slate-600">—</span>}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-slate-300">
                        {dados.ra ? `RA: ${dados.ra}` : dados.cpf ? `CPF: ${dados.cpf}` : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-300 max-w-[120px] truncate">{dados.curso || <span className="text-slate-600">—</span>}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-300 max-w-[100px] truncate">{dados.polo || <span className="text-slate-600">—</span>}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-300">{dados.situacao || <span className="text-slate-600">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex flex-wrap gap-3 justify-end">
          <button
            onClick={() => setStep('resultado')}
            className="px-5 py-2.5 rounded-xl bg-white/[0.05] text-slate-300 border border-white/[0.08] hover:bg-white/[0.08] font-semibold transition-all"
          >
            <ChevronRight className="w-4 h-4 inline mr-1 rotate-180" />Cancelar
          </button>
          <button
            onClick={handleCriarLeads}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold shadow-lg hover:shadow-xl transition-all"
          >
            <Zap className="w-4 h-4 inline mr-2" />
            Confirmar e Criar {indices.length} lead(s)
          </button>
        </div>
      </div>
    );
  }

  // ── Step: criando ─────────────────────────────────────────────────────────
  if (step === 'criando') {
    const pct = progress.total > 0 ? Math.round((progress.atual / progress.total) * 100) : 0;
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <Zap className="w-8 h-8 text-red-400 animate-pulse" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-1">Criando leads no Kommo...</h2>
          <p className="text-sm text-slate-400">{progress.atual} de {progress.total} leads processados</p>
        </div>
        <div className="w-80 space-y-1">
          <div className="w-full h-2 bg-white/[0.05] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-right text-xs text-slate-500">{pct}%</p>
        </div>
        <button
          onClick={() => { abortRef.current = true; }}
          className="px-4 py-2 rounded-lg bg-white/[0.05] text-slate-400 border border-white/[0.08] hover:bg-white/[0.08] text-sm transition-all"
        >
          <X className="w-4 h-4 inline mr-1" />Cancelar
        </button>
      </div>
    );
  }

  // ── Step: criacao-resultado ───────────────────────────────────────────────
  if (step === 'criacao-resultado') {
    const criadosOk  = criacaoResults.filter(r => r.status === 'ok').length;
    const criadosErr = criacaoResults.filter(r => r.status === 'erro').length;
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${criadosErr === 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
            {criadosErr === 0 ? <CheckCircle className="w-8 h-8 text-emerald-400" /> : <AlertCircle className="w-8 h-8 text-amber-400" />}
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Criação concluída</h2>
          <p className="text-slate-400 text-sm">{criadosOk} criados com sucesso · {criadosErr} com erro</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <StatCard value={criadosOk}  label="Criados" gradient="linear-gradient(135deg,#00b894,#55efc4)" />
          <StatCard value={criadosErr} label="Erros" gradient={criadosErr > 0 ? 'linear-gradient(135deg,#e17055,#fab1a0)' : undefined} />
        </div>

        {/* Leads criados com sucesso */}
        {criadosOk > 0 && (
          <div className="bg-[#161b22] rounded-2xl border border-white/[0.07] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/[0.06]">
              <span className="text-sm font-semibold text-emerald-400">Leads criados</span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {criacaoResults.filter(r => r.status === 'ok').map(r => (
                <div key={r.leadId} className="px-5 py-3 flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-sm text-white truncate flex-1">{r.nome || '—'}</span>
                  {r.leadId && (
                    <a
                      href={`https://${env.KOMMO_SUBDOMAIN}.kommo.com/leads/detail/${r.leadId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-mono shrink-0"
                    >
                      <ExternalLink className="w-3 h-3" />#{r.leadId}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leads com erro */}
        {criadosErr > 0 && (
          <div className="bg-[#161b22] rounded-2xl border border-white/[0.07] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/[0.06]">
              <span className="text-sm font-semibold text-red-400">Leads com erro</span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {criacaoResults.filter(r => r.status === 'erro').map((r, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <X className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-sm text-white truncate flex-1">{r.nome || '—'}</span>
                  <span className="text-xs text-red-400 truncate max-w-[220px]">{r.erro}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => setStep('resultado')}
            className="px-5 py-2.5 rounded-xl bg-white/[0.05] text-slate-300 border border-white/[0.08] hover:bg-white/[0.08] font-semibold transition-all"
          >
            <ChevronRight className="w-4 h-4 inline mr-1 rotate-180" />Voltar aos resultados
          </button>
          <button
            onClick={handleReset}
            className="px-5 py-2.5 rounded-xl bg-white/[0.05] text-slate-300 border border-white/[0.08] hover:bg-white/[0.08] font-semibold transition-all"
          >
            <RotateCcw className="w-4 h-4 inline mr-1" />Nova busca
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Aba: Consultar Lead no Kommo
// ---------------------------------------------------------------------------
function ConsultarLeadTab() {
  const [mode, setMode] = useState<ConsultaMode>('id');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<LeadDetalhe[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    if (!env.KOMMO_SUBDOMAIN || !env.KOMMO_TOKEN) {
      setError('Token/Subdomínio do Kommo não configurado.');
      return;
    }
    setLoading(true);
    setError('');
    setResults([]);
    setSearched(false);

    try {
      let leadIds: number[] = [];

      if (mode === 'id') {
        const id = parseInt(q, 10);
        if (!isNaN(id)) leadIds = [id];
      } else if (mode === 'telefone') {
        const clean = q.replace(/\D/g, '');
        const data = await kommoGet(
          `/contacts?query=${encodeURIComponent(clean)}&with=leads&limit=10`
        ) as { _embedded?: { contacts?: { _embedded?: { leads?: { id: number }[] } }[] } };
        for (const c of data?._embedded?.contacts ?? []) {
          for (const l of c._embedded?.leads ?? []) leadIds.push(l.id);
        }
        leadIds = [...new Set(leadIds)].slice(0, 5);
      } else {
        // ra ou geral
        const data = await kommoGet(
          `/leads?query=${encodeURIComponent(q)}&limit=10`
        ) as { _embedded?: { leads?: { id: number }[] } };
        leadIds = (data?._embedded?.leads ?? []).map(l => l.id);
      }

      if (!leadIds.length) {
        setSearched(true);
        setLoading(false);
        return;
      }

      const details: LeadDetalhe[] = [];
      for (const id of leadIds) {
        const d = await buscarDetalhesLead(id);
        if (d) details.push(d);
      }
      setResults(details);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro na busca');
    } finally {
      setSearched(true);
      setLoading(false);
    }
  }, [mode, query]);

  const modeOptions: { value: ConsultaMode; label: string; desc: string; color: string; activeClass: string }[] = [
    { value: 'id',       label: 'ID do Lead',      desc: 'Busca direta pelo ID Kommo',            color: 'text-blue-400',    activeClass: 'border-blue-500/40 bg-blue-500/5' },
    { value: 'ra',       label: 'RA / Matrícula',  desc: 'Busca pelo RA do aluno',                color: 'text-amber-400',   activeClass: 'border-amber-500/40 bg-amber-500/5' },
    { value: 'telefone', label: 'Telefone',         desc: 'Busca pelo telefone do contato',        color: 'text-purple-400',  activeClass: 'border-purple-500/40 bg-purple-500/5' },
    { value: 'geral',    label: 'Pesquisa Geral',   desc: 'Busca por nome, e-mail ou qualquer campo', color: 'text-emerald-400', activeClass: 'border-emerald-500/40 bg-emerald-500/5' },
  ];

  const placeholder: Record<ConsultaMode, string> = {
    id: 'Ex: 23511493',
    ra: 'Ex: 12345678',
    telefone: 'Ex: 11999999999',
    geral: 'Ex: João Silva ou e-mail...',
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-white mb-2">Consultar Lead no Kommo</h2>
        <p className="text-slate-400 max-w-xl mx-auto">
          Busque um lead pelo ID, RA, telefone ou pesquisa geral e visualize seus dados completos.
        </p>
      </div>

      {/* Seletor de modo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {modeOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => { setMode(opt.value); setQuery(''); setResults([]); setSearched(false); }}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              mode === opt.value ? opt.activeClass : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
            }`}
          >
            <p className={`font-semibold text-sm ${mode === opt.value ? opt.color : 'text-slate-300'}`}>{opt.label}</p>
            <p className="text-xs text-slate-500 mt-1">{opt.desc}</p>
          </button>
        ))}
      </div>

      {/* Campo de busca */}
      <div className="bg-[#161b22] rounded-2xl border border-white/[0.07] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <span className="text-white font-semibold">
            <Search className="w-4 h-4 inline mr-2 text-blue-400" />
            Buscar por {modeOptions.find(m => m.value === mode)?.label}
          </span>
        </div>
        <div className="p-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && handleSearch()}
              placeholder={placeholder[mode]}
              className="flex-1 px-4 py-3 bg-[#0d1117] border border-white/[0.08] rounded-xl text-white placeholder:text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading
                ? <RotateCcw className="w-4 h-4 animate-spin" />
                : <Search className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span className="text-red-300 text-sm flex-1">{error}</span>
              <button onClick={() => setError('')}><X className="w-4 h-4 text-red-400" /></button>
            </div>
          )}
        </div>
      </div>

      {/* Resultados */}
      {loading && (
        <div className="flex flex-col items-center py-14 gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <RotateCcw className="w-7 h-7 text-blue-400 animate-spin" />
          </div>
          <p className="text-slate-400 text-sm">Consultando Kommo...</p>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
            <Search className="w-7 h-7 text-slate-600" />
          </div>
          <p className="text-slate-400 font-medium">Nenhum lead encontrado</p>
          <p className="text-slate-600 text-sm mt-1">Tente outro critério de busca</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">{results.length} lead{results.length > 1 ? 's' : ''} encontrado{results.length > 1 ? 's' : ''}</p>
          {results.map(lead => (
            <div key={lead.id} className="bg-[#161b22] rounded-2xl border border-white/[0.07] overflow-hidden">
              {/* Header do card */}
              <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{lead.nomeLead || lead.nomeContato || '—'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{lead.statusNome} · {lead.pipeline}</p>
                </div>
                <a
                  href={`https://${env.KOMMO_SUBDOMAIN}.kommo.com/leads/detail/${lead.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold hover:bg-blue-500/20 transition-all shrink-0"
                >
                  <ExternalLink className="w-3 h-3" />
                  Abrir no Kommo
                </a>
              </div>

              {/* Grid de dados */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0 divide-x divide-y divide-white/[0.04]">
                {[
                  { icon: Hash,       label: 'ID Lead',            value: String(lead.id),          color: 'text-blue-400' },
                  { icon: User,       label: 'Nome do Contato',    value: lead.nomeContato,          color: 'text-white' },
                  { icon: Phone,      label: 'Telefone',           value: lead.telefone,             color: 'text-emerald-400' },
                  { icon: BookOpen,   label: 'RA',                 value: lead.ra,                   color: 'text-amber-400' },
                  { icon: MapPin,     label: 'Polo',               value: lead.polo,                 color: 'text-purple-400' },
                  { icon: GitBranch,  label: 'Pipeline',           value: lead.pipeline,             color: 'text-slate-300' },
                  { icon: CheckCircle,label: 'Status',             value: lead.statusNome,           color: 'text-cyan-400' },
                  { icon: UserCheck,  label: 'Responsável',        value: lead.responsavel,          color: 'text-slate-300' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="px-5 py-4">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Icon className="w-3 h-3 text-slate-600 shrink-0" />
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
                    </div>
                    <p className={`text-sm font-semibold ${value ? color : 'text-slate-700'} truncate`}>
                      {value || '—'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente Principal
// ---------------------------------------------------------------------------
export default function FormatarPlanilhaPage() {
  const [pageTab, setPageTab] = useState<'formatar' | 'atualizar' | 'consultar'>('formatar');
  const [step, setStep] = useState<Step>('inicio');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Base state
  const [baseInfo, setBaseInfo] = useState<BaseInfo | null>(null);
  const [baseRows, setBaseRows] = useState<BaseRow[]>([]);
  const [baseFileName, setBaseFileName] = useState('');

  // Search state
  const [searchData, setSearchData] = useState<Record<string, unknown>[]>([]);
  const [searchColunas, setSearchColunas] = useState<string[]>([]);
  const [searchPreview, setSearchPreview] = useState<Record<string, string[]>>({});
  const [colCpf, setColCpf] = useState('');
  const [colRa, setColRa] = useState('');
  const [colTel, setColTel] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  // Tratar state
  const [tratarRows, setTratarRows] = useState<BaseRow[]>([]);
  const [tratarInfo, setTratarInfo] = useState<BaseInfo | null>(null);
  const [tratarFileName, setTratarFileName] = useState('');

  const toast = useCallback((msg: string, isError = false) => {
    if (isError) setError(msg);
    else setError('');
  }, []);

  // ---- Handlers ----

  const handleUploadBase = useCallback(async (file: File) => {
    setLoading(true);
    setError('');
    try {
      const data = await readExcelFile(file);
      const { rows, resumo } = processarKommo(data);
      setBaseRows(rows);
      setBaseInfo({ ...resumo, nome: file.name });
      setBaseFileName(file.name);
      toast('');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Erro ao processar planilha', true);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleDownloadBase = useCallback(() => {
    const wb = baseRowsToWorkbook(baseRows);
    downloadWorkbook(wb, 'kommo_base_tratada.xlsx');
  }, [baseRows]);

  const handleUploadSearch = useCallback(async (file: File) => {
    setLoading(true);
    setError('');
    try {
      const data = await readExcelFile(file);
      setSearchData(data);

      const colunas = data.length > 0 ? Object.keys(data[0]) : [];
      setSearchColunas(colunas);

      const preview: Record<string, string[]> = {};
      for (const col of colunas) {
        preview[col] = data.slice(0, 3).map(r => String(r[col] ?? '')).filter(Boolean);
      }
      setSearchPreview(preview);

      const sugCpf = detectarColuna(colunas, PATTERNS_CPF);
      const sugRa = detectarColuna(colunas, PATTERNS_RA);
      const sugTel = detectarColuna(colunas, PATTERNS_TEL);
      setColCpf(sugCpf || '');
      setColRa(sugRa || '');
      setColTel(sugTel || '');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Erro ao ler planilha', true);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleExecutarPesquisa = useCallback(() => {
    if (!colCpf && !colRa && !colTel) {
      toast('Selecione pelo menos uma coluna para busca.', true);
      return;
    }
    setLoading(true);
    setError('');

    setTimeout(() => {
      try {
        const indices = construirIndicesBase(baseRows);
        const resultData = searchData.map(row => ({
          ...row,
          'ID Lead Kommo': buscarIdNaBase(
            row,
            colCpf || null, colRa || null, colTel || null,
            indices
          ),
        }));

        const totalLinhas = resultData.length;
        const encontrados = resultData.filter(r => r['ID Lead Kommo'] !== '').length;

        const camposUsados: string[] = [];
        if (colCpf) camposUsados.push('CPF');
        if (colRa) camposUsados.push('RA');
        if (colTel) camposUsados.push('Telefone');

        const colMostrar: string[] = [];
        if (colCpf) colMostrar.push(colCpf);
        if (colRa) colMostrar.push(colRa);
        if (colTel) colMostrar.push(colTel);
        colMostrar.push('ID Lead Kommo');

        const amostra = resultData.slice(0, 30).map(row => {
          const obj: Record<string, string> = {};
          for (const col of colMostrar) obj[col] = String((row as Record<string, unknown>)[col] ?? '');
          return obj;
        });

        const ws = XLSX.utils.json_to_sheet(resultData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Dados');

        setSearchResult({
          totalLinhas,
          encontrados,
          naoEncontrados: totalLinhas - encontrados,
          camposUsados,
          amostra,
          colunasResultado: colMostrar,
          workbook: wb,
        });
        setStep('resultado');
      } catch (err: unknown) {
        toast(err instanceof Error ? err.message : 'Erro na pesquisa', true);
      } finally {
        setLoading(false);
      }
    }, 50);
  }, [baseRows, searchData, colCpf, colRa, colTel, toast]);

  const handleTratarUpload = useCallback(async (file: File) => {
    setLoading(true);
    setError('');
    try {
      const data = await readExcelFile(file);
      const { rows, resumo } = processarKommo(data);
      setTratarRows(rows);
      setTratarInfo(resumo);
      setTratarFileName(file.name);
      setStep('tratar-resultado');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Erro ao processar planilha', true);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleReset = useCallback(() => {
    setStep('inicio');
    setBaseInfo(null);
    setBaseRows([]);
    setBaseFileName('');
    setSearchData([]);
    setSearchColunas([]);
    setSearchPreview({});
    setColCpf('');
    setColRa('');
    setColTel('');
    setSearchResult(null);
    setTratarRows([]);
    setTratarInfo(null);
    setTratarFileName('');
    setError('');
  }, []);

  const taxa = useMemo(() => {
    if (!searchResult || searchResult.totalLinhas === 0) return 0;
    return Math.round((searchResult.encontrados / searchResult.totalLinhas) * 1000) / 10;
  }, [searchResult]);

  // ---- Renders (aba Formatar) ----

  const renderInicio = () => (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-white mb-2">Sistema de Busca de IDs Kommo</h2>
        <p className="text-slate-400">Carregue a base do Kommo, pesquise com outras planilhas e encontre os IDs dos leads.</p>
        <button
          onClick={() => setStep('tratar')}
          className="mt-3 px-4 py-2 rounded-xl bg-white/[0.05] text-slate-300 border border-white/[0.08] hover:bg-white/[0.08] text-sm font-medium transition-all"
        >
          <FileSpreadsheet className="w-4 h-4 inline mr-2" />
          Apenas tratar planilha Kommo (sem pesquisa)
        </button>
      </div>

      {/* Passo 1 */}
      <div className="bg-[#161b22] rounded-2xl border border-white/[0.07] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
          <span className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
            baseInfo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
          }`}>
            {baseInfo ? <CheckCircle className="w-4 h-4" /> : '1'}
          </span>
          <span className="text-white font-semibold">Carregar Base Kommo</span>
          {baseInfo && <span className="ml-auto text-xs px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full font-medium">Carregada</span>}
        </div>
        <div className="p-6">
          {!baseInfo ? (
            <UploadZone
              onFile={handleUploadBase}
              label="Arraste o arquivo Excel do Kommo aqui"
              sublabel="ou clique para selecionar (.xlsx / .xls)"
            />
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <StatCard value={baseInfo.total} label="Total Leads" />
                <StatCard value={baseInfo.cpf} label="CPFs" />
                <StatCard value={baseInfo.ra} label="RAs" />
                <StatCard value={baseInfo.telValido} label="Telefones Válidos" gradient="linear-gradient(135deg, #00b894, #55efc4)" />
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                <button onClick={handleDownloadBase}
                  className="px-5 py-2.5 rounded-xl bg-white/[0.05] text-slate-300 border border-white/[0.08] hover:bg-white/[0.08] font-semibold transition-all">
                  <Download className="w-4 h-4 inline mr-2" />Baixar Base Tratada
                </button>
                <button onClick={() => setStep('pesquisar')}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all">
                  <Search className="w-4 h-4 inline mr-2" />Pesquisar IDs
                </button>
              </div>
              <p className="text-center text-xs text-slate-500 mt-3">
                <FileSpreadsheet className="w-3 h-3 inline mr-1" />{baseFileName}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Passo 2 preview */}
      <div className={`bg-[#161b22] rounded-2xl border border-white/[0.07] overflow-hidden ${!baseInfo ? 'opacity-40 pointer-events-none' : ''}`}>
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.08] text-sm font-bold text-slate-400">2</span>
          <span className="text-white font-semibold">Pesquisar IDs com Planilha de Busca</span>
          {!baseInfo && <span className="ml-auto text-xs px-3 py-1 bg-white/[0.05] text-slate-500 rounded-full font-medium">Aguardando base</span>}
        </div>
        <div className="p-6 text-center text-slate-500">
          {baseInfo ? (
            <>
              <p className="mb-3">Base carregada! Agora você pode pesquisar para encontrar IDs dos leads.</p>
              <button onClick={() => setStep('pesquisar')}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold shadow-lg transition-all">
                <Search className="w-4 h-4 inline mr-2" />Ir para Pesquisa
              </button>
            </>
          ) : (
            <p>Carregue a base Kommo primeiro para desbloquear a pesquisa.</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderPesquisar = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => setStep('inicio')} className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-slate-400 transition-all">
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
        <h2 className="text-xl font-bold text-white">Pesquisar IDs</h2>
        <span className="ml-auto text-xs px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full font-medium">
          Base: {baseInfo?.total.toLocaleString('pt-BR')} leads
        </span>
      </div>

      <div className="bg-[#161b22] rounded-2xl border border-white/[0.07] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <span className="text-white font-semibold"><Upload className="w-4 h-4 inline mr-2" />Carregar Planilha de Pesquisa</span>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-slate-400 text-sm">
            Faça upload da planilha que contém os dados para buscar.
            O sistema detecta automaticamente as colunas de <strong className="text-blue-400">CPF</strong>,{' '}
            <strong className="text-blue-400">RA / Matrícula</strong> e <strong className="text-blue-400">Telefone</strong>,
            e adiciona a coluna <strong className="text-amber-400">ID Lead Kommo</strong> no final.
          </p>

          <UploadZone
            onFile={handleUploadSearch}
            label="Arraste a planilha de pesquisa aqui"
            sublabel="ou clique para selecionar (.xlsx / .xls)"
          />

          {searchColunas.length > 0 && (
            <div className="space-y-5">
              <hr className="border-white/[0.06]" />
              <h3 className="text-white font-semibold">Mapeamento de Colunas</h3>
              <p className="text-slate-500 text-sm">O sistema detectou as colunas abaixo. Confira e ajuste se necessário.</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'CPF', value: colCpf, setter: setColCpf, preview: searchPreview },
                  { label: 'RA / Matrícula', value: colRa, setter: setColRa, preview: searchPreview },
                  { label: 'Telefone', value: colTel, setter: setColTel, preview: searchPreview },
                ].map((field) => (
                  <div key={field.label} className={`rounded-xl p-4 border-2 transition-all ${
                    field.value ? 'border-blue-500/40 bg-blue-500/5' : 'border-white/[0.06] bg-white/[0.02]'
                  }`}>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">{field.label}</label>
                    <select
                      value={field.value}
                      onChange={e => field.setter(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0d1117] border border-white/[0.08] rounded-lg text-sm text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Nenhuma --</option>
                      {searchColunas.map(col => <option key={col} value={col}>{col}</option>)}
                    </select>
                    {field.value && field.preview[field.value] && (
                      <div className="mt-2 px-3 py-2 bg-black/30 rounded-lg">
                        {field.preview[field.value].map((v, i) => (
                          <span key={i} className="block text-xs text-slate-500 truncate font-mono">{v}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="text-center">
                <button
                  onClick={handleExecutarPesquisa}
                  disabled={loading}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <><RotateCcw className="w-4 h-4 inline mr-2 animate-spin" />Pesquisando...</>
                  ) : (
                    <><Search className="w-4 h-4 inline mr-2" />Executar Pesquisa</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderResultado = () => {
    if (!searchResult) return null;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setStep('pesquisar')} className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-slate-400 transition-all">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <h2 className="text-xl font-bold text-white">Resultado da Pesquisa</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard value={searchResult.totalLinhas} label="Linhas na Planilha" />
          <StatCard value={searchResult.encontrados} label="IDs Encontrados" gradient="linear-gradient(135deg, #00b894, #55efc4)" />
          <StatCard value={searchResult.naoEncontrados} label="Sem ID Encontrado" gradient="linear-gradient(135deg, #e17055, #fab1a0)" />
        </div>

        <div className="bg-[#161b22] rounded-2xl border border-white/[0.07] p-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-400 text-sm">
              Busca por {searchResult.camposUsados.map((c, i) => (
                <span key={c}><strong className="text-blue-400">{c}</strong>{i < searchResult.camposUsados.length - 1 ? ' + ' : ''}</span>
              ))}
            </span>
            <span className="font-bold text-blue-400">{taxa}% match</span>
          </div>
          <div className="w-full h-3 bg-white/[0.05] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all" style={{ width: `${taxa}%` }} />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            A coluna <strong className="text-amber-400">ID Lead Kommo</strong> foi adicionada ao final da planilha original.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => downloadWorkbook(searchResult.workbook, 'planilha_com_id_lead.xlsx')}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold shadow-lg transition-all"
          >
            <Download className="w-4 h-4 inline mr-2" />Baixar Planilha com ID Lead
          </button>
          <button
            onClick={() => { setSearchResult(null); setSearchData([]); setSearchColunas([]); setStep('pesquisar'); }}
            className="px-6 py-3 rounded-xl bg-white/[0.05] text-slate-300 border border-white/[0.08] hover:bg-white/[0.08] font-semibold transition-all"
          >
            <Search className="w-4 h-4 inline mr-2" />Nova Pesquisa
          </button>
        </div>

        {searchResult.amostra.length > 0 && (
          <div className="bg-[#161b22] rounded-2xl border border-white/[0.07] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06]">
              <span className="text-white font-semibold">Amostra (primeiras 30 linhas)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/[0.03]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">#</th>
                    {searchResult.colunasResultado.map(col => (
                      <th key={col} className={`px-4 py-3 text-left text-xs font-semibold ${col === 'ID Lead Kommo' ? 'text-amber-400' : 'text-slate-500'}`}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {searchResult.amostra.map((row, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-xs text-slate-600">{i + 1}</td>
                      {searchResult.colunasResultado.map(col => (
                        <td key={col} className={`px-4 py-2.5 text-sm ${
                          col === 'ID Lead Kommo' && row[col] ? 'text-amber-400 font-bold' :
                          col === 'ID Lead Kommo' ? 'text-slate-600' : 'text-slate-300'
                        }`}>{row[col] || '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTratar = () => (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-white mb-2">Tratar Planilha Kommo</h2>
        <p className="text-slate-400">
          Upload da planilha exportada do Kommo para receber uma versão limpa com{' '}
          <strong className="text-blue-400">ID</strong>, <strong className="text-blue-400">CPF</strong>,{' '}
          <strong className="text-blue-400">RA</strong> e <strong className="text-blue-400">Telefone</strong>.
        </p>
      </div>

      <div className="bg-[#161b22] rounded-2xl border border-white/[0.07] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
          <Upload className="w-5 h-5 text-blue-400" />
          <span className="text-white font-semibold">Carregar Planilha do Kommo</span>
        </div>
        <div className="p-6 space-y-5">
          <UploadZone
            onFile={handleTratarUpload}
            label="Arraste o arquivo Excel do Kommo aqui"
            sublabel="ou clique para selecionar (.xlsx / .xls)"
          />
          <div className="rounded-xl bg-white/[0.03] p-4 text-sm text-slate-400 space-y-1.5">
            <p className="font-semibold text-slate-300">O que o tratamento faz:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Busca colunas: <strong>ID</strong>, <strong>CPF</strong> / <strong>anh_CPF</strong>, <strong>RA</strong> / <strong>anh_RA</strong>, <strong>Telefone comercial (contato)</strong></li>
              <li>Consolida CPF e RA (prioriza CPF/RA, preenche com anh_CPF/anh_RA se vazio)</li>
              <li><strong>CPF:</strong> remove pontos, traços e caracteres especiais</li>
              <li><strong>Telefone:</strong> formata como <code className="text-blue-400">+55XXXXXXXXXXX</code> (14 caracteres)</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="text-center">
        <button onClick={() => setStep('inicio')}
          className="px-4 py-2 text-sm text-slate-500 hover:text-slate-300 transition-all">
          Voltar ao início
        </button>
      </div>
    </div>
  );

  const renderTratarResultado = () => (
    <div className="space-y-6">
      <div className="bg-[#161b22] rounded-2xl border border-white/[0.07] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-white font-semibold">Planilha Tratada com Sucesso</span>
          <span className="ml-auto text-xs px-3 py-1 bg-white/[0.05] text-slate-400 rounded-full">{tratarFileName}</span>
        </div>
        <div className="p-6">
          {tratarInfo && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
              <StatCard value={tratarInfo.total} label="Total Leads" />
              <StatCard value={tratarInfo.cpf} label="CPFs Preenchidos" />
              <StatCard value={tratarInfo.ra} label="RAs Preenchidos" />
              <StatCard value={tratarInfo.telefone} label="Telefones" />
              <StatCard value={tratarInfo.telValido} label="Tel. Formato Válido" gradient="linear-gradient(135deg, #00b894, #55efc4)" />
            </div>
          )}

          <div className="flex flex-wrap gap-3 justify-center mb-5">
            <button onClick={() => {
              const wb = baseRowsToWorkbook(tratarRows);
              downloadWorkbook(wb, 'kommo_tratada.xlsx');
            }}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold shadow-lg transition-all">
              <Download className="w-4 h-4 inline mr-2" />Baixar Planilha Tratada
            </button>
            <button onClick={() => { setTratarRows([]); setTratarInfo(null); setStep('tratar'); }}
              className="px-6 py-3 rounded-xl bg-white/[0.05] text-slate-300 border border-white/[0.08] hover:bg-white/[0.08] font-semibold transition-all">
              <RotateCcw className="w-4 h-4 inline mr-2" />Tratar Outra Planilha
            </button>
          </div>
        </div>
      </div>

      {tratarRows.length > 0 && (
        <div className="bg-[#161b22] rounded-2xl border border-white/[0.07] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <span className="text-white font-semibold">Amostra dos dados tratados (primeiras 20 linhas)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/[0.03]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">ID Lead</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">CPF</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">RA</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Telefone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {tratarRows.slice(0, 20).map((row, i) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-xs text-slate-600">{i + 1}</td>
                    <td className="px-4 py-2.5 text-sm text-white font-bold">{row.ID}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-300">{row.CPF || '-'}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-300">{row.RA || '-'}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-300">{row.Telefone || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="text-center">
        <button onClick={handleReset}
          className="px-4 py-2 text-sm text-slate-500 hover:text-slate-300 transition-all">
          Voltar ao início
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen py-8 px-6" style={{ background: 'linear-gradient(135deg, #0c1222 0%, #111a2e 50%, #0f1628 100%)' }}>
      <div className="max-w-5xl mx-auto">

        {/* Tab switcher */}
        <div className="mb-8 flex justify-center">
          <div className="flex rounded-2xl bg-[#161b22] border border-white/[0.07] p-1.5 gap-1">
            <button
              onClick={() => setPageTab('formatar')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                pageTab === 'formatar'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Formatar
            </button>
            <button
              onClick={() => setPageTab('atualizar')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                pageTab === 'atualizar'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md shadow-purple-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-4 h-4" />
              Atualizar Kommo
            </button>
            <button
              onClick={() => setPageTab('consultar')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                pageTab === 'consultar'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Search className="w-4 h-4" />
              Consultar Lead
            </button>
          </div>
        </div>

        {/* Aba: Formatar */}
        {pageTab === 'formatar' && (
          <>
            {loading && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-[#161b22] rounded-2xl p-8 border border-white/[0.1] text-center">
                  <RotateCcw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
                  <p className="text-white font-medium">Processando...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <span className="text-red-300 text-sm flex-1">{error}</span>
                <button onClick={() => setError('')} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
              </div>
            )}

            {step === 'inicio' && renderInicio()}
            {step === 'pesquisar' && renderPesquisar()}
            {step === 'resultado' && renderResultado()}
            {step === 'tratar' && renderTratar()}
            {step === 'tratar-resultado' && renderTratarResultado()}
          </>
        )}

        {/* Aba: Atualizar Kommo */}
        {pageTab === 'atualizar' && <AtualizarKommoTab />}

        {/* Aba: Consultar Lead */}
        {pageTab === 'consultar' && <ConsultarLeadTab />}
      </div>
    </div>
  );
}
