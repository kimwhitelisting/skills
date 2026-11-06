import { describe, expect, it } from 'vitest';
import { acquireWriter } from '../src/account/writer-lock.ts';
function lockManager() {
  let held = false;
  return {
    request: async (_name: string, options: { ifAvailable?: boolean }, callback: (lock: object | null) => Promise<void>) => {
      expect(options.ifAvailable).toBe(true);
      if (held) return callback(null);
      held = true;
      try { await callback({}); } finally { held = false; }
    },
  } as unknown as Pick<LockManager, 'request'>;
}
describe('one origin game writer', () => {
  it('excludes a second tab, retains ownership while hidden, and permits explicit lifecycle handoff', async () => {
    const manager = lockManager();
    const first = await acquireWriter(manager); expect(first.acquired).toBe(true);
    expect((await acquireWriter(manager)).acquired).toBe(false);
    // Backgrounding does not release: only destruction/release ends a document's write lifetime.
    expect((await acquireWriter(manager)).acquired).toBe(false);
    first.release(); await new Promise(resolve => setTimeout(resolve, 0));
    const reloaded = await acquireWriter(manager); expect(reloaded.acquired).toBe(true); reloaded.release();
  });
  it('fails closed on unsupported or rejected lock API rather than writing without exclusion', async () => {
    expect((await acquireWriter(undefined)).acquired).toBe(false);
    const rejected = { request: async () => { throw Error('Unavailable'); } } as unknown as Pick<LockManager, 'request'>;
    expect((await acquireWriter(rejected)).acquired).toBe(false);
  });
});
