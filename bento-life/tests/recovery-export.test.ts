import { afterEach, describe, expect, it, vi } from 'vitest';
import { Directory, Encoding } from '@capacitor/filesystem';
import { nativeRecoveryTransport } from '../src/ui/native-recovery-export.ts';
import { browserRecoveryExport, RecoveryExporter, RECOVERY_FILENAME } from '../src/ui/recovery-export.ts';

const original = JSON.stringify({ 'bento-life:run:v2:recovery:test': '{"version":2}', note: '한글 원본 🍱' });
const uri = `file:///app/cache/${RECOVERY_FILENAME}`;
function native() {
  const filesystem = { writeFile: vi.fn(async () => ({ uri })) };
  const share = { canShare: vi.fn(async () => ({ value: true })), share: vi.fn(async () => ({ activityType: '' })) };
  return { filesystem, share, transport: nativeRecoveryTransport(filesystem, share) };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('native recovery export', () => {
  it('does nothing until requested, writes exact UTF-8 content to one cache file and shares its returned URI', async () => {
    const n = native();
    const read = vi.fn(() => original);
    const exporter = new RecoveryExporter(read, n.transport);
    expect(read).not.toHaveBeenCalled();
    expect(n.filesystem.writeFile).not.toHaveBeenCalled();
    const result = await exporter.run();
    expect(n.filesystem.writeFile).toHaveBeenCalledExactlyOnceWith({
      path: RECOVERY_FILENAME, directory: Directory.Cache, encoding: Encoding.UTF8, data: original,
    });
    expect(n.share.share).toHaveBeenCalledExactlyOnceWith({ title: '냠냠졸졸 저장 원본', dialogTitle: '저장 원본 보관하기', files: [uri] });
    expect(result.status).toBe('share-returned');
    expect(result.message).toContain('확인해 주세요');
    expect(result.message).not.toContain('저장 완료');
    await exporter.run();
    expect(n.filesystem.writeFile.mock.calls[1]).toEqual(n.filesystem.writeFile.mock.calls[0]);
  });

  it('skips file creation when sharing is unsupported', async () => {
    const n = native();
    n.share.canShare.mockResolvedValue({ value: false });
    expect((await new RecoveryExporter(() => original, n.transport).run()).status).toBe('unsupported');
    expect(n.filesystem.writeFile).not.toHaveBeenCalled();
    expect(n.share.share).not.toHaveBeenCalled();
  });

  it('surfaces bridge availability failure without attempting to write or share', async () => {
    const n = native();
    n.share.canShare.mockRejectedValue(new Error('bridge unavailable'));
    const result = await new RecoveryExporter(() => original, n.transport).run();
    expect(result.status).toBe('failed');
    expect(result.message).toContain('공유 기능');
    expect(n.filesystem.writeFile).not.toHaveBeenCalled();
  });

  it('never opens share after a failed cache write and can retry after storage recovers', async () => {
    const n = native();
    n.filesystem.writeFile.mockRejectedValueOnce(new Error('no space'));
    const exporter = new RecoveryExporter(() => original, n.transport);
    expect((await exporter.run()).message).toContain('여유 공간');
    expect(n.share.share).not.toHaveBeenCalled();
    expect(exporter.pending).toBe(false);
    expect((await exporter.run()).status).toBe('share-returned');
    expect(n.filesystem.writeFile.mock.calls[1]).toEqual(n.filesystem.writeFile.mock.calls[0]);
  });

  it('refuses a missing/non-file URI instead of sharing unrelated content', async () => {
    const n = native();
    n.filesystem.writeFile.mockResolvedValue({ uri: 'https://invalid.example/file' });
    expect((await new RecoveryExporter(() => original, n.transport).run()).status).toBe('failed');
    expect(n.share.share).not.toHaveBeenCalled();
  });

  it.each([{ message: 'Share canceled' }, { name: 'AbortError' }])('preserves originals on explicit cancellation %j and supports another user request', async error => {
    const n = native();
    const source = new Map([['original', original]]);
    n.share.share.mockRejectedValueOnce(error);
    const exporter = new RecoveryExporter(() => source.get('original')!, n.transport);
    expect((await exporter.run()).status).toBe('cancelled');
    expect(source.get('original')).toBe(original);
    expect(exporter.pending).toBe(false);
    expect((await exporter.run()).status).toBe('share-returned');
    expect(source.get('original')).toBe(original);
  });

  it('reports unexpected share failure, does not mislabel it cancellation or success', async () => {
    const n = native();
    n.share.share.mockRejectedValue(new Error('permission denied'));
    const result = await new RecoveryExporter(() => original, n.transport).run();
    expect(result.status).toBe('failed');
    expect(result.message).toContain('공유 창');
    expect(result.message).toContain('원본은 유지');
  });

  it('ignores double taps throughout write AND share, and keeps the first immutable payload', async () => {
    const n = native();
    const writing = deferred<{ uri: string }>();
    const sharing = deferred<{ activityType: string }>();
    n.filesystem.writeFile.mockReturnValue(writing.promise);
    n.share.share.mockReturnValue(sharing.promise);
    let current = original;
    const read = vi.fn(() => current);
    const exporter = new RecoveryExporter(read, n.transport);
    const first = exporter.run();
    await Promise.resolve();
    current = 'later original';
    expect((await exporter.run()).status).toBe('busy');
    expect(exporter.pending).toBe(true);
    writing.resolve({ uri });
    await Promise.resolve();
    expect((await exporter.run()).status).toBe('busy');
    expect(exporter.pending).toBe(true);
    expect(read).toHaveBeenCalledTimes(1);
    expect(n.filesystem.writeFile).toHaveBeenCalledTimes(1);
    sharing.resolve({ activityType: '' });
    expect((await first).status).toBe('share-returned');
    expect(exporter.pending).toBe(false);
    expect(n.share.share).toHaveBeenCalledTimes(1);
  });

  it('catches source read and unexpected transport rejection without leaving a permanent busy flag', async () => {
    const n = native();
    const read = vi.fn(() => { throw new Error('read failed'); });
    const exporter = new RecoveryExporter(read, n.transport);
    expect((await exporter.run()).status).toBe('failed');
    expect(exporter.pending).toBe(false);
    expect(n.filesystem.writeFile).not.toHaveBeenCalled();
    const broken = new RecoveryExporter(() => original, async () => { throw new Error('unexpected'); });
    expect((await broken.run()).status).toBe('failed');
    expect(broken.pending).toBe(false);
  });
});

describe('standalone browser export', () => {
  function browser(click = vi.fn()) {
    const link = { href: '', download: '', click, remove: vi.fn() };
    const objectURL = { createObjectURL: vi.fn((_blob: Blob) => 'blob:recovery'), revokeObjectURL: vi.fn() };
    const document = { createElement: vi.fn(() => link), body: { append: vi.fn() } };
    vi.stubGlobal('URL', objectURL);
    vi.stubGlobal('document', document);
    vi.useFakeTimers();
    return { link, objectURL, document };
  }

  it('requests a JSON download without claiming the browser saved it, then releases the temporary URL', async () => {
    const b = browser();
    const result = await new RecoveryExporter(() => original, browserRecoveryExport).run();
    expect(result.status).toBe('download-requested');
    expect(b.link.download).toBe(RECOVERY_FILENAME);
    expect(b.link.click).toHaveBeenCalledOnce();
    expect(await b.objectURL.createObjectURL.mock.calls[0][0].text()).toBe(original);
    expect(b.link.remove).toHaveBeenCalledOnce();
    expect(b.objectURL.revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(b.objectURL.revokeObjectURL).toHaveBeenCalledWith('blob:recovery');
  });

  it('surfaces a browser download exception and still releases temporary resources', async () => {
    const b = browser(vi.fn(() => { throw new Error('download blocked'); }));
    const result = await new RecoveryExporter(() => original, browserRecoveryExport).run();
    expect(result.status).toBe('failed');
    expect(b.link.remove).toHaveBeenCalledOnce();
    vi.runAllTimers();
    expect(b.objectURL.revokeObjectURL).toHaveBeenCalledWith('blob:recovery');
  });
});
