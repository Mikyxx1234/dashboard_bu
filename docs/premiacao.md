# Regras de premiação

Lógica implementada em `public/dashboard_consultores.html` (função `updatePremiacao` ~linhas 1887-1950). Defaults definidos no início do script (~1463-1480) e podem ser sobrescritos pela tabela `Meta_ANH` no Supabase.

## Constantes (defaults no HTML)

```js
let META_ABAIXO = 1;
let META_INTER  = 70;
let META_LEADS  = 80;
let META_SUPER  = 96;

// Anhanguera
let GANHO_ABAIXO = 0;
let GANHO_INTER  = 0;
let GANHO_META   = 0;
let GANHO_SUPER  = 0;

// Sumaré — Cupom (nossos polos)
let GANHO_ABAIXO_CUP = 0;
let GANHO_INTER_CUP  = 0;
let GANHO_META_CUP   = 0;
let GANHO_SUPER_CUP  = 0;

// Sumaré — Sem Cupom (outros polos)
let GANHO_ABAIXO_SCUP = 0;
let GANHO_INTER_SCUP  = 0;
let GANHO_META_SCUP   = 0;
let GANHO_SUPER_SCUP  = 0;
```

`fetchMetaFromSupabase()` lê `Meta_ANH` (linha mais recente onde `Inicio <= hoje <= fim`) e sobrescreve os valores acima.

## POLOS_CUPOM (Sumaré)

```js
var POLOS_CUPOM = [
  'barra funda',
  'santo amaro',
  'santana',
  'tatuape',
  'sao miguel'
];
```

Comparação feita pela função `normalizePolo` (lowercase + remove acentos + trim) na função `isCupomPolo(polo)`. Polos fora desta lista contam como "Sem Cupom".

## Cálculo do tier

Baseado em **`totalLeads = ganhosANH + ganhosCupom + ganhosSemCupom`**:

```js
if      (totalLeads >= META_SUPER && META_SUPER > 0) tier = 'Super';
else if (totalLeads >= META_LEADS && META_LEADS > 0) tier = 'Meta';
else if (totalLeads >= META_INTER && META_INTER > 0) tier = 'Inter';
else if (totalLeads > 0 && (META_INTER === 0 || totalLeads < META_INTER)) tier = 'Abaixo';
```

Ordem importa — sempre verifica do maior tier para o menor.

## Cálculo do prêmio

```js
premioANH  = ganhosANH      * GANHO_<tier>;
premioCup  = ganhosCupom    * GANHO_<tier>_CUP;
premioSCup = ganhosSemCupom * GANHO_<tier>_SCUP;

totalPremio = premioANH + premioCup + premioSCup;
```

Onde `<tier>` é `SUPER`, `META`, `INTER` ou `ABAIXO`.

## Origem dos dados

| Variável | Fonte |
|----------|-------|
| `ganhosANH` | Webhook n8n (dashboard_individual_bu) |
| `ganhosCupom` / `ganhosSemCupom` | `fetchSumCupomSplit(consultor, from, to)` → `sum_leads_ganhos` filtrado por `consultor` + período, dividindo via `isCupomPolo(r.Polo)` |
| `META_*` / `GANHO_*` | Tabela `Meta_ANH` (Supabase), com defaults no HTML |

## Janela de cálculo

`Meta_ANH.Inicio` e `Meta_ANH.fim` definem o período da meta vigente. O HTML usa `from`/`to` formatados como `YYYY-MM-DD` para filtrar `created_at` em `sum_leads_ganhos`.

## Card UI

Card oculto (`hidden`) quando:
- `ganhosANH == null`
- ou (`isAdmin` e nenhum consultor selecionado)

Quando `totalLeads === 0`, mostra "Sem leads".
Quando `tier === ''` mas há leads, mostra `'—'`.

## Onde editar valores

UI admin: [`src/pages/MetaPage.tsx`](../src/pages/MetaPage.tsx) edita a tabela `Meta_ANH`.
