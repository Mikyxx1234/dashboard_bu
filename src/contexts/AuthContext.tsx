import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface AuthState {
  user: string | null;
  isAdmin: boolean;
}

interface AuthContextType extends AuthState {
  login: (user: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const CONSULTOR_PASSWORD_HASHES: Record<string, string> = Object.fromEntries(
  [
    ['Gabriel', import.meta.env.VITE_AUTH_HASH_GABRIEL],
    ['Breno', import.meta.env.VITE_AUTH_HASH_BRENO],
    ['Camilla', import.meta.env.VITE_AUTH_HASH_CAMILLA],
    ['Rahi', import.meta.env.VITE_AUTH_HASH_RAHI],
    ['Supervisão', import.meta.env.VITE_AUTH_HASH_SUPERVISAO],
  ].filter(([, v]) => v),
);

const ADMIN_USERS = ['Supervisão'];
const SESSION_KEY = 'dashboard_global_auth';

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function loadSession(): AuthState {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { user: null, isAdmin: false };
    const { user } = JSON.parse(raw);
    if (user && CONSULTOR_PASSWORD_HASHES[user]) {
      return { user, isAdmin: ADMIN_USERS.includes(user) };
    }
  } catch { /* ignore */ }
  return { user: null, isAdmin: false };
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(loadSession);

  const login = useCallback(async (user: string, password: string) => {
    const hash = await hashPassword(password);
    const expected = CONSULTOR_PASSWORD_HASHES[user];
    if (!expected || hash !== expected) return false;

    const isAdmin = ADMIN_USERS.includes(user);
    setAuth({ user, isAdmin });
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user }));
    return true;
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

export function getConsultantNames() {
  return Object.keys(CONSULTOR_PASSWORD_HASHES).sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  );
}
