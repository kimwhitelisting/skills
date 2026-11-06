import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { deletionHandler, headers } from './handler.ts';
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anon || !secret) return new Response(JSON.stringify({ error: 'service_unavailable' }), { status: 503, headers });
  // Fresh clients per request; the service credential exists only in the provider's reserved env.
  const client = createClient(url, anon, options);
  const admin = createClient(url, secret, options);
  return deletionHandler({
    async getUser(token) {
      const { data, error } = await client.auth.getUser(token);
      return error ? null : data.user;
    },
    async reauthenticate(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      return error || !data.user || !data.session ? null : { userId: data.user.id, accessToken: data.session.access_token };
    },
    async revokeSessions(token) {
      const { error } = await admin.auth.admin.signOut(token, 'global');
      return !error;
    },
    async deleteUser(id) {
      const { error } = await admin.auth.admin.deleteUser(id);
      return !error;
    },
  })(request);
});
