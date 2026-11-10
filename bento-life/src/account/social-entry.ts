import { socialConfig } from './social-runtime-config.ts';
import { NATIVE_SOCIAL_CALLBACK, type SocialConfig } from './social-config.ts';
export interface SocialEntry {
  platform: string;
  open(url: string): Promise<void>;
  close(): Promise<void>;
  connect(callback: (url: string) => Promise<void>, finished: () => Promise<void>): Promise<void>;
}
function exactNative(raw: string): boolean {
  try { if (raw.length > 8192) return false; const u = new URL(raw), base = new URL(NATIVE_SOCIAL_CALLBACK); return u.protocol === base.protocol && u.hostname === base.hostname && u.port === '' && u.pathname === base.pathname; } catch { return false; }
}
/** Scrub before constructing the implicit email client; never interpret its recovery fragment here. */
export function webSocialEntry(config: SocialConfig = socialConfig): SocialEntry {
  const current = new URL(location.href);
  const base = config.webCallback ? new URL(config.webCallback) : undefined;
  const recognized = current.searchParams.has('bento_social') || (base && current.origin === base.origin && current.pathname === base.pathname && current.searchParams.has('code'));
  const callback = recognized && (current.searchParams.has('code') || current.searchParams.has('error') || !!current.hash) ? current.href : undefined;
  if (recognized) history.replaceState(history.state, '', current.pathname); // remove all social URL material before auth initialization
  return { platform: 'web', open: async url => { if (window.top !== window.self) throw Error('Social sign-in requires a top-level browser'); location.assign(url); }, close: async () => {},
    connect: async consumer => { if (callback) await consumer(callback); } };
}
export interface NativeSocialAPI {
  platform: string;
  onURL(fn: (url: string) => void): Promise<unknown>;
  launchURL(): Promise<string | undefined>;
  onFinished(fn: () => void): Promise<unknown>;
  open(url: string): Promise<void>;
  close(): Promise<void>;
}
/** Register warm listener first, then cold launch lookup; a single consumer deduplicates both. */
export async function nativeSocialEntry(api: NativeSocialAPI): Promise<SocialEntry> {
  const queue: string[] = [];
  const seen = new Set<string>();
  let consume: ((url: string) => Promise<void>) | undefined, finished: (() => Promise<void>) | undefined;
  let work = Promise.resolve();
  const drain = () => { work = work.then(async () => { while (consume && queue.length) { try { await consume(queue.shift()!); } catch { /* Consumer owns its error UI; keep future callbacks usable. */ } } }); return work; };
  const receive = (url: string) => { if (exactNative(url) && !seen.has(url)) { seen.add(url); if (seen.size > 8) seen.delete(seen.values().next().value!); if (queue.length < 8) queue.push(url); void drain(); } };
  await api.onURL(receive);
  await api.onFinished(() => { if (finished) void finished().catch(() => {}); });
  const initial = await api.launchURL(); if (initial) receive(initial);
  return { platform: api.platform, open: api.open, close: api.close, connect: async (consumer, onFinished) => { consume = consumer; finished = onFinished; await drain(); } };
}
