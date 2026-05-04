import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type Profile = {
  id: string;
  display_name: string;
  plan: 'free' | 'paid';
  created_at: string;
  updated_at: string;
};

export type OAuthProvider = 'google' | 'github';

const oauthRedirectTo = () =>
  typeof window === 'undefined'
    ? undefined
    : `${window.location.origin}/auth/callback`;

export const signInWithPassword = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password });

export const signUpWithPassword = (
  email: string,
  password: string,
  displayName: string,
) =>
  supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: oauthRedirectTo(),
      data: { display_name: displayName },
    },
  });

export const signInWithOAuth = (provider: OAuthProvider) =>
  supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: oauthRedirectTo() },
  });

export const signOut = () => supabase.auth.signOut();

export const updateAuthEmail = (email: string) =>
  supabase.auth.updateUser({ email });

export const updateAuthPassword = (password: string) =>
  supabase.auth.updateUser({ password });

export const reauthenticateWithPassword = async (password: string) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const email = sessionData.session?.user.email;
  if (!email) throw new Error('現在のセッションにメールアドレスがありません');
  return supabase.auth.signInWithPassword({ email, password });
};

export const updateProfileDisplayName = async (
  userId: string,
  displayName: string,
) => {
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', userId);
  if (error) throw error;
};

export type SessionState =
  | { status: 'loading'; session: null }
  | { status: 'signed-in'; session: Session }
  | { status: 'signed-out'; session: null };

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    status: 'loading',
    session: null,
  });

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setState(
        data.session
          ? { status: 'signed-in', session: data.session }
          : { status: 'signed-out', session: null },
      );
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(
        session
          ? { status: 'signed-in', session }
          : { status: 'signed-out', session: null },
      );
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export function useProfile(userId: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    supabase
      .from('profiles')
      .select('id, display_name, plan, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error('[useProfile] fetch failed:', error);
          setError(error.message);
        }
        setProfile((data as Profile | null) ?? null);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  return { profile, loading, error, setProfile };
}

/**
 * Best-effort display name for the signed-in user. Falls back to the user's
 * auth metadata (display_name / full_name / name) or the email local-part if
 * the profiles row hasn't loaded (or doesn't exist) yet.
 */
export function resolveDisplayName(
  profile: Profile | null,
  session: Session | null,
): string | null {
  if (profile?.display_name) return profile.display_name;
  const meta = session?.user.user_metadata as Record<string, unknown> | undefined;
  const candidates = [
    meta?.display_name,
    meta?.full_name,
    meta?.name,
    session?.user.email?.split('@')[0],
  ];
  for (const c of candidates) {
    if (typeof c === 'string') {
      const trimmed = c.trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}
