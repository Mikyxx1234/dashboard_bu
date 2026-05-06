# Supabase — Tabelas e Views

URL: `https://tufvduiaybogfhgausqj.supabase.co/rest/v1/...`

Convenções gerais em [`../.cursor/rules/supabase.mdc`](../.cursor/rules/supabase.mdc). Spec OpenAPI completo em `supa_openapi.json` (raiz).

## Tabelas consumidas pelo código

| Tabela | Colunas relevantes | Onde é usada | Operações |
|--------|---------------------|--------------|-----------|
| `Senhas Dash` | login, senha, nome, role | `src/contexts/AuthContext.tsx`, `public/dashboard_consultores.html` | GET (autenticação) |
| `Meta_ANH` | `Inicio`, `fim`, `META_ABAIXO`, `META_INTER`, `META_LEADS`, `META_SUPER`, `GANHO_*` | `src/pages/MetaPage.tsx`, `dashboard_consultores.html`, `src/components/MetaCountdown.tsx` | GET / POST / PATCH / DELETE |
| `sum_leads_ganhos` | `id`, `created_at`, `id_lead`, `consultor`, `Polo` | `dashboard_consultores.html`, `preencher_polo_sumaganhos.py`, `gerar_planilha_ganhos.py`, `MetaCountdown.tsx` | GET / PATCH |
| `anh_leads_ganhos` | `id`, `created_at`, `id_lead`, `consultor`, `Polo` | `gerar_planilha_ganhos.py`, `MetaCountdown.tsx` | GET |
| `avisos` | `id` (uuid), `titulo`, `conteudo`, `urgente` (bool), `ativo` (bool), `created_at` | `src/services/avisosService.ts`, `src/pages/MuralAvisosPage.tsx`, `src/components/AvisoPopup.tsx` | CRUD |
| `confirmacoes_avisos` | `id` (uuid), `aviso_id` (fk → avisos), `consultor`, `confirmado_em` | `src/services/avisosService.ts` | GET / INSERT |
| `eventos_academicos` | `id` (uuid), `titulo`, `descricao`, `data_evento` (date), `tipo`, `created_at` | `src/services/calendarioService.ts`, `src/pages/CalendarioAcademicoPage.tsx` | CRUD |
| `Templates` | (ver tabela) | `src/templates/context/TemplateContext.jsx` | CRUD |
| `Template_Sugestoes` | status, lida | `src/components/Sidebar.tsx`, `src/templates/context/SuggestionContext.jsx` | CRUD |
| `blog_posts` | slug, title, content, created_at | `src/services/blogService.ts` | CRUD |
| `anh_google_sessions` | `created_at`, `device`, `utm_*`, `gclid`, `landing_page`, `ip` | `src/services/sessionsService.ts` (`SessionsDashboard`) | GET (paginado) |

### SQL de criação das novas tabelas

```sql
-- Mural de Avisos
create table public.avisos (
  id           uuid primary key default gen_random_uuid(),
  titulo       text not null,
  conteudo     text not null,
  urgente      boolean not null default false,
  ativo        boolean not null default true,
  created_at   timestamptz not null default now()
);

-- Confirmações de leitura por consultor
create table public.confirmacoes_avisos (
  id             uuid primary key default gen_random_uuid(),
  aviso_id       uuid not null references public.avisos(id) on delete cascade,
  consultor      text not null,
  confirmado_em  timestamptz not null default now(),
  unique (aviso_id, consultor)
);

-- Calendário Acadêmico
create table public.eventos_academicos (
  id           uuid primary key default gen_random_uuid(),
  titulo       text not null,
  descricao    text,
  data_evento  date not null,
  tipo         text not null default 'geral',
  created_at   timestamptz not null default now()
);

-- Índices recomendados
create index on public.confirmacoes_avisos (aviso_id);
create index on public.confirmacoes_avisos (consultor);
create index on public.eventos_academicos (data_evento);
```

> **RLS:** Todas as três tabelas devem ter RLS ativo. Operações de leitura e escrita com a `service_role_key` (já usada no projeto) contornam o RLS normalmente.

## Views consumidas

| View | Coluna de filtro | Onde é usada |
|------|-------------------|--------------|
| `vw_primeira_atribuicao` | `primeira_atribuicao` | `dashboard_consultores.html` (atendidos por consultor) |
| `vw_historico_distribuicao` | `data_distribuicao` | `src/pages/AcademicoColaboradoresPage.tsx` |
| `vw_academico_kpis` | — | `src/pages/AcademicoDashboardPage.tsx` |
| `vw_academico_timeline` | — | `src/pages/AcademicoDashboardPage.tsx` |
| `vw_academico_status_alunos` | — | `src/pages/AcademicoDashboardPage.tsx` |
| `vw_academico_status_financeiro` | — | `src/pages/AcademicoDashboardPage.tsx` |

## Catálogo do schema (não consumidas atualmente)

Existem no Supabase mas ainda não usadas no código React/scripts:

`anh_leads_perdidos`, `sum_leads_perdidos`, `ganhos_sumare`, `ganhos_anhanguera`, `ganhos_sumare_backup`, `ganhos_anhanguera_backup`, `vw_leads_ganhos_sumare`, `vw_leads_ganhos_anhanguera`, `vw_leads_perdidos_sumare`, `vw_leads_perdidos_anhanguera`, `vw_ganhos_anhanguera_todos`, `vw_ganhos_sumare_todos`, `vw_leads_unicos_sumare`, `vw_leads_unicos_anhanguera`, `vw_leads_sumaread_contagem_dia`, `vw_leads_soead_contagem_dia`, `vw_perdidos_leads_cobranca_brasilia`, `chat_messages_anh`, `leads_supervisao_abertos`, `leads_ia_recadastro`, `Perdidos_leads_Cobranca`, `Ganho_leads_cobranca`, `leads_soead`, `leads_sumaread`, `polos_sumare`, `salesbot_anhanguera`, `salesbot_sumare`, `sum_distribuicao_*`, `movimentacao_leads_anhanguera`, `movimentacao_leads_sumare`.

Para consultar a estrutura completa de qualquer uma:

```bash
curl "$SUPABASE_URL/rest/v1/<TABELA>?limit=1" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
```

## Padrão de query

Filtros de data sempre em UTC (ver [supabase.mdc](../.cursor/rules/supabase.mdc)):

```
created_at=gte.2026-04-01T00:00:00&created_at=lte.2026-05-03T23:59:59
```

Polos NULL:

```
sum_leads_ganhos?select=id,id_lead,Polo&Polo=is.null&limit=2000
```

Filtro por consultor:

```
sum_leads_ganhos?consultor=eq.Gabriel&select=id_lead,Polo
```
