import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { cachePassword, clearCachedPassword } from '@/services/credentialCache';
import { supabase } from '@/services/supabase';

type ProfileFields = {
  username?: string;
  avatarUrl?: string;
};

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (fields: ProfileFields) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  exchangeRecoveryCode: (code: string) => Promise<void>;
};

// Where Supabase's password-recovery email links back into the app -
// matches app.json's "scheme" and the app/reset-password.tsx route.
const RESET_REDIRECT_URL = 'pantryassistant://reset-password';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function signUp(email: string, password: string, username?: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: username ? { data: { username } } : undefined,
    });
    if (error) throw error;
    await cachePassword(email, password);
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await cachePassword(email, password);
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    await clearCachedPassword();
  }

  async function updateProfile(fields: ProfileFields) {
    const data: Record<string, string> = {};
    if (fields.username !== undefined) data.username = fields.username;
    if (fields.avatarUrl !== undefined) data.avatar_url = fields.avatarUrl;
    const { data: updated, error } = await supabase.auth.updateUser({ data });
    if (error) throw error;
    // updateUser's response already carries the fresh user/session, but the
    // onAuthStateChange listener above won't necessarily fire for a plain
    // metadata update - setting it directly here is what makes the new
    // avatar/username show up immediately instead of on next app launch.
    setSession((prev) => (prev ? { ...prev, user: updated.user } : prev));
  }

  async function updatePassword(newPassword: string) {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    if (data.user?.email) {
      await cachePassword(data.user.email, newPassword);
    }
  }

  async function requestPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: RESET_REDIRECT_URL,
    });
    if (error) throw error;
  }

  /** Completes the password-recovery deep link: trades the `code` query param for a real (recovery) session, which is what then lets app/reset-password.tsx call updatePassword. */
  async function exchangeRecoveryCode(code: string) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        signUp,
        signIn,
        signOut,
        updateProfile,
        updatePassword,
        requestPasswordReset,
        exchangeRecoveryCode,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
