import { createClient, type Session, type User } from '@supabase/supabase-js';
import { enabledSocialProviders, NATIVE_SOCIAL_CALLBACK, type SocialConfig, type SocialProvider } from './social-config.ts';
export const SOCIAL_KEY = 'bento-social:v1';
export const SOCIAL_TRANSACTION_KEY = 'bento-social-transaction:v1';
const TTL = 10 * 60_000;
export interface SocialPort { getItem(key: string): string | null | Promise<string | null>; setItem(key: string, value: string): void | Promise<void>; removeItem(key: string): void | Promise<void> }
type Purpose = 'login' | 'link';
type Phase = 'preparing' | 'pending' | 'consuming' | 'complete' | 'cancelled' | 'failed';
interface Transaction { version: 1; id: string; purpose: Purpose; provider: SocialProvider; owner: string | null; callback: string; started: number; expires: number; phase: Phase; flowId?: string }
interface Bundle { tx: Transaction; verifiers: Record<string, string>; receipts?: string[] }
interface ReceiptOnly { tx: null; verifiers: Record<string, never>; receipts: string[] }
const flowPattern = /^[a-zA-Z0-9_-]{8,64}$/;
function verifierKey(key: string): boolean { return key === `${SOCIAL_KEY}-code-verifier` || key === `${SOCIAL_KEY}-flows-code-verifier` || new RegExp(`^${SOCIAL_KEY}-flow-[a-zA-Z0-9_-]{8,64}-code-verifier$`).test(key); }
export function validateSocialBundle(bundle: Bundle | ReceiptOnly): void {
  if (bundle?.receipts !== undefined && (!Array.isArray(bundle.receipts) || bundle.receipts.length > 8 || new Set(bundle.receipts).size !== bundle.receipts.length || !bundle.receipts.every(value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)))) throw Error('Invalid social callback receipts');
  if (bundle?.tx === null && Object.keys(bundle).sort().join() === 'receipts,tx,verifiers' && Array.isArray(bundle.receipts) && bundle.verifiers && typeof bundle.verifiers === 'object' && !Array.isArray(bundle.verifiers) && Object.keys(bundle.verifiers).length === 0) return;
  const t = bundle?.tx;
  if (!bundle || !['tx,verifiers', 'receipts,tx,verifiers'].includes(Object.keys(bundle).sort().join()) || !t || Object.keys(t).some(key => !['version','id','purpose','provider','owner','callback','started','expires','phase','flowId'].includes(key)) || t.version !== 1 || !/^[a-f0-9]{64}$/.test(t.id) || !['login', 'link'].includes(t.purpose) || !['google', 'apple'].includes(t.provider)
    || (t.purpose === 'login' ? t.owner !== null : typeof t.owner !== 'string' || !/^[a-f0-9-]{36}$/i.test(t.owner))
    || !Number.isSafeInteger(t.started) || t.started < 0 || t.expires !== t.started + TTL || !['preparing', 'pending', 'consuming', 'complete', 'cancelled', 'failed'].includes(t.phase)
    || typeof t.callback !== 'string' || (t.flowId !== undefined && !flowPattern.test(t.flowId)) || !bundle.verifiers || typeof bundle.verifiers !== 'object' || Array.isArray(bundle.verifiers)
    || Object.keys(bundle.verifiers).length > 3 || (['pending','consuming'].includes(t.phase) && !t.flowId) || (['complete','cancelled','failed'].includes(t.phase) && Object.keys(bundle.verifiers).length !== 0)) throw Error('Invalid social transaction');
  for (const [key, raw] of Object.entries(bundle.verifiers)) {
    if (!verifierKey(key) || typeof raw !== 'string' || raw.length > 1024) throw Error('Invalid social verifier');
    const value: unknown = JSON.parse(raw);
    if (key === `${SOCIAL_KEY}-flows-code-verifier`) {
      if (!Array.isArray(value) || value.length > 1 || !value.every(v => typeof v === 'string' && flowPattern.test(v))) throw Error('Invalid social flow index');
    } else if (typeof value !== 'string' || value.length < 16 || value.length > 512) throw Error('Invalid social verifier');
  }
}
/** One bounded secure record persists verifier writes together; sessions never reach the port. */
class TransportStorage {
  private memory = new Map<string, string>();
  private queue: Promise<void> = Promise.resolve();
  active = true;
  constructor(readonly port: SocialPort, public bundle: Bundle) {}
  async persist(): Promise<void> {
    validateSocialBundle(this.bundle);
    const bytes = JSON.stringify(this.bundle);
    if (bytes.length > 8192) throw Error('Social transaction too large');
    const task = this.queue.then(async () => {
      await this.port.setItem(SOCIAL_TRANSACTION_KEY, bytes);
      if (await this.port.getItem(SOCIAL_TRANSACTION_KEY) !== bytes) throw Error('Social transaction read-back failed');
    });
    this.queue = task.catch(() => {}); return task;
  }
  getItem = async (key: string): Promise<string | null> => {
    if (key === SOCIAL_KEY || key === `${SOCIAL_KEY}-user`) return this.memory.get(key) ?? null;
    if (!verifierKey(key)) throw Error('Unexpected social storage key');
    return this.bundle.verifiers[key] ?? null;
  };
  setItem = async (key: string, value: string): Promise<void> => {
    if (!this.active) throw Error('Social transaction retired');
    if (key === SOCIAL_KEY || key === `${SOCIAL_KEY}-user`) { this.memory.set(key, value); return; }
    if (!verifierKey(key)) throw Error('Unexpected social storage key');
    this.bundle.verifiers[key] = value; await this.persist();
  };
  removeItem = async (key: string): Promise<void> => {
    if (key === SOCIAL_KEY || key === `${SOCIAL_KEY}-user`) { this.memory.delete(key); return; }
    if (!verifierKey(key)) throw Error('Unexpected social storage key');
    if (!this.active) return;
    delete this.bundle.verifiers[key]; await this.persist();
  };
  async retire(phase: Phase): Promise<void> {
    this.active = false; await this.queue; this.memory.clear(); this.bundle.verifiers = {}; this.bundle.tx.phase = phase; await this.persist();
  }
}
export interface SocialEnvironment {
  url: string; publishable: string; config: SocialConfig; platform: string; origin: string; port: SocialPort;
  session(): Promise<Session | null>;
  checkpoint(): Promise<void>;
  adopt(session: Session): Promise<void>;
  open(url: string): Promise<void>;
  close(): Promise<void>;
  now?(): number;
  fetch?: typeof fetch;
}
export class SocialTransport {
  private storage?: TransportStorage;
  private client?: ReturnType<typeof createClient>;
  private generation = 0;
  private operations = 0;
  private committing = false;
  private adopted = false;
  private loaded = false;
  private corruptRaw?: string;
  private ignoredReceipts: string[] = [];
  private receiptFailure = false;
  constructor(private env: SocialEnvironment) {}
  get pending(): boolean { return !!this.storage && ['preparing', 'pending', 'consuming'].includes(this.storage.bundle.tx.phase); }
  private callback(): string {
    if (this.env.platform !== 'web') return NATIVE_SOCIAL_CALLBACK;
    const value = this.env.config.webCallback;
    if (!value || new URL(value).origin !== this.env.origin) throw Error('Social callback must use the initiating application origin');
    return value;
  }
  private async disposeClient(): Promise<void> { const client = this.client; this.client = undefined; await client?.auth.dispose(); }
  private sdk() {
    if (!this.storage) throw Error('No social transaction');
    return this.client ??= createClient(this.env.url, this.env.publishable, { global: { fetch: async (input, init) => {
      const address = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
      if (address.searchParams.get('grant_type') === 'refresh_token') throw Error('Temporary transport cannot refresh primary credentials');
      if (address.pathname.endsWith('/user/identities/authorize') && address.searchParams.get('code_challenge_method') !== 's256') throw Error('Secure PKCE required');
      return (this.env.fetch ?? fetch)(input, init);
    } }, auth: {
      storageKey: SOCIAL_KEY, storage: this.storage, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'pkce',
      experimental: { appendPkceFlowIdToRedirects: false },
    } });
  }
  async restore(): Promise<void> {
    if (this.loaded) return;
    const raw = await this.env.port.getItem(SOCIAL_TRANSACTION_KEY);
    if (raw === null) { this.loaded = true; return; }
    let bundle: Bundle | ReceiptOnly;
    try { if (raw.length > 8192) throw Error('Invalid social transaction'); bundle = JSON.parse(raw) as Bundle | ReceiptOnly; validateSocialBundle(bundle); }
    catch (error) { this.corruptRaw = raw; throw error; }
    if (bundle.tx === null) { this.ignoredReceipts = bundle.receipts; this.loaded = true; return; }
    this.storage = new TransportStorage(this.env.port, bundle as Bundle); this.loaded = true;
    if (this.pending && (bundle.tx.expires < (this.env.now?.() ?? Date.now()) || bundle.tx.phase !== 'pending')) await this.storage.retire('failed');
  }
  /** Record a delivered but inactive code before a later flow can see getLaunchUrl replay it. */
  async rememberIgnored(raw: string): Promise<void> {
    if (this.operations) throw Error('Social transaction is active');
    this.operations++; const generation = this.generation; let recording = false;
    try {
      if (!this.loaded) await this.restore();
      if (this.pending || generation !== this.generation) throw Error('Social transaction is active');
      const callback = this.callback(), u = new URL(raw), base = new URL(callback);
      if (raw.length > 8192 || u.protocol !== base.protocol || u.hostname !== base.hostname || u.port !== base.port || u.pathname !== base.pathname || u.username || u.password || u.hash) throw Error('Wrong social callback');
      const keys = [...u.searchParams.keys()];
      if (new Set(keys).size !== keys.length || keys.some(k => !['code', 'error', 'error_code', 'error_description', ...base.searchParams.keys()].includes(k)) || [...base.searchParams].some(([k,v]) => u.searchParams.get(k) !== v)) throw Error('Wrong social callback fields');
      if (u.searchParams.has('error')) return;
      const code = u.searchParams.get('code');
      if (!code || code.length > 2048 || /[\s\x00-\x1f]/.test(code)) throw Error('Invalid callback code');
      recording = true;
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(callback + '\n' + code));
      const receipt = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
      if (generation !== this.generation) throw Error('Social transaction changed');
      const previous = this.storage?.bundle.receipts ?? this.ignoredReceipts;
      if (previous.includes(receipt)) return;
      const receipts = [...previous, receipt].slice(-8);
      if (this.storage) { this.storage.bundle.receipts = receipts; await this.storage.persist(); }
      else {
        const bytes = JSON.stringify({ tx: null, verifiers: {}, receipts } satisfies ReceiptOnly);
        await this.env.port.setItem(SOCIAL_TRANSACTION_KEY, bytes);
        if (await this.env.port.getItem(SOCIAL_TRANSACTION_KEY) !== bytes) throw Error('Callback receipt read-back failed');
        this.ignoredReceipts = receipts;
      }
    } catch (error) { if (recording) this.receiptFailure = true; throw error; }
    finally { this.operations--; }
  }
  get canResetCorrupt(): boolean { return this.env.platform === 'web' && this.corruptRaw !== undefined; }
  async resetCorrupt(): Promise<void> {
    if (!this.canResetCorrupt || this.operations || this.storage) throw Error('No confirmed corrupt web transaction');
    this.operations++;
    try {
      if (await this.env.port.getItem(SOCIAL_TRANSACTION_KEY) !== this.corruptRaw) throw Error('Social transaction changed');
      await this.env.port.removeItem(SOCIAL_TRANSACTION_KEY);
      if (await this.env.port.getItem(SOCIAL_TRANSACTION_KEY) !== null) throw Error('Social reset read-back failed');
      this.corruptRaw = undefined; this.loaded = true;
    } finally { this.operations--; }
  }
  async start(provider: SocialProvider, purpose: Purpose): Promise<void> {
    if (this.operations) throw Error('A social transaction is already pending');
    this.operations++; let owns = false; const generation = ++this.generation;
    const active = () => { if (generation !== this.generation) throw Error('Social transaction cancelled'); };
    try {
      if (!this.loaded) await this.restore();
      active();
      if (this.pending) throw Error('A social transaction is already pending');
      if (this.receiptFailure) throw Error('Reload to verify callback receipt storage');
      if (!enabledSocialProviders(this.env.config, this.env.platform).includes(provider) || !['login', 'link'].includes(purpose)) throw Error('Social provider is not ready');
      if (!globalThis.crypto?.getRandomValues || !globalThis.crypto?.subtle) throw Error('Secure PKCE unavailable');
      await crypto.subtle.digest('SHA-256', new Uint8Array([1, 2, 3]));
      active();
      const session = await this.env.session();
      active();
      if (purpose === 'login' ? !!session : !session) throw Error('Wrong social purpose for active account');
      const now = this.env.now?.() ?? Date.now();
      const id = Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('');
      this.storage = new TransportStorage(this.env.port, { tx: { version: 1, id, provider, purpose, owner: session?.user.id ?? null, callback: this.callback(), started: now, expires: now + TTL, phase: 'preparing' }, verifiers: {}, receipts: [...(this.storage?.bundle.receipts ?? this.ignoredReceipts)] });
      owns = true; await this.disposeClient(); await this.storage.persist(); active(); await this.env.checkpoint(); active();
      const sdk = this.sdk();
      if (purpose === 'link') {
        const verified = await sdk.auth.getUser(session!.access_token);
        if (verified.error || verified.data.user?.id !== session!.user.id) throw Error('Original account could not be verified');
        active();
        const payload = JSON.parse(atob(session!.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
        if (!payload.exp || payload.exp * 1000 < (this.env.now?.() ?? Date.now()) + 120_000) throw Error('Refresh primary session before linking');
        const seeded = await sdk.auth.setSession({ access_token: session!.access_token, refresh_token: session!.refresh_token });
        active();
        if (seeded.error || seeded.data.user?.id !== session!.user.id) throw Error('Original session changed');
      }
      const options = { redirectTo: this.storage.bundle.tx.callback, skipBrowserRedirect: true };
      const result = purpose === 'link' ? await sdk.auth.linkIdentity({ provider, options }) : await sdk.auth.signInWithOAuth({ provider, options });
      const flowId = result.data.flowId;
      if (generation !== this.generation || result.error || !result.data.url || !flowId || !flowPattern.test(flowId)) throw Error('Social start failed');
      const destination = new URL(result.data.url);
      if ((purpose === 'login' && destination.searchParams.get('code_challenge_method') !== 's256') || destination.protocol !== 'https:' || destination.username || destination.password) throw Error('Unsafe provider URL');
      await this.verifyOwner();
      this.storage.bundle.tx.flowId = flowId; this.storage.bundle.tx.phase = 'pending'; await this.storage.persist();
      if (generation !== this.generation) throw Error('Social transaction cancelled');
      await this.env.open(destination.href);
    } catch (error) { if (owns) { try { await this.storage!.retire('failed'); } finally { await this.disposeClient(); } } throw error; }
    finally { this.operations--; }
  }
  private async verifyOwner(): Promise<void> {
    const current = await this.env.session();
    if ((current?.user.id ?? null) !== this.storage?.bundle.tx.owner) throw Error('Account changed');
  }
  async consume(raw: string): Promise<void> {
    const t = this.storage?.bundle.tx;
    if (!t || t.phase !== 'pending' || !t.flowId || t.callback !== this.callback()) throw Error('No matching active social transaction');
    const u = new URL(raw), base = new URL(t.callback);
    if (u.protocol !== base.protocol || u.hostname !== base.hostname || u.port !== base.port || u.pathname !== base.pathname || u.username || u.password || u.hash) throw Error('Wrong social callback');
    const keys = [...u.searchParams.keys()];
    if (new Set(keys).size !== keys.length || keys.some(k => !['code', 'error', 'error_code', 'error_description', ...base.searchParams.keys()].includes(k))
      || [...base.searchParams].some(([k,v]) => u.searchParams.get(k) !== v)) throw Error('Wrong social callback fields');
    // A browser dismissal/provider error is not proof of cancellation; a delayed URL may still arrive.
    if (u.searchParams.has('error')) throw Error('Provider returned an error; explicit cancellation required');
    const code = u.searchParams.get('code');
    if (!code || code.length > 2048 || /[\s\x00-\x1f]/.test(code)) throw Error('Social login was cancelled or rejected');
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(base.href + '\n' + code));
    const receipt = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
    if (this.storage?.bundle.tx !== t || t.phase !== 'pending') throw Error('Social transaction changed');
    // getLaunchUrl can replay an earlier result after a WebView reload and a new sign-in.
    if (this.storage.bundle.receipts?.includes(receipt)) return;
    if (!enabledSocialProviders(this.env.config, this.env.platform).includes(t.provider) || t.expires < (this.env.now?.() ?? Date.now()) || t.started > (this.env.now?.() ?? Date.now()) + 30_000) {
      await this.cancel(); throw Error('Social transaction expired or rejected');
    }
    this.operations++; t.phase = 'consuming'; const generation = ++this.generation;
    this.storage.bundle.receipts = [...(this.storage.bundle.receipts ?? []), receipt].slice(-8);
    try {
      await this.verifyOwner();
      if (generation !== this.generation) throw Error('Social transaction cancelled');
      await this.storage!.persist();
      // Mark consumed BEFORE closing Browser; browserFinished must not cancel adoption.
      await this.env.close().catch(() => {});
      const result = await this.sdk().auth.exchangeCodeForSession(code, { flowId: t.flowId });
      if (result.error || !result.data.session) throw Error('Code exchange failed');
      const session = result.data.session;
      const verified = await this.sdk().auth.getUser(session.access_token);
      const user: User | null = verified.data.user;
      if (verified.error || !user || user.id !== session.user.id || !user.identities?.some(i => i.provider === t.provider)
        || (t.purpose === 'link' && user.id !== t.owner)) throw Error('Social identity mismatch');
      await this.verifyOwner();
      if (generation !== this.generation) throw Error('Social transaction cancelled');
      await this.storage!.retire('complete');
      if (generation !== this.generation) throw Error('Social transaction cancelled');
      this.committing = true;
      await this.env.adopt({ ...session, user });
      this.adopted = true;
    } catch (error) { await this.storage!.retire('failed'); throw error; }
    finally { this.committing = false; this.operations--; await this.disposeClient(); }
  }
  async cancel(): Promise<void> {
    if (this.committing || this.adopted) throw Error('Social adoption has already started');
    this.operations++; ++this.generation;
    try { if (this.storage) await this.storage.retire('cancelled'); await this.disposeClient(); await this.env.close().catch(() => {}); }
    finally { this.operations--; }
  }
  get acceptingBrowserClose(): boolean { return this.storage?.bundle.tx.phase === 'pending'; }
}
