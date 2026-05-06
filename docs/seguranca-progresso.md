# Progresso da implementação de segurança

Checkpoint do estado atual. Continuar daqui na próxima sessão.

> **Última atualização:** 2026-05-06 (remoção do `api-server.js` — sessões agora via PostgREST)

## O que foi concluído

### Fase A — Documentação

- [x] [docs/seguranca.md](seguranca.md) criado com 20 riscos catalogados (P0-P3)
- [x] [docs/migracao-auth.md](migracao-auth.md) com guia passo-a-passo da migração para Supabase Auth
- [x] Links em [AGENTS.md](../AGENTS.md) e [docs/README.md](README.md)

### Fase B — P0 (parcial)

- [x] **R3 — Postgres credentials.** Inicialmente movido para `process.env` em `api-server.js`. Em **2026-05-06** o `api-server.js` foi **removido por completo** — sessões migradas para PostgREST direto (`anh_google_sessions`). Senha do Postgres `147.93.34.2` continua precisando ser **rotacionada** por causa do histórico Git.
- [x] **R5 — Scripts Python.** [preencher_polo_sumaganhos.py](../preencher_polo_sumaganhos.py) e [gerar_planilha_ganhos.py](../gerar_planilha_ganhos.py) leem de `os.environ.get()` (com helper `_load_dotenv` interno e mensagem clara se ausente). Validado: erro claro quando vars ausentes.
- [x] **R1+R2+R6 — Migração auth (documentação).** Guia completo em [docs/migracao-auth.md](migracao-auth.md). Código de produção **não foi alterado** propositalmente — quebraria o login. Aguarda execução coordenada (SQL Supabase + refactor frontend).
- [x] **R7 — Superfície removida.** O `api-server.js` foi deletado em 2026-05-06 (assim como `npm run api`, deps `express`/`cors`/`helmet`/`pg`/`express-rate-limit`/`dotenv`, vars `DB_*`/`API_*`/`CORS_*` do `.env.example` e proxy `/api/sessions` no `vite.config.ts`). A página `SessionsDashboard` agora consome `anh_google_sessions` direto via PostgREST em [src/services/sessionsService.ts](../src/services/sessionsService.ts). Risco residual (service_role no browser) cai em R1.

## O que está pendente

### Pendências imediatas (R3 / R5 — ação humana)

Apesar do código estar refatorado, ainda falta **rotacionar as credenciais já vazadas no histórico Git**:

