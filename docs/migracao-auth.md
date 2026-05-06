# Migração para Supabase Auth (R1 + R2 + R6 + R14 + R16)

Guia passo-a-passo para eliminar a autenticação custom (tabela `Senhas Dash`) e migrar para Supabase Auth nativo. Resolve os principais P0 do projeto: chave `service_role` exposta no browser, senhas em texto claro e ausência de RLS.

> **Atenção:** este procedimento é destrutivo e requer downtime curto. Faça em ambiente de homologação primeiro. Avise os consultores antes de migrar produção (eles precisarão redefinir senha).

## Por que migrar

| Hoje | Depois |
|------|--------|
| Frontend usa `service_role` (bypass total de RLS) | Frontend usa `anon_key` apenas |
| Tabela `Senhas Dash` com senha plain text | `auth.users` com bcrypt automático |
| Sem RLS — qualquer admin com a chave lê tudo | RLS por consultor + role admin |
| Logout só local (sessionStorage) | Refresh tokens, sessões revogáveis |
| Sem 2FA | TOTP nativo do Supabase |

## Pré-requisitos

- Acesso de admin ao projeto Supabase
- `npm` instalado localmente
- Lista de consultores ativos com email

## Etapa 1 — Preparar o lado Supabase

### 1.1 — Criar tabela `consultor_profile`

No SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS public.consultor_profile (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome    TEXT NOT NULL UNIQUE,
  role    TEXT NOT NULL DEFAULT 'consultor' CHECK (role IN ('consultor','admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.consultor_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "self_read"
  ON public.consultor_profile
  FOR SELECT
  USING (user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.consultor_profile p
                 WHERE p.user_id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "admin_write"
  ON public.consultor_profile
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.consultor_profile p
                 WHERE p.user_id = auth.uid() AND p.role = 'admin'));
```

### 1.2 — Criar usuários em `auth.users`

Via dashboard (Authentication → Users → Add user) ou via API admin (uma vez):

Para cada linha de `Senhas Dash`:
1. Criar user em `auth.users` com `email` (defina convenção: `<usuario>@dashboardbu.local` se não houver email real)
2. Definir senha temporária (NÃO reaproveitar senha antiga em texto claro — exigir reset)
3. Inserir em `consultor_profile`:

```sql
INSERT INTO public.consultor_profile (user_id, nome, role)
VALUES ('<uuid-do-auth-users>', 'Camilla', 'consultor');
```

Dica: para obter o uuid do email criado:
```sql
SELECT id, email FROM auth.users WHERE email = 'camilla@dashboardbu.local';
```

### 1.3 — Habilitar RLS nas tabelas operacionais

```sql
-- sum_leads_ganhos
ALTER TABLE public.sum_leads_ganhos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consultor_le_proprios_sum"
  ON public.sum_leads_ganhos
  FOR SELECT
  USING (
    consultor = (SELECT nome FROM public.consultor_profile WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.consultor_profile
               WHERE user_id = auth.uid() AND role = 'admin')
  );

-- anh_leads_ganhos
ALTER TABLE public.anh_leads_ganhos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consultor_le_proprios_anh"
  ON public.anh_leads_ganhos
  FOR SELECT
  USING (
    consultor = (SELECT nome FROM public.consultor_profile WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.consultor_profile
               WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Meta_ANH (apenas admin lê/escreve)
ALTER TABLE public."Meta_ANH" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_meta"
  ON public."Meta_ANH"
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.consultor_profile
                 WHERE user_id = auth.uid() AND role = 'admin'));

-- Repetir para: sum_leads_perdidos, anh_leads_perdidos, Templates,
-- Template_Sugestoes, blog_posts, vw_*
```

### 1.4 — Habilitar 2FA (R16)

Dashboard → Authentication → Providers → habilitar TOTP. Forçar para usuários `role = 'admin'`.

## Etapa 2 — Lado código

### 2.1 — Instalar `@supabase/supabase-js`

```bash
npm install @supabase/supabase-js
```

(O pacote já está no `package.json` mas não usado para auth.)

### 2.2 — Criar cliente único `src/lib/supabase.ts`

```ts
import { createClient } from '@supabase/supabase-js';
import { env } from '../config';

export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
);
```

### 2.3 — Reescrever `src/contexts/AuthContext.tsx`

```ts
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  isAdmin: boolean;
  user: string | null;
}

