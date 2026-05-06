# Dashboard BU — Contexto para o agente

Dashboard interno para consultores das bandeiras **Anhanguera** e **Sumaré**, com integrações ao **Supabase** (banco/REST) e ao **Kommo CRM** (leads/contatos). Inclui ainda páginas administrativas, gestão de blog, dashboards acadêmicos e scripts de manutenção.

## Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind + React Router 7
- **HTML legacy:** `public/dashboard_consultores.html` (~2600 linhas, dashboard standalone do consultor)
- **Persistência:** Supabase (PostgreSQL via PostgREST) — também serve a tabela `anh_google_sessions` consumida pela página de Sessões/UTMs
- **CRM:** Kommo (subdomínio `academicosoead`) atrás do proxy `/kommo-api`
- **Scripts:** Python (`urllib`, `openpyxl`) e Node (`xlsx`, `puppeteer`)

## Comandos

| Comando | Para que serve |
|---------|---------------|
| `npm run dev` | Vite dev server (proxy `/kommo-api` ativo) |
| `npm run build` | Build de produção |
| `npm run typecheck` | Checa tipos sem emitir |
| `npm run lint` | ESLint |
| `python <script>.py` | Roda script Python (ver convenção abaixo) |

**Importante (PowerShell Windows):** antes de rodar Python, defina o encoding para evitar `UnicodeEncodeError` em caracteres como `→` e acentos:

```powershell
$env:PYTHONIOENCODING="utf-8"; python <script>.py
```

Não use `&&` no PowerShell — use `;` ou parâmetros separados.

## Convenções-chave

- **Supabase:** acesso via `fetch` direto em `/rest/v1/...` com headers `apikey` + `Authorization: Bearer`. **Não** usar `@supabase/supabase-js` (instalado mas não utilizado pelas chamadas reais).
- **Kommo:** frontend usa proxy `/kommo-api/api/v4/...`; scripts standalone usam `https://academicosoead.kommo.com/api/v4/...` direto.
- **Env runtime:** chaves vêm de `window.__env__` (injetado por `entrypoint.sh` em produção e `vite.config.ts` em dev) ou `import.meta.env.VITE_*`. Acesse via `src/config.ts`.
- **Tabelas case-sensitive:** nomes literais como `Senhas Dash`, `Meta_ANH`, `Perdidos_leads_Cobranca` devem ser passados exatamente.
- **Datas:** filtros usam `created_at=gte.YYYY-MM-DDT00:00:00&created_at=lte.YYYY-MM-DDT23:59:59`.
- **HTML legacy:** `dashboard_consultores.html` recebe credenciais via querystring (`?sbUrl=&sbAnon=&sbService=`) — quem abre é `src/pages/LeadsDashboard.tsx`.
- **Subdomain Kommo padrão:** `academicosoead`.
- **IDs hardcoded importantes:** `sum_Polo=1475381`, `Polo=412934` (lista completa em [docs/kommo-integracao.md](docs/kommo-integracao.md)).
- **Skeleton loading:** use os componentes de `src/components/Skeleton.tsx` (`SkeletonStat`, `SkeletonCardList`, `SkeletonTableRows`, etc.) em qualquer nova página com carregamento assíncrono.
- **Sidebar:** largura fixa `288 px` (`w-72` no aside, `SIDEBAR_W = 288` no `Layout.tsx`). Adicionar novas rotas em `comercialSections` ou `academicoSections` dentro de `Sidebar.tsx`.
- **Scrollbar:** estilizada globalmente em `src/index.css` — não adicionar estilos de scrollbar inline ou por componente.

## Documentação detalhada

| Arquivo | Conteúdo |
|---------|---------|
| [docs/arquitetura.md](docs/arquitetura.md) | Visão geral, diagrama de fluxos, mapa de páginas |
| [docs/supabase-tabelas.md](docs/supabase-tabelas.md) | Tabelas/views consumidas e onde |
| [docs/kommo-integracao.md](docs/kommo-integracao.md) | IDs custom fields, endpoints, proxy |
| [docs/premiacao.md](docs/premiacao.md) | Regras `META_*`, `GANHO_*`, `POLOS_CUPOM` |
| [docs/scripts.md](docs/scripts.md) | Como rodar cada script Python/Node |
| [docs/ambiente.md](docs/ambiente.md) | Variáveis de ambiente, Docker, deploy |
| [docs/seguranca.md](docs/seguranca.md) | Riscos de segurança e mitigações (P0–P3) |

## Regras Cursor ativas

- [.cursor/rules/supabase.mdc](.cursor/rules/supabase.mdc) — convenções PostgREST
- [.cursor/rules/kommo.mdc](.cursor/rules/kommo.mdc) — proxy e custom fields
- [.cursor/rules/scripts-python.mdc](.cursor/rules/scripts-python.mdc) — encoding/PowerShell
- [.cursor/rules/frontend.mdc](.cursor/rules/frontend.mdc) — React/TS/HTML legacy

## Novos módulos (mai/2026)

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/MuralAvisosPage.tsx` | Mural de avisos com confirmação de leitura por consultor |
| `src/pages/CalendarioAcademicoPage.tsx` | Calendário de eventos acadêmicos |
| `src/pages/MetaCampanhas.tsx` | Campanhas Meta Ads (visual padronizado com o dashboard) |
| `src/components/AvisoPopup.tsx` | Popup sequencial de avisos não confirmados (montado em `Layout`) |
| `src/components/MetaCountdown.tsx` | Barra de progresso de meta + countdown no topo do conteúdo |
| `src/components/Skeleton.tsx` | Skeletons reutilizáveis (`SkeletonStat`, `SkeletonTableRows`, …) |
| `src/services/avisosService.ts` | CRUD `avisos` + `confirmacoes_avisos` |
| `src/services/calendarioService.ts` | CRUD `eventos_academicos` |

Tabelas Supabase criadas para esses módulos: `avisos`, `confirmacoes_avisos`, `eventos_academicos` — ver SQL completo em [docs/supabase-tabelas.md](docs/supabase-tabelas.md).

## Avisos

- Tokens estão em texto claro em `preencher_polo_sumaganhos.py` e `gerar_planilha_ganhos.py`. Não introduza novos segredos no código — use `os.environ.get()` / `import.meta.env`.
- `public/dashboard_consultores.html` é grande (~2600 linhas); prefira usar `Grep` direcionado em vez de ler integralmente.
