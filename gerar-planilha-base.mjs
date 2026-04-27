/**
 * Gera a planilha Excel base para preenchimento e atualização de leads no Kommo.
 * Execute com: node gerar-planilha-base.mjs
 */

import * as XLSX from 'xlsx';

// ---------------------------------------------------------------------------
// Definição de colunas
// ---------------------------------------------------------------------------

/**
 * Cada coluna tem:
 *   key      → nome exato do cabeçalho na planilha
 *   exemplo  → valor de exemplo para a linha de referência
 *   grupo    → agrupamento visual
 *   nota     → instrução curta (opcional)
 */
const COLUNAS = [
  // ── Identificação do lead ───────────────────────────────────────────────
  { key: 'ID',              grupo: 'Identificação',  exemplo: '12345678',              nota: 'ID do lead no Kommo (obrigatório para atualizar)' },
  { key: 'Nome do Lead',    grupo: 'Identificação',  exemplo: 'João da Silva',         nota: 'Nome exibido no Kommo' },

  // ── Campos padrão do lead ───────────────────────────────────────────────
  { key: 'Responsável',     grupo: 'Lead',           exemplo: 'Maria Oliveira',        nota: 'Nome do usuário responsável no Kommo' },
  { key: 'Fase / Status',   grupo: 'Lead',           exemplo: 'Qualificado',           nota: 'Nome da fase/funil no Kommo' },

  // ── Campos customizados – Principal ─────────────────────────────────────
  { key: 'CPF',             grupo: 'Principal',      exemplo: '12345678900',           nota: 'Somente números' },
  { key: 'RA',              grupo: 'Principal',      exemplo: '987654321',             nota: 'Registro Acadêmico — somente números' },
  { key: 'Telefone comercial (contato)', grupo: 'Principal', exemplo: '+5511987654321', nota: 'Formato E.164: +55 + DDD + número (14 dígitos)' },

  // ── Campos customizados – Anhanguera (anh_) ──────────────────────────────
  { key: 'anh_Nome',            grupo: 'Anhanguera', exemplo: 'João da Silva',         nota: 'Nome completo do aluno (Anhanguera)' },
  { key: 'anh_CPF',             grupo: 'Anhanguera', exemplo: '12345678900',           nota: 'CPF somente números (Anhanguera)' },
  { key: 'anh_RA',              grupo: 'Anhanguera', exemplo: '987654321',             nota: 'RA/Matrícula somente números (Anhanguera)' },
  { key: 'anh_Telefone',        grupo: 'Anhanguera', exemplo: '+5511987654321',        nota: 'Telefone formato E.164 (Anhanguera)' },
  { key: 'anh_Email',           grupo: 'Anhanguera', exemplo: 'aluno@email.com',       nota: 'E-mail do aluno (Anhanguera)' },
  { key: 'anh_Data Inscricao',  grupo: 'Anhanguera', exemplo: '23/04/2026',            nota: 'Formato DD/MM/AAAA (Anhanguera)' },
  { key: 'anh_Data Matricula',  grupo: 'Anhanguera', exemplo: '25/04/2026',            nota: 'Formato DD/MM/AAAA (Anhanguera)' },
  { key: 'anh_Curso',           grupo: 'Anhanguera', exemplo: 'Administração',         nota: 'Nome do curso (Anhanguera)' },
  { key: 'anh_Polo',            grupo: 'Anhanguera', exemplo: 'Campinas Centro',       nota: 'Nome do polo (Anhanguera)' },

  // ── Campos customizados – Sumaré (sum_) ──────────────────────────────────
  { key: 'sum_Nome',            grupo: 'Sumaré',     exemplo: 'João da Silva',         nota: 'Nome completo do aluno (Sumaré)' },
  { key: 'sum_CPF',             grupo: 'Sumaré',     exemplo: '12345678900',           nota: 'CPF somente números (Sumaré)' },
  { key: 'sum_RA',              grupo: 'Sumaré',     exemplo: '987654321',             nota: 'RA/Matrícula somente números (Sumaré)' },
  { key: 'sum_Telefone',        grupo: 'Sumaré',     exemplo: '+5511987654321',        nota: 'Telefone formato E.164 (Sumaré)' },
  { key: 'sum_Email',           grupo: 'Sumaré',     exemplo: 'aluno@email.com',       nota: 'E-mail do aluno (Sumaré)' },
  { key: 'sum_Data Inscricao',  grupo: 'Sumaré',     exemplo: '23/04/2026',            nota: 'Formato DD/MM/AAAA (Sumaré)' },
  { key: 'sum_Data Matricula',  grupo: 'Sumaré',     exemplo: '25/04/2026',            nota: 'Formato DD/MM/AAAA (Sumaré)' },
  { key: 'sum_Curso',           grupo: 'Sumaré',     exemplo: 'Direito',               nota: 'Nome do curso (Sumaré)' },
  { key: 'sum_Polo',            grupo: 'Sumaré',     exemplo: 'Sumaré',                nota: 'Nome do polo (Sumaré)' },
  { key: 'sum_Cupom',           grupo: 'Sumaré',     exemplo: 'CUPOM2026',             nota: 'Código do cupom, se houver (Sumaré)' },
];

