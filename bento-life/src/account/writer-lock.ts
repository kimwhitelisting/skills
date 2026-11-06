export interface WriterLease { acquired: boolean; release(): void }
/** One writer for the entire origin, including guest state and login handoff. Never steal a background tab's lock. */
export async function acquireWriter(locks: Pick<LockManager, 'request'> | undefined): Promise<WriterLease> {
  if (!locks) return { acquired: false, release: () => {} };
  return new Promise(resolve => {
    let delivered = false;
    const result = locks.request('bento-life-writer:v1', { mode: 'exclusive', ifAvailable: true }, async lock => {
      if (!lock) { delivered = true; resolve({ acquired: false, release: () => {} }); return; }
      await new Promise<void>(release => { delivered = true; resolve({ acquired: true, release }); });
    });
    void result.catch(() => { if (!delivered) resolve({ acquired: false, release: () => {} }); });
  });
}
