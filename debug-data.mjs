// Replica a lógica corrigida do dateStringToUnix
function dateStringToUnix(val) {
  if (val == null || val === '') return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return Math.floor(Date.UTC(val.getFullYear(), val.getMonth(), val.getDate()) / 1000);
  }
  if (typeof val === 'number') {
    if (!isFinite(val)) return null;
    if (val > 25000 && val < 60000) return Math.round((val - 25569) * 86400);
    // Intervalo razoável 1980-2099 (rejeita CPFs como 48281105852)
    if (val >= 315532800 && val <= 4070908800) return Math.floor(val);
    return null;
  }
  const v = String(val).trim();
  if (!v) return null;
  let d = null;
  // Apenas 9-10 dígitos em intervalo 1980-2099 (rejeita CPFs de 11 dígitos)
  if (/^\d{9,10}$/.test(v)) {
    const ts = parseInt(v, 10);
    if (ts >= 315532800 && ts <= 4070908800) return ts;
  }
  if (/^\d{4,5}$/.test(v)) {
    const serial = parseInt(v, 10);
    if (serial > 25000 && serial < 60000) return Math.round((serial - 25569) * 86400);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
    d = new Date(v.slice(0, 10) + 'T00:00:00Z');
  } else if (/^\d{4}\/\d{2}\/\d{2}/.test(v)) {
    d = new Date(v.slice(0,4)+'-'+v.slice(5,7)+'-'+v.slice(8,10)+'T00:00:00Z');
  } else if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(v)) {
    const sep = v[2];
    const p = v.split(sep === '/' ? '/' : '-');
    d = new Date(p[2].slice(0,4)+'-'+p[1]+'-'+p[0]+'T00:00:00Z');
  } else if (/^\d{2}\.\d{2}\.\d{4}/.test(v)) {
    const p = v.split('.');
    d = new Date(p[2].slice(0,4)+'-'+p[1]+'-'+p[0]+'T00:00:00Z');
  } else if (/^\d{4}\.\d{2}\.\d{2}/.test(v)) {
    d = new Date(v.slice(0,10).replace(/\./g,'-')+'T00:00:00Z');
  }
  if (!d || isNaN(d.getTime())) return null;
  return Math.floor(d.getTime() / 1000);
}

// Testa todos os valores problemáticos
const testes = [
  // Valores de data válidos
  ['23/04/2026', 'string BR'],
  ['25/04/2026', 'string BR'],
  ['2026-04-23', 'ISO'],
  // CPFs (devem retornar NULL)
  [48281105852, 'CPF numérico'],
  ['48281105852', 'CPF string'],
  // Telefones (devem retornar NULL)
  [5511944690752, 'Telefone numérico'],
  ['5511944690752', 'Telefone string'],
  // RA (deve retornar NULL — não é data)
  [26450978, 'RA numérico'],
];

console.log('=== Testes de dateStringToUnix ===');
testes.forEach(([val, label]) => {
  const result = dateStringToUnix(val);
  const date = result ? new Date(result * 1000).toISOString().slice(0,10) : 'null';
  const status = (label.includes('CPF') || label.includes('Telefone')) 
    ? (result === null ? '✅ OK (null)' : '❌ ERRO (deveria ser null)') 
    : (result !== null ? '✅ OK' : '❌ ERRO (deveria ser timestamp)');
  console.log(`  "${val}" [${label}]: ${result} (${date}) ${status}`);
});