// ---------------------------------------------------------------------------
// Cores por grupo
// ---------------------------------------------------------------------------
const CORES_GRUPO = {
  'Identificação': { fgColor: { rgb: '1E3A5F' } },  // azul escuro
  'Lead':          { fgColor: { rgb: '2D4A22' } },  // verde escuro
  'Principal':     { fgColor: { rgb: '3D2B6B' } },  // roxo escuro
  'Anhanguera':    { fgColor: { rgb: '7B3213' } },  // laranja escuro
  'Sumaré':        { fgColor: { rgb: '0A3A4A' } },  // ciano escuro
};

// ---------------------------------------------------------------------------
// Funções utilitárias
// ---------------------------------------------------------------------------

/** Converte índice de coluna (0-based) para letra(s) do Excel, ex: 0→A, 25→Z, 26→AA */
function colLetra(idx) {
  let s = '';
  let n = idx;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

/** Referência de célula, ex: celRef(0,0) → 'A1' */
function celRef(colIdx, rowIdx) {
  return `${colLetra(colIdx)}${rowIdx + 1}`;
}

// ---------------------------------------------------------------------------
// Construção da workbook
// ---------------------------------------------------------------------------
const wb = XLSX.utils.book_new();

// ── ABA 1: Template (preenchimento) ─────────────────────────────────────────
// IMPORTANTE: a linha 1 (row 0) deve conter os nomes exatos das colunas,
// pois o sistema usa sheet_to_json() que trata a primeira linha como cabeçalho.
{
  const ws = {};
  const totalCols = COLUNAS.length;

  // ── Linha 0 (ROW 1 no Excel): cabeçalhos das colunas — lidos pelo sistema ──
  for (let i = 0; i < COLUNAS.length; i++) {
    const col = COLUNAS[i];
    const ref = celRef(i, 0);
    const cor = CORES_GRUPO[col.grupo] ?? { fgColor: { rgb: '444444' } };
    ws[ref] = {
      v: col.key,
      t: 's',
      s: {
        fill: { fgColor: { rgb: cor.fgColor.rgb } },
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top:    { style: 'medium', color: { rgb: '000000' } },
          bottom: { style: 'medium', color: { rgb: '000000' } },
          left:   { style: 'thin',   color: { rgb: '555555' } },
          right:  { style: 'thin',   color: { rgb: '555555' } },
        },
      },
    };
  }

  // ── Linha 1 (ROW 2 no Excel): linha de exemplo (cinza itálico) ────────────
  for (let i = 0; i < COLUNAS.length; i++) {
    const col = COLUNAS[i];
    const ref = celRef(i, 1);
    ws[ref] = {
      v: col.exemplo,
      t: 's',
      s: {
        fill: { fgColor: { rgb: '1C2333' } },
        font: { italic: true, color: { rgb: '6B7A99' }, sz: 10 },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: {
          bottom: { style: 'dashed', color: { rgb: '444444' } },
          left:   { style: 'thin',   color: { rgb: '333333' } },
          right:  { style: 'thin',   color: { rgb: '333333' } },
        },
      },
    };
  }

  // ── Linhas 2–51 (ROW 3–52 no Excel): linhas vazias para preenchimento ─────
  for (let row = 2; row <= 51; row++) {
    for (let i = 0; i < COLUNAS.length; i++) {
      const ref = celRef(i, row);
      ws[ref] = {
        v: '',
        t: 's',
        s: {
          fill: { fgColor: { rgb: row % 2 === 0 ? '0D1117' : '111827' } },
          font: { color: { rgb: 'E2E8F0' }, sz: 10 },
          alignment: { horizontal: 'left', vertical: 'center' },
          border: {
            left:  { style: 'thin', color: { rgb: '2D3748' } },
            right: { style: 'thin', color: { rgb: '2D3748' } },
          },
        },
      };
    }
  }

  // ── Range da planilha ────────────────────────────────────────────────────
  ws['!ref'] = `A1:${colLetra(totalCols - 1)}52`;

  // ── Largura das colunas ──────────────────────────────────────────────────
  ws['!cols'] = COLUNAS.map(col => {
    const maxLen = Math.max(col.key.length, col.exemplo.length);
    return { wch: Math.min(Math.max(maxLen + 4, 14), 38) };
  });

  // ── Altura das linhas ────────────────────────────────────────────────────
  ws['!rows'] = [
    { hpt: 36 }, // cabeçalho (linha de colunas)
    { hpt: 20 }, // exemplo
  ];

  // ── Congelar 1ª linha e 1ª coluna ───────────────────────────────────────
  ws['!freeze'] = { xSplit: 1, ySplit: 1, topLeftCell: 'B2', activeCell: 'B2', sqref: 'B2' };

  XLSX.utils.book_append_sheet(wb, ws, 'Template');
}

