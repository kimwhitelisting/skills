import type { CloudRemote, CloudSave, PutResult } from './sync.ts';
interface Session { user: { id: string }; access_token: string }
/** Capture and validate identity before every request; never let SDK token refresh change a queued operation's owner. */
export function signedRemote(owner: string, url: string, key: string, session: () => Promise<Session | null>, active: () => boolean, request: typeof fetch = fetch): CloudRemote {
  async function rpc<T>(name: string, args: unknown): Promise<T> {
    const current = await session();
    if (!active() || !current || current.user.id !== owner) throw Error('Account changed');
    const response = await request(`${url}/rest/v1/rpc/${name}`, {
      method: 'POST', headers: { apikey: key, Authorization: `Bearer ${current.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args), signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const failure = await response.json().catch(() => ({})) as { code?: string };
      throw Object.assign(new Error('Account save unavailable'), { code: failure.code, status: response.status });
    }
    return await response.json() as T;
  }
  return { get: () => rpc<CloudSave>('bento_get_save', {}), put: (revision, operation, snapshot) => rpc<PutResult>('bento_put_save', { p_expected_revision: revision, p_operation_id: operation, p_snapshot: snapshot }) };
}
