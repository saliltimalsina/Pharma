import { createContext, useContext, useState, ReactNode } from 'react';

export interface AuthUser {
  name: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  loginDemo: () => void;
  logout: () => void;
}

const STORAGE_KEY = 'pharmaco_auth_user';

export const DEMO_USER: AuthUser = {
  name: 'Salil Timalsina',
  email: 'salil.timalsina@gmail.com',
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser);

  const setSession = (u: AuthUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  };

  // Stub until the real backend login (divine-api /login) is wired in —
  // any non-empty email/password succeeds so the flow is testable end to end.
  const login = (email: string, password: string): boolean => {
    if (!email.trim() || !password.trim()) return false;
    setSession({ name: email.split('@')[0], email });
    return true;
  };

  const loginDemo = () => setSession(DEMO_USER);

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, loginDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
