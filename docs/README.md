# Documentação — Dashboard BU

Índice da documentação técnica deste projeto. Para o resumo geral leia primeiro [../AGENTS.md](../AGENTS.md).

## Mapa

| Arquivo | Conteúdo |
|---------|---------|
| [arquitetura.md](arquitetura.md) | Visão geral, diagramas de fluxo, mapa de páginas e scripts |
| [supabase-tabelas.md](supabase-tabelas.md) | Catálogo de tabelas/views do Supabase consumidas e em qual arquivo |
| [kommo-integracao.md](kommo-integracao.md) | Subdomínio, proxy `/kommo-api`, IDs de custom fields, endpoints |
| [premiacao.md](premiacao.md) | Regras de cálculo de prêmio (`META_*`, `GANHO_*`, `POLOS_CUPOM`) |
| [scripts.md](scripts.md) | Como rodar cada script Python/Node do projeto |
| [ambiente.md](ambiente.md) | Variáveis de ambiente, deploy Docker, segurança |
| [seguranca.md](seguranca.md) | Riscos identificados (P0–P3), mitigações e status |
| [seguranca-progresso.md](seguranca-progresso.md) | Checkpoint da implementação (estado atual + próximos passos) |
| [migracao-auth.md](migracao-auth.md) | Guia passo-a-passo da migração para Supabase Auth |

## Convenções para esta pasta

- Documentos curtos (< 200 linhas), focados em um único tema
- Citar arquivos com paths relativos (markdown links)
- Não duplicar informação — preferir links cruzados
- Sem credenciais reais — apenas indicar onde estão no código

## Regras Cursor relacionadas

As regras em `.cursor/rules/` são aplicadas automaticamente conforme o tipo de arquivo aberto:

- [`supabase.mdc`](../.cursor/rules/supabase.mdc) — quando edita arquivos que usam Supabase
- [`kommo.mdc`](../.cursor/rules/kommo.mdc) — quando edita integrações Kommo
- [`scripts-python.mdc`](../.cursor/rules/scripts-python.mdc) — quando edita `.py`
- [`frontend.mdc`](../.cursor/rules/frontend.mdc) — quando edita `src/**` ou `public/**.html`
