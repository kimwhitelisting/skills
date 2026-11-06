/** Pure request handler. Dependencies are request-scoped; tests never need privileged keys. */
export interface AccountUser {
  id: string;
  email?: string;
  email_confirmed_at?: string;
  is_anonymous?: boolean;
  factors?: { status: string }[];
}
export interface DeletionServices {
  getUser(token: string): Promise<AccountUser | null>;
  reauthenticate(email: string, password: string): Promise<{ userId: string; accessToken: string } | null>;
  revokeSessions(accessToken: string): Promise<boolean>;
  deleteUser(id: string): Promise<boolean>;
}
export const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const response = (status: number, error?: string) => new Response(JSON.stringify(error ? { error } : { deleted: true }), { status, headers });
async function boundedBody(request: Request): Promise<string | undefined> {
  if (Number(request.headers.get('Content-Length') ?? 0) > 4096) return undefined;
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) { await reader.cancel(); return undefined; }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}

export function deletionHandler(services: DeletionServices) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return response(405, 'method_not_allowed');
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return response(401, 'authentication_required');
    try {
      const user = await services.getUser(authorization.slice(7));
      if (!user || user.is_anonymous || !user.email || !user.email_confirmed_at) return response(401, 'authentication_required');
      // Password-only deletion must not silently bypass an enrolled second factor.
      if (user.factors?.some(f => f.status === 'verified')) return response(403, 'mfa_deletion_not_supported');
      const body = await boundedBody(request);
      if (body === undefined) return response(413, 'request_too_large');
      let input: { password?: unknown };
      try { input = JSON.parse(body); } catch { return response(400, 'invalid_request'); }
      if (!input || typeof input.password !== 'string' || input.password.length < 1 || input.password.length > 1024) return response(400, 'password_required');
      // Email and ID come exclusively from the live verified user, never the posted body.
      const confirmation = await services.reauthenticate(user.email, input.password);
      input.password = undefined;
      if (!confirmation || confirmation.userId !== user.id || !confirmation.accessToken) return response(403, 'reauthentication_failed');
      if (!await services.revokeSessions(confirmation.accessToken)) return response(503, 'session_revocation_failed');
      if (!await services.deleteUser(user.id)) return response(503, 'deletion_failed');
      return response(200);
    } catch {
      // No provider error objects, request logging, passwords, tokens, or account details.
      return response(503, 'deletion_failed');
    }
  };
}
