import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const LOGIN_ATTEMPTS_KEY = 'wbs_admin_login_attempts';
const LOCK_UNTIL_KEY = 'wbs_admin_lock_until';
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

interface AdminAuthContextValue {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

function getLockRemainingMs(): number {
  const until = Number(sessionStorage.getItem(LOCK_UNTIL_KEY) || 0);
  return Math.max(0, until - Date.now());
}

function recordFailedAttempt(): number {
  const attempts = Number(sessionStorage.getItem(LOGIN_ATTEMPTS_KEY) || 0) + 1;
  sessionStorage.setItem(LOGIN_ATTEMPTS_KEY, String(attempts));
  if (attempts >= MAX_ATTEMPTS) {
    sessionStorage.setItem(LOCK_UNTIL_KEY, String(Date.now() + LOCK_MS));
    sessionStorage.setItem(LOGIN_ATTEMPTS_KEY, '0');
  }
  return attempts;
}

function clearLoginAttempts(): void {
  sessionStorage.removeItem(LOGIN_ATTEMPTS_KEY);
  sessionStorage.removeItem(LOCK_UNTIL_KEY);
}

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const lockMs = getLockRemainingMs();
    if (lockMs > 0) {
      const mins = Math.ceil(lockMs / 60000);
      return { error: `Demasiados intentos. Esperá ${mins} minuto(s).` };
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || password.length < 8) {
      return { error: 'Email o contraseña inválidos.' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error) {
      recordFailedAttempt();
      return { error: 'Credenciales incorrectas.' };
    }

    if (!data.session) {
      recordFailedAttempt();
      return { error: 'No se pudo iniciar sesión.' };
    }

    clearLoginAttempts();
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isAdmin: Boolean(session?.user),
      loading,
      signIn,
      signOut,
    }),
    [session, loading, signIn, signOut]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth debe usarse dentro de AdminAuthProvider');
  }
  return ctx;
}
