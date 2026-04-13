import { useState, useCallback, useMemo } from 'react';
import { Upload, FileSpreadsheet, Search, Download, RotateCcw, CheckCircle, AlertCircle, X, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';

// ---------------------------------------------------------------------------
// Types
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
const PATTERNS_RA = ['matricula', 'matrícula', 'ra', 'registro academico', 'registro acadêmico', 'reg. acad'];
const PATTERNS_TEL = ['telefone', 'celular', 'fone', 'tel', 'phone', 'whatsapp', 'whats', 'contato'];

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
// Componentes auxiliares
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
// Componente Principal
// ---------------------------------------------------------------------------
export default function FormatarPlanilhaPage() {
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

  // ---- Renders ----

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
      </div>
    </div>
  );
}
