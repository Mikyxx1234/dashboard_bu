import * as XLSX from 'xlsx';

// Algoritmo EXATO do FormatarPlanilhaPage.tsx
const PATTERNS_ID  = ['id', 'lead_id', 'id lead', 'id kommo', 'id_lead', 'idlead', 'id do lead'];
const PATTERNS_TEL = ['telefone', 'celular', 'fone', 'tel', 'phone', 'whatsapp', 'whats', 'contato'];
const PATTERNS_RA  = ['matricula', 'matrícula', 'ra', 'registro academico', 'registro acadêmico', 'reg. acad'];

function detectarColuna(colunas, patterns) {
  const colunasLower = {};
  for (const c of colunas) colunasLower[String(c).toLowerCase().trim()] = c;

  // 1a passagem: match exato
  for (const [, lower] of Object.entries(colunasLower)) {
    const lowerKey = lower.toLowerCase().trim();
    for (const p of patterns) {
      if (lowerKey === p) return lower;
    }
  }
  // 2a passagem: substring
  for (const [, lower] of Object.entries(colunasLower)) {
    const lowerKey = lower.toLowerCase().trim();
    for (const p of patterns) {
      if (lowerKey.includes(p)) return lower;
    }
  }
  return null;
}

const wb = XLSX.default.readFile('C:/Users/user/Downloads/Base DD kommo v2.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.default.utils.sheet_to_json(ws, { defval: '' });
const colunas = data.length > 0 ? Object.keys(data[0]) : [];

const sugId  = detectarColuna(colunas, PATTERNS_ID);
const sugTel = detectarColuna(colunas, PATTERNS_TEL);
const sugRa  = detectarColuna(colunas, PATTERNS_RA);

console.log('=== Simulacao EXATA do sistema ===');
console.log('');
console.log('Coluna ID       ->', sugId  ? 'OK: ' + sugId  : 'FALHA: nao detectado');
console.log('Coluna Telefone ->', sugTel ? 'OK: ' + sugTel : 'FALHA: nao detectado');
console.log('Coluna RA       ->', sugRa  ? 'OK: ' + sugRa  : 'FALHA: nao detectado');
console.log('');

const linhasComId = data.filter(r => r['ID'] && String(r['ID']).trim() !== '').length;
const linhasComDados = data.filter(r => Object.values(r).some(v => String(v).trim() !== '')).length;
console.log('Linhas com ID preenchido:', linhasComId, '/ Total com dados:', linhasComDados);
console.log('');

if (sugTel) {
  const linhasComTel = data.filter(r => r[sugTel] && String(r[sugTel]).trim() !== '');
  if (linhasComTel.length > 0) {
    const tel = String(linhasComTel[0][sugTel]);
    const comPlus = tel.startsWith('+');
    console.log('Telefone exemplo:', tel);
    console.log('Com prefixo "+"?', comPlus ? 'SIM' : 'NAO - sistema vai adicionar +55 automaticamente');
  }
}

console.log('');
console.log('=== RESULTADO ===');
const ok = sugId && sugTel && sugRa;
if (ok) {
  console.log('PLANILHA COMPATIVEL COM O SISTEMA!');
  console.log('Basta preencher a coluna ID e os campos desejados.');
} else {
  console.log('PROBLEMAS ENCONTRADOS - veja acima os campos com FALHA.');
}