const AuthContext = createContext<{
  session: Session | null;
  isAdmin: boolean;
  user: string | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
} | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, isAdmin: false, user: null });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => loadProfile(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => loadProfile(session));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadProfile(session: Session | null) {
    if (!session) {
      setState({ session: null, isAdmin: false, user: null });
      return;
    }
    const { data } = await supabase
      .from('consultor_profile')
      .select('nome,role')
      .eq('user_id', session.user.id)
      .maybeSingle();
    setState({
      session,
      isAdmin: data?.role === 'admin',
      user: data?.nome ?? session.user.email ?? null,
    });
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login: async (email, password) => {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          return { ok: !error, error: error?.message };
        },
        logout: async () => { await supabase.auth.signOut(); },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
```

### 2.4 — Eliminar `SUPABASE_SERVICE_KEY` do browser

- Atualizar [src/config.ts](../src/config.ts) para **NÃO** expor `SUPABASE_SERVICE_KEY`
- Remover do `entrypoint.sh` (ou pelo menos do bloco `window.__env__`)
- Atualizar todos os `supaHeaders` de `src/**` para usar a sessão JWT do Supabase Auth:
  ```ts
  const { data: { session } } = await supabase.auth.getSession();
  fetch(url, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session?.access_token}`,
    },
  });
  ```
- O `dashboard_consultores.html` precisa receber o `access_token` via `postMessage` (ver R4 abaixo)

### 2.5 — Atualizar `LeadsDashboard.tsx` (e R4 ao mesmo tempo)

```tsx
const iframeRef = useRef<HTMLIFrameElement>(null);

useEffect(() => {
  const iframe = iframeRef.current;
  if (!iframe) return;

  function onLoad() {
    supabase.auth.getSession().then(({ data }) => {
      iframe!.contentWindow?.postMessage(
        {
          type: 'auth',
          supabaseUrl: env.SUPABASE_URL,
          anonKey: env.SUPABASE_ANON_KEY,
          accessToken: data.session?.access_token,
          user: state.user,
          isAdmin: state.isAdmin,
        },
        window.location.origin,
      );
    });
  }
  iframe.addEventListener('load', onLoad);
  return () => iframe.removeEventListener('load', onLoad);
}, []);

return <iframe ref={iframeRef} src="/dashboard_consultores.html" />;
```

### 2.6 — Adaptar `dashboard_consultores.html`

Substituir leitura de querystring por listener de message:

```js
let __auth = null;
window.addEventListener('message', (e) => {
  if (e.origin !== window.location.origin) return;
  if (e.data && e.data.type === 'auth') {
    __auth = e.data;
    initDashboard();
  }
});

function supaFetch(path) {
  return fetch(`${__auth.supabaseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: __auth.anonKey,
      Authorization: `Bearer ${__auth.accessToken}`,
    },
  });
}
```

Remover toda referência a `sbUrl`/`sbAnon`/`sbService` em querystring e a `SUPABASE_SERVICE_KEY`.

## Etapa 3 — Validação

1. Login de consultor não-admin: deve listar **apenas seus próprios leads**
2. Login de admin: vê tudo
3. Tentar `fetch` direto a `/rest/v1/sum_leads_ganhos` sem token → deve receber 401
4. Tentar com token de consultor X consultando `consultor=eq.Y` → deve receber array vazio (RLS)
5. Logout invalida sessão (cliente reconecta com 401)

## Etapa 4 — Limpeza

Após validar:

```sql
-- Apenas se nada mais consulta a tabela legacy
DROP TABLE public."Senhas Dash";
```

E remover do código:
- `AUTH_TABLE = 'Senhas Dash'` do HTML legacy
- Função `supaValidateLogin` antiga
- Variável `SUPABASE_SERVICE_KEY` do browser env

## Rollback

Se algo der errado:
1. Desabilitar RLS: `ALTER TABLE x DISABLE ROW LEVEL SECURITY;`
2. Restaurar `AuthContext.tsx` da branch anterior
3. Manter `Senhas Dash` até a próxima janela

## Status atual

- [ ] Etapa 1.1 — Tabela `consultor_profile`
- [ ] Etapa 1.2 — Usuários em `auth.users`
- [ ] Etapa 1.3 — RLS nas tabelas operacionais
- [ ] Etapa 1.4 — 2FA admin
- [ ] Etapa 2.1 — Cliente Supabase
- [ ] Etapa 2.3 — `AuthContext.tsx` reescrito
- [ ] Etapa 2.4 — Remover `service_key` do browser
- [ ] Etapa 2.5 — `LeadsDashboard.tsx` com postMessage
- [ ] Etapa 2.6 — `dashboard_consultores.html` listener
- [ ] Etapa 3 — Validação
- [ ] Etapa 4 — Limpeza

Marque cada item conforme conclui. Atualize `seguranca.md` mudando R1, R2, R6, R14 e R16 para **Mitigado**.