// ── ABA 2: Instruções ───────────────────────────────────────────────────────
{
  const instrucoes = [
    ['INSTRUÇÕES DE PREENCHIMENTO', ''],
    ['', ''],
    ['Campo', 'Instrução'],
    ['ID', 'ID do lead no Kommo — obrigatório para atualizar. Deixe em branco para criar novo lead (funcionalidade futura).'],
    ['Nome do Lead', 'Nome que aparecerá no card do lead dentro do Kommo.'],
    ['Responsável', 'Nome do usuário responsável pelo lead no Kommo (deve existir na conta).'],
    ['Fase / Status', 'Nome exato da fase/funil conforme configurado no Kommo.'],
    ['CPF', 'Somente dígitos, sem pontos ou traços. Ex: 12345678900'],
    ['RA', 'Registro Acadêmico, somente dígitos. Ex: 987654321'],
    ['Telefone comercial (contato)', 'Formato E.164 com DDI+DDD+número, totalizando 14 dígitos. Ex: +5511987654321'],
    ['anh_* / sum_*', 'Campos customizados da faculdade Anhanguera (anh_) ou Sumaré (sum_). Preencha conforme a bandeira do lead.'],
    ['anh_Data Inscricao / sum_Data Inscricao', 'Data no formato DD/MM/AAAA. Ex: 23/04/2026'],
    ['anh_Data Matricula / sum_Data Matricula', 'Data no formato DD/MM/AAAA. Ex: 25/04/2026'],
    ['', ''],
    ['REGRAS GERAIS', ''],
    ['', ''],
    ['1', 'Preencha apenas os campos que deseja atualizar — campos vazios serão ignorados pelo sistema.'],
    ['2', 'A coluna ID é obrigatória para localizar o lead no Kommo.'],
    ['3', 'Não altere os nomes das colunas (linha 2 do Template).'],
    ['4', 'A linha 3 do Template é apenas um exemplo — pode ser apagada antes de enviar.'],
    ['5', 'Datas devem estar no formato DD/MM/AAAA (o sistema converte automaticamente para o Kommo).'],
    ['6', 'Telefones com menos de 10 dígitos após o DDI serão completados com +55 automaticamente.'],
    ['7', 'Salve sempre como .xlsx antes de enviar ao sistema.'],
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(instrucoes);

  // Estilo do título
  ws2['A1'].s = { font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1E3A5F' } } };

  // Cabeçalho da tabela de instruções
  if (ws2['A3']) ws2['A3'].s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '2D4A22' } } };
  if (ws2['B3']) ws2['B3'].s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '2D4A22' } } };

  // Título "REGRAS GERAIS"
  if (ws2['A15']) ws2['A15'].s = { font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '3D2B6B' } } };

  ws2['!cols'] = [{ wch: 42 }, { wch: 80 }];
  ws2['!rows'] = instrucoes.map(() => ({ hpt: 22 }));

  XLSX.utils.book_append_sheet(wb, ws2, 'Instruções');
}

// ---------------------------------------------------------------------------
// Salvar arquivo
// ---------------------------------------------------------------------------
const nomeArquivo = 'planilha_base_kommo.xlsx';
XLSX.writeFile(wb, nomeArquivo);
console.log(`✅  Planilha gerada: ${nomeArquivo}`);
console.log(`   → ${COLUNAS.length} colunas | 50 linhas para preenchimento`);
console.log(`   → Abas: Template | Instruções`);
