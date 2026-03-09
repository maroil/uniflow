'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { signIn, completeNewPassword, signOut, getCurrentToken, getCurrentEmail } from '@/lib/auth';

interface AuthUser {
  email: string;
  token: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<'success' | 'NEW_PASSWORD_REQUIRED'>;
  forceNewPassword: (newPassword: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getCurrentToken(), getCurrentEmail()]).then(([token, email]) => {
      if (token && email) {
        setUser({ token, email });
      }
      setLoading(false);
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await signIn(email, password);
    if ('challenge' in result) return 'NEW_PASSWORD_REQUIRED' as const;
    setUser({ token: result.token, email: result.email });
    return 'success' as const;
  }, []);

  const forceNewPassword = useCallback(async (newPassword: string) => {
    const result = await completeNewPassword(newPassword);
    setUser({ token: result.token, email: result.email });
  }, []);

  const logout = useCallback(() => {
    signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, forceNewPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
