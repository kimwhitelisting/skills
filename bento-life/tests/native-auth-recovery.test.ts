import { describe, expect, it, vi } from 'vitest';
import { NativeAuthRecovery, NativeAuthRecoveryPrompt, confirmedCredentialCorruption } from '../src/account/native-auth-recovery.ts';

const key = 'bento-auth:v1';
const invalid = () => Object.assign(new Error('Invalid data'), { code: 'invalidData' });
const osError = (name: string) => Object.assign(new Error(`An OS error occurred (${name})`), { code: 'osError' });
const session = JSON.stringify({ access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', expires_at: 1000 });
function fixture(platform = 'android', initialError: unknown = invalid()) {
  const data = new Map<string, unknown>([
    [key, 'damaged-auth-bytes'],
    ['another-auth-key', 'unrelated-secret-bytes'],
    ['bento-life:snapshot:v1', 'guest-progress-bytes'],
    ['bento-account:owner:bento-life:snapshot:v1', 'account-progress-bytes'],
    ['bento-cloud:owner:journal:v1', 'unsent-operation-bytes'],
    ['CapacitorStorage.xml', 'native-progress-bytes'],
  ]);
  let failure: unknown = initialError;
  const otherBytes = () => [...data].filter(([name]) => name !== key);
  const before = otherBytes();
  const port = {
    get: vi.fn(async (name: string): Promise<unknown> => {
      if (name === key && failure) throw failure;
      return data.get(name) ?? null;
    }),
    remove: vi.fn(async (name: string) => { data.delete(name); failure = undefined; return true; }),
    set: vi.fn(async (name: string, value: string | null) => { data.set(name, value); failure = undefined; }),
  };
  return { data, port, recovery: new NativeAuthRecovery(port, platform),
    fail: (error: unknown) => { failure = error; }, unchanged: () => expect(otherBytes()).toEqual(before) };
}

describe('confirmed native credential recovery', () => {
  it.each(['ios', 'android'])('offers invalidData recovery on %s but makes no automatic mutation', async platform => {
    const f = fixture(platform);
    await expect(f.recovery.getItem(key)).rejects.toMatchObject({ code: 'invalidData' });
    expect(f.recovery.canReset).toBe(true);
    expect(await f.recovery.resetConfirmed(false)).toBe(false);
    await expect(f.recovery.setItem(key, session)).rejects.toThrow('readable');
    await expect(f.recovery.removeItem(key)).rejects.toThrow('readable');
    expect(f.port.remove).not.toHaveBeenCalled(); expect(f.port.set).not.toHaveBeenCalled();
    expect(f.data.get(key)).toBe('damaged-auth-bytes'); f.unchanged();
  });
  it('classifies only the pinned Android AEAD error, not a generic iOS/Android OS error', async () => {
    expect(confirmedCredentialCorruption(osError('AEADBadTagException'), 'android')).toBe(true);
    for (const [platform, error] of [
      ['ios', osError('AEADBadTagException')], ['ios', osError('-25308')],
      ['android', osError('UserNotAuthenticatedException')], ['android', osError('KeyStoreException')],
      ['android', Object.assign(new Error('AEADBadTagException'), { code: 'unknownError' })],
      ['android', new Error('temporary network or device error')],
    ] as const) {
      const f = fixture(platform, error);
      await expect(f.recovery.getItem(key)).rejects.toThrow();
      expect(f.recovery.canReset).toBe(false);
      expect(await f.recovery.resetConfirmed(true)).toBe(false);
      await expect(f.recovery.setItem(key, session)).rejects.toThrow('readable');
      await expect(f.recovery.removeItem(key)).rejects.toThrow('readable');
      expect(f.port.remove).not.toHaveBeenCalled(); expect(f.port.set).not.toHaveBeenCalled(); f.unchanged();
    }
  });
  it('clears only confirmed damaged credentials and verifies null before success', async () => {
    const f = fixture('android', osError('AEADBadTagException'));
    await expect(f.recovery.getItem(key)).rejects.toThrow();
    expect(await f.recovery.resetConfirmed(true)).toBe(true);
    expect(f.port.remove).toHaveBeenCalledExactlyOnceWith(key);
    expect(f.port.get).toHaveBeenLastCalledWith(key);
    expect(f.data.has(key)).toBe(false);
    await expect(f.recovery.setItem(key, session)).rejects.toThrow('Reopen'); // no late SDK resurrection
    f.unchanged();
  });
  it('does not delete a session that recovered while the confirmation was open', async () => {
    const f = fixture(); await expect(f.recovery.getItem(key)).rejects.toThrow();
    f.fail(undefined); f.data.set(key, session);
    expect(await f.recovery.resetConfirmed(true)).toBe(true);
    expect(f.port.remove).not.toHaveBeenCalled(); expect(f.port.set).not.toHaveBeenCalled();
    expect(f.data.get(key)).toBe(session); f.unchanged();
  });
  it('serializes pending writes before reads so an older in-flight operation cannot race a recovery', async () => {
    const f = fixture(); f.fail(undefined); f.data.set(key, session);
    let finish!: () => void;
    f.port.set.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
    const writing = f.recovery.setItem(key, session);
    await Promise.resolve();
    const reading = f.recovery.getItem(key);
    await Promise.resolve(); expect(f.port.get).not.toHaveBeenCalled();
    finish(); await writing; await expect(reading).resolves.toBe(session);
    expect(f.recovery.canReset).toBe(false); expect(f.port.remove).not.toHaveBeenCalled(); f.unchanged();
  });
  it('treats an absent Keystore alias returning null as logged out, not corruption', async () => {
    const f = fixture(); f.fail(undefined); f.data.set(key, null);
    expect(await f.recovery.getItem(key)).toBeNull(); expect(f.recovery.canReset).toBe(false);
    expect(await f.recovery.resetConfirmed(true)).toBe(false); expect(f.port.remove).not.toHaveBeenCalled();
  });
  it('uses a targeted secure null only when Android remove=false leaves confirmed corrupt prefs', async () => {
    const f = fixture(); f.port.remove.mockImplementation(async () => false);
    await expect(f.recovery.getItem(key)).rejects.toThrow();
    expect(await f.recovery.resetConfirmed(true)).toBe(true);
    expect(f.port.set).toHaveBeenCalledExactlyOnceWith(key, null);
    expect(f.data.get(key)).toBeNull(); f.unchanged();
  });
  it.each(['remove-throws', 'readback-locked', 'readback-still-present', 'tombstone-write', 'tombstone-read'] as const)('does not claim success after %s', async mode => {
    const f = fixture(); await expect(f.recovery.getItem(key)).rejects.toThrow();
    if (mode === 'remove-throws') f.port.remove.mockRejectedValueOnce(osError('KeyStoreException'));
    if (mode === 'readback-locked') f.port.remove.mockImplementation(async () => { f.fail(osError('UserNotAuthenticatedException')); return false; });
    if (mode === 'readback-still-present') f.port.remove.mockImplementation(async () => { f.fail(undefined); f.data.set(key, session); return false; });
    if (mode.startsWith('tombstone')) {
      f.port.remove.mockImplementation(async () => false);
      f.port.set.mockImplementation(async () => { if (mode === 'tombstone-write') throw osError('KeyStoreException'); });
    }
    expect(await f.recovery.resetConfirmed(true)).toBe(false);
    expect(f.recovery.hasFailure).toBe(true); f.unchanged();
    if (!mode.startsWith('tombstone')) expect(f.port.set).not.toHaveBeenCalled();
  });
  it('never targets unknown arbitrary keys even when the plugin reports invalidData', async () => {
    const f = fixture(); f.port.get.mockRejectedValue(invalid());
    await expect(f.recovery.getItem('bento-life:snapshot:v1')).rejects.toThrow();
    expect(await f.recovery.resetConfirmed(true)).toBe(false);
    expect(f.port.remove).not.toHaveBeenCalled(); expect(f.port.set).not.toHaveBeenCalled(); f.unchanged();
  });
  it('does not forget an earlier failed key when a second auth read also fails', async () => {
    const f = fixture(); f.port.get.mockRejectedValue(invalid());
    await expect(f.recovery.getItem(key)).rejects.toThrow();
    await expect(f.recovery.getItem('bento-auth:v1-user')).rejects.toThrow();
    await expect(f.recovery.setItem(key, session)).rejects.toThrow('readable');
    await expect(f.recovery.removeItem(key)).rejects.toThrow('readable');
    expect(f.port.set).not.toHaveBeenCalled(); expect(f.port.remove).not.toHaveBeenCalled(); f.unchanged();
  });
  it.each(['not-json', '{}', '[]', 'null'])('preserves malformed serialized session %s for explicit recovery', async raw => {
    const f = fixture(); f.fail(undefined); f.data.set(key, raw);
    await expect(f.recovery.getItem(key)).rejects.toMatchObject({ code: 'invalidData' });
    expect(f.recovery.canReset).toBe(true); expect(f.data.get(key)).toBe(raw);
    expect(f.port.remove).not.toHaveBeenCalled(); f.unchanged();
  });
});

describe('native recovery confirmation UI controller', () => {
  it('offers only transient guidance for a locked Keychain', async () => {
    const f = fixture('ios', osError('-25308'));
    await expect(f.recovery.getItem(key)).rejects.toThrow();
    const prompt = new NativeAuthRecoveryPrompt(f.recovery, vi.fn());
    expect(prompt.markup()).toContain('잠금을 해제');
    expect(prompt.markup()).not.toContain('data-account="native-reset"');
    expect(await prompt.act('native-reset-confirm')).toBe(false);
    expect(f.port.remove).not.toHaveBeenCalled();
  });
  it('cancel and quick click-through preserve bytes; duplicate confirmed actions execute once', async () => {
    const f = fixture(); await expect(f.recovery.getItem(key)).rejects.toThrow();
    let time = 0;
    const prompt = new NativeAuthRecoveryPrompt(f.recovery, vi.fn(), () => time);
    expect(prompt.markup()).toContain('로그인 정보 복구 안내');
    await prompt.act('native-reset'); expect(prompt.markup()).toContain('미전송 기록은 그대로');
    await prompt.act('native-reset-confirm'); // too soon
    expect(f.port.remove).not.toHaveBeenCalled();
    await prompt.act('native-reset-cancel'); time = 500;
    await prompt.act('native-reset-confirm'); expect(f.port.remove).not.toHaveBeenCalled();
    await prompt.act('native-reset'); time = 1000;
    const results = await Promise.all([prompt.act('native-reset-confirm'), prompt.act('native-reset-confirm')]);
    expect(results).toEqual([true, false]); expect(f.port.remove).toHaveBeenCalledTimes(1); f.unchanged();
  });
  it('shows useful failure guidance instead of completion on removal failure', async () => {
    const f = fixture(); await expect(f.recovery.getItem(key)).rejects.toThrow();
    f.port.remove.mockRejectedValue(new Error('cannot remove'));
    let time = 0;
    const prompt = new NativeAuthRecoveryPrompt(f.recovery, vi.fn(), () => time);
    await prompt.act('native-reset'); time = 500;
    expect(await prompt.act('native-reset-confirm')).toBe(false);
    expect(prompt.markup()).toContain('복구 완료를 확인하지 못했어요'); f.unchanged();
  });
});
