import { createClient, AuthApiError, AuthWeakPasswordError, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { AccountWebConfig } from '../../scripts/account-web-config.ts';
import { PasswordRejected, type AccountWebPort, type RecoveryTokens, type WebUser } from './controller.ts';

/** Includes response-body time, and never logs upstream errors or credentials. */
export function boundedFetch(lifetime: AbortSignal, fetcher: typeof fetch = fetch, milliseconds = 20000): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const abort = () => controller.abort();
    const requestSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    lifetime.addEventListener('abort', abort, { once: true });
    requestSignal?.addEventListener('abort', abort, { once: true });
    if (lifetime.aborted || requestSignal?.aborted) abort();
    const timer = setTimeout(abort, milliseconds);
    try {
      const response = await fetcher(input, { ...init, signal: controller.signal, cache: 'no-store', referrerPolicy: 'no-referrer' });
      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];
      let length = 0;
      if (reader) {
        try {
          while (true) {
            const next = await reader.read();
            if (next.done) break;
            length += next.value.byteLength;
            if (length > 1024 * 1024) { controller.abort(); throw new Error('response_limit'); }
            chunks.push(next.value);
          }
        } finally { reader.releaseLock(); }
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      return new Response([204, 205, 304].includes(response.status) ? null : bytes, { status: response.status, statusText: response.statusText, headers: response.headers });
    } finally {
      clearTimeout(timer);
      lifetime.removeEventListener('abort', abort);
      requestSignal?.removeEventListener('abort', abort);
    }
  };
}
function verified(user: User | null): WebUser {
  if (!user?.id || !user.email || !user.email_confirmed_at || user.is_anonymous) throw new Error('verified_account_required');
  return { id: user.id, email: user.email };
}

export function createAccountWebPort(config: AccountWebConfig, fetcher: typeof fetch = fetch): AccountWebPort {
  let client: SupabaseClient | null = null;
  let lifetime: AbortController | null = null;
  const get = () => {
    if (!client) {
      lifetime = new AbortController();
      client = createClient(config.url, config.key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'implicit',
          storageKey: 'bento-account-web-memory-only', debug: false },
        global: { fetch: boundedFetch(lifetime.signal, fetcher) },
      });
    }
    return client;
  };
  const discard = () => {
    const old = client;
    client = null;
    lifetime?.abort();
    lifetime = null;
    if (old) void old.auth.dispose().catch(() => {});
  };
  const currentUser = async (expected?: string) => {
    const active = get();
    const { data, error } = await active.auth.getUser();
    if (error || active !== client) throw new Error('account_unavailable');
    const user = verified(data.user);
    if (expected && user.id !== expected) throw new Error('account_changed');
    return { active, user };
  };
  return {
    async login(email, password) {
      const active = get();
      const { data, error } = await active.auth.signInWithPassword({ email, password });
      if (error || !data.session || active !== client) throw new Error('login_failed');
      const result = await currentUser(data.user?.id);
      return result.user;
    },
    async recover(tokens: RecoveryTokens) {
      const active = get();
      const { error } = await active.auth.setSession(tokens);
      if (error || active !== client) throw new Error('recovery_failed');
      return (await currentUser()).user;
    },
    async confirmSignup(tokens: RecoveryTokens) {
      try {
        const active = get();
        const { error } = await active.auth.setSession(tokens);
        if (error || active !== client) throw new Error('confirmation_failed');
        await currentUser();
        // Only the server-verified confirmed account is evidence. Never hand this session to the game.
        await active.auth.signOut({ scope: 'local' });
      } finally { discard(); }
    },
    async sendReset(email) {
      const { error } = await get().auth.resetPasswordForEmail(email, { redirectTo: config.returnURL });
      if (error) throw new Error('reset_failed');
    },
    async changePassword(userId, password) {
      const { active } = await currentUser(userId);
      const { data, error } = await active.auth.updateUser({ password });
      if (active === client && (error instanceof AuthApiError || error instanceof AuthWeakPasswordError)
        && [400, 422].includes(error.status ?? 0) && ['weak_password', 'same_password'].includes(error.code ?? '')) {
        throw new PasswordRejected('password_rejected');
      }
      if (error || active !== client || data.user?.id !== userId) throw new Error('password_unknown');
    },
    async deleteAccount(userId, password) {
      const { active } = await currentUser(userId);
      const { data, error } = await active.functions.invoke('bento-delete-account', { body: { password } });
      return !error && active === client && data?.deleted === true;
    },
    async close() {
      try { if (client) await client.auth.signOut({ scope: 'local' }); }
      catch { /* Memory is discarded even when session revocation cannot be confirmed. */ }
      finally { discard(); }
    },
    discard,
  };
}