- [ ] Trocar a senha do Postgres `147.93.34.2` (estava em commits antigos do extinto `api-server.js`)
- [ ] Rotacionar `service_role` key do Supabase
- [ ] Rotacionar token Kommo
- [ ] Criar `.env` local com novos valores
- [ ] Considerar `bfg` para limpar histórico Git (procedimento em [seguranca.md](seguranca.md#limpeza-do-histórico-git-r33))

### Fase B — restante

- [ ] **R4 — postMessage no iframe.** Depende de R1 (Supabase Auth ativo). Quando R1 estiver feito:
  - Modificar [src/pages/LeadsDashboard.tsx](../src/pages/LeadsDashboard.tsx) para enviar `access_token` via `postMessage`
  - Atualizar `public/dashboard_consultores.html` para escutar `message` em vez de ler querystring
  - Snippets prontos em [migracao-auth.md](migracao-auth.md#25--atualizar-leadsdashboardtsx-e-r4-ao-mesmo-tempo)
- [ ] **R1+R2+R6 — Execução.** Ver checklist completo em [migracao-auth.md](migracao-auth.md#status-atual)

### Fase C — P1

- [x] R7 (já feito junto com R3)
- [x] **R8 — Headers de segurança nginx.** Aplicado em [nginx.conf.template](../nginx.conf.template) e [nginx.conf](../nginx.conf):
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `Permissions-Policy: geolocation=(), microphone=(), camera=()`
  - `Content-Security-Policy` permissivo (mantém Vite + Supabase dinâmico funcionando; apertar após R1)
- [ ] **R9 — HTTPS.** Confirmar se há proxy reverso TLS upstream. Se não, adicionar `listen 443 ssl` no nginx.

### Fase D — P2/P3

- [x] **R11 — `.gitignore`.** Adicionado `.env*` (com `!.env.example`), `log_*.txt`, `*.xlsx`, `supa_openapi.json`, `supabase_spec.json`, `* copy.*`. **Atenção:** os arquivos abaixo já estão no histórico Git e o `.gitignore` não os remove sozinho — fazer `git rm --cached` quando for retomar:
  - `planilha_base_kommo.xlsx`
  - `supabase_spec.json`
  - `log_polo_sumaganhos.txt`
  - `eslint.config copy.js`, `index copy.html`, `package copy.json`, `package-lock copy.json`, `tailwind.config copy.js`, `tsconfig copy.json`, `tsconfig.app copy.json`, `tsconfig.node copy.json`, `vite.config copy.ts`
- [ ] **R13 — Audit log `Meta_ANH`.** Trigger SQL no Supabase populando `Meta_ANH_audit`
- [x] **R15 — `npm audit` no CI.** Workflow em [.github/workflows/ci.yml](../.github/workflows/ci.yml) com lint + typecheck + build + audit (falha em high/critical em deps de produção; deps dev apenas informativo).
- [x] **R17 — gitleaks no CI.** Workflow em [.github/workflows/gitleaks.yml](../.github/workflows/gitleaks.yml) usando `gitleaks/gitleaks-action@v2`. Allowlist de placeholders em [.gitleaks.toml](../.gitleaks.toml).

## Decisão de 2026-05-05: rotação de credenciais ADIADA

> A rotação das chaves Supabase / Postgres / Kommo foi pausada porque essas
> credenciais são compartilhadas com **outros projetos**. Trocar agora
> quebraria os outros sistemas.
>
> **Plano dividido em duas etapas independentes:**
>
> - **[A] Migração de código** (R1+R2+R6+R4): pode rodar **sem rotação**.
>   Frontend para de usar `service_role` (passa a usar `anon` + JWT do usuário),
>   mas a `service_role` antiga continua válida para os outros projetos.
>   O risco de vazamento via DevTools é **eliminado** mesmo sem rotacionar.
>
> - **[B] Rotação operacional**: vira um projeto próprio, executado quando
>   **todos** os consumidores estiverem usando o método novo. Precisa de
>   inventário de todos os sistemas que dependem das chaves.

### Próximo passo recomendado antes de [B]

Criar e preencher `docs/inventario-credenciais.md` listando **todos** os
projetos / scripts / serviços que usam:

- Supabase `service_role` key
- Supabase `anon` key
- Postgres senha do `147.93.34.2`
- Token Kommo

Sem esse mapa, qualquer rotação futura é loteria.

## Como retomar

Ordem sugerida (atualizada após sessão de 2026-05-05):

1. **Limpeza de histórico (rápido, mas precisa decisão):**
   - `git rm --cached` nos arquivos listados em R11 acima
   - Decidir se `planilha_base_kommo.xlsx` deve continuar versionada (se sim, manter exceção no `.gitignore`)

2. **Médio (precisa decisão de infra):**
   - R9 (HTTPS) — depende de saber se já há TLS upstream

3. **Difícil — pode rodar SEM rotacionar credenciais:**
   - R1+R2+R6 — seguir [migracao-auth.md](migracao-auth.md) etapa 1.1 → 1.4 no SQL Editor
   - R4 — fazer junto com R1 etapa 2.5 e 2.6
   - R13 — SQL trigger

4. **Adiado — rotação operacional:**
   - Inventariar todos os projetos que usam as chaves
   - Migrar projeto a projeto
   - Rotacionar Postgres + Supabase + Kommo (todos juntos, num "freeze window")
   - `bfg` para limpar histórico

## Arquivos modificados nesta sessão (2026-05-04)

| Arquivo | Mudança |
|---------|---------|
| [AGENTS.md](../AGENTS.md) | Link para `docs/seguranca.md` |
| [docs/README.md](README.md) | Links para `seguranca.md` e `migracao-auth.md` |
| [docs/seguranca.md](seguranca.md) | **Novo** — catálogo dos 20 riscos |
| [docs/migracao-auth.md](migracao-auth.md) | **Novo** — guia de migração para Supabase Auth |
| [api-server.js](../api-server.js) | Reescrito com `dotenv`, `helmet`, `cors`, `rate-limit`, Bearer auth (depois removido em 2026-05-06) |
| [.env.example](../.env.example) | Adicionadas vars `DB_*`, `API_*`, `CORS_*`, `KOMMO_*` (DB/API/CORS removidas em 2026-05-06) |
| [preencher_polo_sumaganhos.py](../preencher_polo_sumaganhos.py) | Lê de `os.environ` + `.env` |
| [gerar_planilha_ganhos.py](../gerar_planilha_ganhos.py) | Lê de `os.environ` + `.env` |
| [package.json](../package.json) | Novas deps: `dotenv`, `helmet`, `express-rate-limit` (todas removidas em 2026-05-06 com o api-server.js) |

## Arquivos modificados na sessão de 2026-05-05

| Arquivo | Mudança |
|---------|---------|
| [.gitignore](../.gitignore) | R11 — `.env*` (com exceção), `log_*.txt`, `*.xlsx`, OpenAPI/specs, `* copy.*` |
| [nginx.conf](../nginx.conf) | R8 — XCTO, XFO, Referrer-Policy, HSTS, Permissions-Policy, CSP |
| [nginx.conf.template](../nginx.conf.template) | R8 — mesmos headers + comentários explicativos |
| [.github/workflows/ci.yml](../.github/workflows/ci.yml) | **Novo** — R15: lint, typecheck, build, `npm audit` (high/critical em prod) |
| [.github/workflows/gitleaks.yml](../.github/workflows/gitleaks.yml) | **Novo** — R17: scan de secrets em push/PR/weekly |
| [.gitleaks.toml](../.gitleaks.toml) | **Novo** — allowlist de placeholders em `.env.example` e docs |

## Validação rápida

Antes de retomar, testar que nada quebrou:

```powershell
# Frontend (deve buildar sem erros)
npm run typecheck
npm run build

# Scripts Python (precisam de .env com SUPABASE_*, KOMMO_*)
$env:PYTHONIOENCODING="utf-8"
python preencher_polo_sumaganhos.py
```

Se algum quebrar, é provável que seja por falta de `.env` local com as variáveis novas — copie de `.env.example` e preencha.

> O antigo `api-server.js` foi removido em 2026-05-06. Sessões agora vêm direto do Supabase em [src/services/sessionsService.ts](../src/services/sessionsService.ts) — não há mais processo Express para subir.
