import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Supabase is optional: when the env vars are missing the whole app still runs
// fully offline against Dexie. Configure by creating a `.env.local` with:
//   VITE_SUPABASE_URL=...
//   VITE_SUPABASE_ANON_KEY=...
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;

export const isCloudEnabled = (): boolean => supabase !== null;

let cachedUserId: string | null = null;

/**
 * Ensure we have an authenticated user. Uses anonymous sign-in so cloud sync is
 * frictionless. Returns the user id, or null when cloud is disabled / fails.
 */
export async function ensureAuth(): Promise<string | null> {
  if (!supabase) return null;
  if (cachedUserId) return cachedUserId;
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      cachedUserId = data.session.user.id;
      return cachedUserId;
    }
    const { data: anon, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.warn('[supabase] anonymous sign-in failed:', error.message);
      return null;
    }
    cachedUserId = anon.user?.id ?? null;
    return cachedUserId;
  } catch (e) {
    console.warn('[supabase] auth error', e);
    return null;
  }
}
