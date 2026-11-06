/** User-triggered export only. This module has no native imports, so standalone previews stay portable. */
export const RECOVERY_FILENAME = 'nyamnyam-save-recovery.json';
export type ExportResult = {
  status: 'download-requested' | 'share-returned' | 'cancelled' | 'unsupported' | 'failed' | 'busy';
  message: string;
};
export type RecoveryTransport = (json: string) => Promise<ExportResult>;

export async function browserRecoveryExport(json: string): Promise<ExportResult> {
  const link = document.createElement('a');
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  try {
    link.href = url;
    link.download = RECOVERY_FILENAME;
    document.body.append(link);
    link.click();
    return {
      status: 'download-requested',
      message: '다운로드를 요청했어요. 브라우저의 다운로드 목록에서 JSON 파일을 확인해 주세요. 저장 원본은 그대로 남아 있어요.',
    };
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

let registeredTransport: RecoveryTransport = browserRecoveryExport;
/** Installed by the native entry point before main loads; never called by the standalone entry point. */
export function registerRecoveryTransport(transport: RecoveryTransport): void {
  registeredTransport = transport;
}

export class RecoveryExporter {
  pending = false;

  constructor(
    private readonly readOriginals: () => string,
    private readonly transport: RecoveryTransport = registeredTransport,
  ) {}

  async run(): Promise<ExportResult> {
    if (this.pending) return { status: 'busy', message: '이미 내보내는 중이에요. 열린 창에서 먼저 마쳐 주세요.' };
    this.pending = true;
    try {
      // Take one immutable copy per explicit request, before any async native work.
      return await this.transport(this.readOriginals());
    } catch {
      return {
        status: 'failed',
        message: '저장 원본을 내보내지 못했어요. 원본은 지우지 않았어요. 잠시 후 다시 시도해 주세요.',
      };
    } finally {
      this.pending = false;
    }
  }
}
