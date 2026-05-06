# Kommo CRM — Integração

Subdomínio: **`academicosoead`** → `https://academicosoead.kommo.com`.

Convenções gerais em [`../.cursor/rules/kommo.mdc`](../.cursor/rules/kommo.mdc).

## Proxy `/kommo-api`

Frontend nunca chama `*.kommo.com` direto (CORS). O proxy é configurado em dois pontos:

### Dev (Vite)

`vite.config.ts`:
```ts
server: {
  proxy: {
    '/kommo-api': {
      target: `https://${kommoSubdomain}.kommo.com`,
      changeOrigin: true,
      rewrite: (p) => p.replace(/^\/kommo-api/, ''),
    },
  },
}
```

Além disso, o plugin `env-config-dev` injeta `window.__env__` em `/env-config.js` para o HTML legacy ler `KOMMO_TOKEN` em runtime.

### Prod (nginx)

`nginx.conf.template` (Docker):
```nginx
location /kommo-api/ {
  resolver 8.8.8.8;
  set $kommo https://${KOMMO_SUBDOMAIN}.kommo.com;
  rewrite ^/kommo-api/(.*) /$1 break;
  proxy_pass $kommo;
  proxy_set_header Host ${KOMMO_SUBDOMAIN}.kommo.com;
  proxy_set_header Accept application/json;
}
```

`entrypoint.sh` faz `envsubst` no template.

## Endpoints usados

| Endpoint | Método | Onde |
|----------|--------|------|
| `/api/v4/users?limit=250` | GET | `dashboard_consultores.html` (cache `_kommoUsersCache`), `FormatarPlanilhaPage.tsx`, `leadsParadosService.ts`, `kommo.js` |
| `/api/v4/users/{id}` | GET | `FormatarPlanilhaPage.tsx`, `kommo.js` |
| `/api/v4/leads` | GET / POST / PATCH | `FormatarPlanilhaPage.tsx`, `leadsParadosService.ts`, `kommo.js`, `preencher_polo_sumaganhos.py` |
| `/api/v4/leads/{id}` | GET | `FormatarPlanilhaPage.tsx`, `kommo.js` |
| `/api/v4/leads/custom_fields` | GET | `FormatarPlanilhaPage.tsx`, `kommo.js` |
| `/api/v4/leads/pipelines` | GET | `FormatarPlanilhaPage.tsx`, `kommo.js` |
| `/api/v4/leads/pipelines/{id}` | GET | `FormatarPlanilhaPage.tsx`, `kommo.js` |
| `/api/v4/leads/pipelines/{id}/statuses` | GET | `kommo.js` |
| `/api/v4/leads/{id}/notes` | GET / POST | `kommo.js` |
| `/api/v4/leads/tags` | GET | `kommo.js` |
| `/api/v4/contacts` | GET / POST | `FormatarPlanilhaPage.tsx`, `kommo.js` |
| `/api/v4/contacts/{id}` | GET / PATCH | `FormatarPlanilhaPage.tsx`, `kommo.js` |
| `/api/v4/contacts/custom_fields` | GET | `kommo.js` |
| `/api/v4/tasks` | GET / POST | `kommo.js` |
| `/api/v4/account?with=amojo_id` | GET | `kommo.js` (`testConnection`) |

## Custom fields — IDs hardcoded

### Campo `Polo`

| ID | Nome | Família |
|----|------|---------|
| `1475381` | `sum_Polo` | Sumaré |
| `412934` | `Polo` | Principal |
| `1475405` | `anh_Polo` | Anhanguera |

### Família principal (lead)

| ID | Nome |
|----|------|
| `1473849` | Nome |
| `1473851` | Telefone |
| `412928` | RA |
| `412930` | CPF |
| `412932` | Curso |
| `412934` | Polo |

### Família `anh_*`

| ID | Nome |
|----|------|
| `1475385` | `anh_Nome` |
| `1475387` | `anh_CPF` |
| `1475389` | `anh_Telefone` |
| `1475413` | `anh_RA` |
| `1475403` | `anh_Curso` |
| `1475405` | `anh_Polo` |
| `1475429` | `anh_Nivel` (select) |
| `1475407` | `anh_Status Inscrição` |
| `1475399` | `anh_Data Inscricao` |
| `1475401` | `anh_Data Matricula` |
| `1475485` | `anh_PTC` |
| `1475415` | `anh_Origem` |

### Enum custom

| ID | Campo | Significado |
|----|-------|-------------|
| `1193765` | `1475415` (`anh_Origem`) | Opção "Colaborar" (`COLABORAR_ANH_ORIGEM`) |

## IDs de usuário (consultores)

Fallback estático em `dashboard_consultores.html`:

| Nome | ID Kommo |
|------|----------|
| Camilla | `14774452` |
| Rahi | `14774444` |
| Gabriel | `14774008` |
| Gabriel Messias | `15025792` |

Responsável fixo "Colaborar": `11616068`.

## Pipelines / status conhecidos

Aparecem em `leadsParadosService.ts` e na lógica Colaborar:

`13080164`, `100860024`, `7355323`, `60877039`, `13080160`, `100859856`, `100859840`.

## Padrões de query úteis

```
# Lead por IDs (lote)
/api/v4/leads?with=custom_fields&limit=50&filter[id][]=23740513&filter[id][]=23740514

# Leads por status
/api/v4/leads?filter[statuses][0][pipeline_id]=13080164&filter[statuses][0][status_id]=100859856

# Busca por texto
/api/v4/leads?query=joao&limit=10
```

## Token

Vem de `window.__env__.KOMMO_TOKEN` (frontend) ou de constante hardcoded nos scripts standalone (`preencher_polo_sumaganhos.py`). Defina via `VITE_KOMMO_TOKEN` no `.env`.
