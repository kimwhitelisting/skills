vi.mock('../src/account/social-entry.ts', () => ({ webSocialEntry: () => undefined }));
import { afterEach, expect, it, vi } from 'vitest';
// These existing modules register passive global listeners; this test isolates main's boot effects.
vi.mock('../src/proto/follow-core.ts', () => ({ mountFollow: vi.fn(), unmountFollow: vi.fn(), pauseFollow: vi.fn() }));
vi.mock('../src/ui/music.ts', () => ({ nowPlaying: vi.fn(), setMusicEnabled: vi.fn(), setTrack: vi.fn(), unlockMusic: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); vi.doUnmock('../src/main.ts'); vi.doUnmock('../src/account/account.ts'); });
it('importing main before account boot does not access DOM, storage or capture a running game', async () => {
  const touched = vi.fn(() => { throw Error('premature boot effect'); });
  vi.stubGlobal('document', new Proxy({}, { get: touched }));
  vi.stubGlobal('localStorage', new Proxy({}, { get: touched }));
  const main = await import('../src/main.ts');
  expect(typeof main.mountGame).toBe('function'); expect(touched).not.toHaveBeenCalled();
});
it('preview entry mounts only after asynchronous account initialization allows it', async () => {
  let resolve!: (ready: boolean) => void;
  const boot = vi.fn(() => new Promise<boolean>(done => { resolve = done; }));
  const mount = vi.fn();
  vi.doMock('../src/account/account.ts', () => ({ bootAccount: boot }));
  vi.doMock('../src/main.ts', () => ({ mountGame: mount }));
  await import('../src/entry-preview.ts');
  expect(boot).toHaveBeenCalledOnce(); expect(mount).not.toHaveBeenCalled();
  resolve(true); await Promise.resolve(); expect(mount).toHaveBeenCalledOnce();
});
it('preview entry never mounts a game when a second tab fails the writer lock', async () => {
  const mount = vi.fn();
  vi.doMock('../src/account/account.ts', () => ({ bootAccount: async () => false }));
  vi.doMock('../src/main.ts', () => ({ mountGame: mount }));
  await import('../src/entry-preview.ts'); await Promise.resolve();
  expect(mount).not.toHaveBeenCalled();
});
