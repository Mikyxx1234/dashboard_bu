import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY;
const TABLE = 'Senhas Dash';
const SESSION_KEY = 'dashboard_global_auth';

function supaHeaders() {
  return {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  };
}

interface AuthState {
  user: string | null;
  isAdmin: boolean;
}

interface AuthContextType extends AuthState {
  login: (user: string, password: string) => Promise<boolean>;
  logout: () => void;
}

function loadSession(): AuthState {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { user: null, isAdmin: false };
    const { user, isAdmin } = JSON.parse(raw);
    if (user) return { user, isAdmin: !!isAdmin };
  } catch { /* ignore */ }
  return { user: null, isAdmin: false };
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(loadSession);

  const login = useCallback(async (userName: string, password: string) => {
    try {
      const url =
        `${SUPABASE_URL}/rest/v1/${encodeURIComponent(TABLE)}` +
        `?Usuario=eq.${encodeURIComponent(userName)}` +
        `&Senha=eq.${encodeURIComponent(password)}` +
        `&select=Usuario,acesso`;

      const res = await fetch(url, { headers: supaHeaders() });
      if (!res.ok) return false;

      const rows = await res.json();
      if (!rows.length) return false;

      const isAdmin = rows[0].acesso === 'ADMIN';
      setAuth({ user: userName, isAdmin });
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user: userName, isAdmin }));
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setAuth({ user: null, isAdmin: false });
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

export async function fetchConsultantNames(): Promise<string[]> {
  try {
    const url =
      `${SUPABASE_URL}/rest/v1/${encodeURIComponent(TABLE)}` +
      `?select=Usuario&order=Usuario.asc`;
    const res = await fetch(url, { headers: supaHeaders() });
    if (!res.ok) return [];
    const rows: { Usuario: string }[] = await res.json();
    return rows.map((r) => r.Usuario);
  } catch {
    return [];
  }
}
