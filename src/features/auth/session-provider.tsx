import type { Session } from '@supabase/supabase-js';
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import { getProfile, getShopSettings, type Profile, type ShopSettings } from '@/features/settings/api';
import { AppError, toAppError } from '@/lib/errors';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type Status = 'loading' | 'restore_failed' | 'signed_out' | 'signed_in';

type SessionContextValue = {
  status: Status;
  session: Session | null;
  profile: Profile | null;
  shop: ShopSettings | null;
  /** Message for the login screen (expired session, unauthorized account). */
  notice: string | null;
  restoreError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, shopName: string) => Promise<void>;
  signOut: () => Promise<void>;
  retryRestore: () => void;
  refreshAccount: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>.');
  return value;
}

const UNAUTHORIZED = 'This account is not authorized for RepairTrack.';

async function loadAccount(userId: string): Promise<{ profile: Profile; shop: ShopSettings | null }> {
  const profile = await getProfile(userId);
  if (!profile || !profile.is_active) throw new AppError('permission', UNAUTHORIZED);
  const shop = await getShopSettings();
  return { profile, shop };
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<Status>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const userSignOut = useRef(false);
  const signingIn = useRef(false);

  const clear = useCallback(() => {
    setSession(null);
    setProfile(null);
    setShop(null);
    setStatus('signed_out');
  }, []);

  // Restore a persisted session on launch (and on retry).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isSupabaseConfigured) {
        setRestoreError('RepairTrack is missing its server configuration.');
        setStatus('restore_failed');
        return;
      }
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) {
          if (!cancelled) clear();
          return;
        }
        const account = await loadAccount(data.session.user.id);
        if (cancelled) return;
        setSession(data.session);
        setProfile(account.profile);
        setShop(account.shop);
        setStatus('signed_in');
      } catch (err) {
        if (cancelled) return;
        const appError = toAppError(err);
        if (appError.kind === 'network' || appError.kind === 'unknown') {
          setRestoreError(appError.message);
          setStatus('restore_failed');
          return;
        }
        // Expired refresh token or unauthorized account: back to login.
        await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
        setNotice(appError.kind === 'permission' ? UNAUTHORIZED : 'Your session expired. Sign in again.');
        clear();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt, clear]);

  // Track sign-out (including failed token refresh) and refreshed tokens.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'SIGNED_OUT') {
        if (!userSignOut.current && !signingIn.current) setNotice('Your session expired. Sign in again.');
        userSignOut.current = false;
        clear();
      } else if (event === 'TOKEN_REFRESHED' && next) {
        setSession(next);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [clear]);

  const signIn = useCallback(async (email: string, password: string) => {
    signingIn.current = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        if (/invalid login credentials/i.test(error.message)) {
          throw new AppError('validation', 'Incorrect email or password.');
        }
        throw toAppError(error);
      }
      try {
        const account = await loadAccount(data.user.id);
        setSession(data.session);
        setProfile(account.profile);
        setShop(account.shop);
        setNotice(null);
        setStatus('signed_in');
      } catch (err) {
        userSignOut.current = true;
        await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
        throw toAppError(err);
      }
    } finally {
      signingIn.current = false;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string, shopName: string) => {
    signingIn.current = true;
    try {
      // Refuse signup before creating an account if the server still requires email confirmation.
      const settingsResponse = await fetch(process.env.EXPO_PUBLIC_SUPABASE_URL + '/auth/v1/settings', {
        headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '' },
      });
      if (!settingsResponse.ok) throw new AppError('network', 'Cannot check account setup. Please try again.');
      const settings = await settingsResponse.json();
      if (!settings.mailer_autoconfirm || settings.disable_signup) {
        throw new AppError('validation', 'Account registration is not available yet. Please contact support.');
      }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: { data: { full_name: fullName.trim(), shop_name: shopName.trim() } },
      });
      if (error) throw toAppError(error);
      if (!data.session || !data.user) {
        throw new AppError('validation', 'Account setup is unavailable. Contact your shop support before trying again.');
      }
      try {
        const account = await loadAccount(data.user.id);
        setSession(data.session);
        setProfile(account.profile);
        setShop(account.shop);
        setNotice(null);
        setStatus('signed_in');
      } catch (err) {
        userSignOut.current = true;
        await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
        throw toAppError(err);
      }
    } finally {
      signingIn.current = false;
    }
  }, []);

  const signOut = useCallback(async () => {
    userSignOut.current = true;
    setNotice(null);
    const { error } = await supabase.auth.signOut();
    // A network failure still clears the local session so the device is safe.
    if (error) await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    clear();
  }, [clear]);

  const refreshAccount = useCallback(async () => {
    if (!session) return;
    const account = await loadAccount(session.user.id);
    setProfile(account.profile);
    setShop(account.shop);
  }, [session]);

  const retryRestore = useCallback(() => {
    setRestoreError(null);
    setStatus('loading');
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({ status, session, profile, shop, notice, restoreError, signIn, signUp, signOut, retryRestore, refreshAccount }),
    [status, session, profile, shop, notice, restoreError, signIn, signUp, signOut, retryRestore, refreshAccount],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}
