import { afterEach, describe, expect, it, vi } from 'vitest';
import { signedRemote } from '../src/account/remote.ts';
import { readGuestSnapshot } from '../src/account/account.ts';
import { nativeAuthStorage } from '../src/account/native-auth.ts';
import { SecureStorage, KeychainAccess } from '@aparajita/capacitor-secure-storage';
vi.mock('@aparajita/capacitor-secure-storage', () => ({
  KeychainAccess: { whenUnlockedThisDeviceOnly: 1 },
  SecureStorage: { setSynchronize: vi.fn(async () => {}), setKeyPrefix: vi.fn(async () => {}), setDefaultKeychainAccess: vi.fn(async () => {}), get: vi.fn(async () => null), set: vi.fn(async () => {}), remove: vi.fn(async () => true) },
}));
afterEach(() => vi.clearAllMocks());
describe('auth boundaries', () => {
  it('refuses old account queued work under a new session or no session', async () => {
    const request = vi.fn();
    const remote = signedRemote('A', 'https://test.supabase.co', 'public', async () => ({ user: { id: 'B' }, access_token: 'B-token' }), () => true, request);
    await expect(remote.get()).rejects.toThrow('Account changed'); expect(request).not.toHaveBeenCalled();
  });
  it('checks the generation again after an awaited session read', async () => {
    let active = true; const request = vi.fn();
    const remote = signedRemote('A', 'https://test.supabase.co', 'public', async () => { active = false; return { user: { id: 'A' }, access_token: 'A-token' }; }, () => active, request);
    await expect(remote.get()).rejects.toThrow(); expect(request).not.toHaveBeenCalled();
  });
  it('captures one bearer and sends no caller-controlled owner field to RPC', async () => {
    const request = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({ revision: 0, snapshot: null, updated_at: null })));
    const remote = signedRemote('A', 'https://test.supabase.co', 'public', async () => ({ user: { id: 'A' }, access_token: 'captured' }), () => true, request);
    await remote.get();
    expect(request.mock.calls[0][1]?.body).toBe('{}');
    expect(request.mock.calls[0][1]?.headers).toMatchObject({ Authorization: 'Bearer captured' });
  });
  it('uses device-only non-synced native auth storage and never falls back on failure', async () => {
    const storage = await nativeAuthStorage();
    expect(SecureStorage.setSynchronize).toHaveBeenCalledWith(false);
    expect(SecureStorage.setDefaultKeychainAccess).toHaveBeenCalledWith(KeychainAccess.whenUnlockedThisDeviceOnly);
    await storage.setItem('bento-auth:v1', 'session-json');
    expect(SecureStorage.set).toHaveBeenCalledWith('bento-auth:v1', 'session-json', false, false, KeychainAccess.whenUnlockedThisDeviceOnly);
    vi.mocked(SecureStorage.get).mockRejectedValueOnce(new Error('locked'));
    await expect(storage.getItem('bento-auth:v1')).rejects.toThrow('locked');
    await storage.removeItem('bento-auth:v1'); expect(SecureStorage.remove).toHaveBeenCalledWith('bento-auth:v1', false);
  });
  it('does not read auth/other-account data during guest inspection or alter malformed originals', () => {
    const map = new Map([['bento-life:run:v2', '{"version":2}'], ['bento-auth:v1', 'secret'], ['bento-account:other:bento-life:snapshot:v1', 'other']]);
    const read = vi.fn((key: string) => map.get(key) ?? null);
    expect(() => readGuestSnapshot({ getItem: read })).toThrow();
    expect(map.get('bento-life:run:v2')).toBe('{"version":2}');
    expect(read.mock.calls.map(([key]) => key)).not.toContain('bento-auth:v1');
    expect(read.mock.calls.some(([key]) => key.startsWith('bento-account:'))).toBe(false);
  });
});
