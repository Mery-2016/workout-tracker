import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError } from '../api/client';

export interface Account {
  id: number;
  email: string;
  name: string;
}

interface AuthValue {
  user: Account | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    api<Account>('/api/auth/me', { signal: controller.signal })
      .then(setUser)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setUser(null);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      async login(email, password) {
        const account = await api<Account>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        setUser(account);
      },
      async register(name, email, password) {
        const account = await api<Account>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
        });
        setUser(account);
      },
      async logout() {
        try {
          await api('/api/auth/logout', { method: 'POST' });
        } catch (reason) {
          if (!(reason instanceof ApiError)) throw reason;
        }
        setUser(null);
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is missing');
  return value;
}
