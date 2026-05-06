# Scripts standalone

Scripts de manutenção fora da SPA. Convenções gerais em [`../.cursor/rules/scripts-python.mdc`](../.cursor/rules/scripts-python.mdc).

## Encoding obrigatório no Windows

Para qualquer script Python que imprime acentos:

```powershell
$env:PYTHONIOENCODING="utf-8"; python <script>.py
```

## Catálogo

| Arquivo | Linguagem | Propósito |
|---------|-----------|-----------|
| [`../preencher_polo_sumaganhos.py`](../preencher_polo_sumaganhos.py) | Python | Preenche `Polo` em `sum_leads_ganhos` com dados do Kommo |
| [`../gerar_planilha_ganhos.py`](../gerar_planilha_ganhos.py) | Python | Exporta planilha estilizada com ganhos por consultor/dia |
| [`../gerar-planilha-base.mjs`](../gerar-planilha-base.mjs) | Node | Gera template Excel para importação Kommo |
| [`../verificar-planilha.mjs`](../verificar-planilha.mjs) | Node | Valida planilha antes de importar |
| [`../debug-data.mjs`](../debug-data.mjs) | Node | Testa função `dateStringToUnix` |

## Detalhes

### `preencher_polo_sumaganhos.py`

Sincroniza o campo `Polo` do Kommo (custom field `sum_Polo` id `1475381`, fallback `Polo` id `412934`) para a tabela `sum_leads_ganhos`.

**Como rodar:**
```powershell
$env:PYTHONIOENCODING="utf-8"; python preencher_polo_sumaganhos.py
```

**Saída:**
- Stdout: progresso por lote
- `log_polo_sumaganhos.txt`: resultado linha a linha (`OK`, `SEM_POLO`, `ERRO`)

**Configuração no topo do arquivo:**
- `BATCH_KOMMO = 50` (leads por requisição)
- `SUM_POLO_ID = 1475381`, `POLO_ID = 412934`

### `gerar_planilha_ganhos.py`

Gera `Ganhos_Abr_Mai_2026.xlsx` com 3 abas (Consolidado, Anhanguera, Sumaré) usando estilo dark.

**Como rodar:**
```powershell
$env:PYTHONIOENCODING="utf-8"; python gerar_planilha_ganhos.py
```

**Configuração no topo:**
- `DATA_INICIO`, `DATA_FIM`
- `OUTPUT` (caminho do xlsx)
- Cores em constantes `COR_*`

**Dependência:** `openpyxl` (instalado automaticamente se ausente).

### `gerar-planilha-base.mjs`

Gera `planilha_base_kommo.xlsx` com colunas alinhadas ao Kommo (campos `anh_*` / `sum_*`) + aba "Instruções".

```powershell
node gerar-planilha-base.mjs
```

### `verificar-planilha.mjs`

Lê `C:/Users/user/Downloads/Base DD kommo v2.xlsx` (path hardcoded) e diagnostica compatibilidade com a detecção de colunas usada no frontend.

```powershell
node verificar-planilha.mjs
```

### `debug-data.mjs`

Testa cenários da função `dateStringToUnix` (datas vs CPF/telefone/RA). Sem efeitos colaterais.

```powershell
node debug-data.mjs
```

## Criando scripts novos

Use como template:
- Sync Kommo→Supabase: copie `preencher_polo_sumaganhos.py`
- Export Excel: copie `gerar_planilha_ganhos.py`

Lembre-se de:
- Ler credenciais via `os.environ.get()` (não hardcodar)
- Imprimir resumo numérico no fim
- Salvar log detalhado em `.txt` se houver muita iteração
