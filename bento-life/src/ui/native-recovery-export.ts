import { Directory, Encoding, type FilesystemPlugin } from '@capacitor/filesystem';
import type { SharePlugin } from '@capacitor/share';
import { RECOVERY_FILENAME, type RecoveryTransport } from './recovery-export.ts';

/** Only the native entry point imports this adapter. Never touch save keys or recovery originals here. */
export function nativeRecoveryTransport(
  filesystem: Pick<FilesystemPlugin, 'writeFile'>,
  share: Pick<SharePlugin, 'canShare' | 'share'>,
): RecoveryTransport {
  return async json => {
    try {
      if (!(await share.canShare()).value) {
        return { status: 'unsupported', message: '이 기기에서 공유 창을 열 수 없어요. 저장 원본은 그대로 남아 있어요. 사용할 공유 앱을 확인한 뒤 다시 시도해 주세요.' };
      }
    } catch {
      return { status: 'failed', message: '공유 기능을 확인하지 못했어요. 원본은 유지했어요. 잠시 후 다시 시도해 주세요.' };
    }

    let uri: string;
    try {
      // Reuse one owned cache file; do not create an unbounded export history or ask for external storage access.
      const file = await filesystem.writeFile({
        path: RECOVERY_FILENAME,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
        data: json,
      });
      if (!file.uri?.startsWith('file://')) throw new Error('Missing native file URI');
      uri = file.uri;
    } catch {
      return { status: 'failed', message: '내보낼 임시 파일을 만들지 못했어요. 기기의 여유 공간을 확인한 뒤 다시 시도해 주세요. 저장 원본은 유지했어요.' };
    }

    try {
      await share.share({
        title: '냠냠졸졸 저장 원본',
        dialogTitle: '저장 원본 보관하기',
        files: [uri],
      });
      // A resolved sheet does not prove the receiving app saved the file (activityType may be empty).
      return { status: 'share-returned', message: '공유 창을 닫았어요. 선택한 앱이나 파일 위치에서 JSON이 보관됐는지 확인해 주세요. 저장 원본은 그대로 남아 있어요.' };
    } catch (error) {
      const failure = error as { name?: string; message?: string } | null;
      // Pinned Share 8.0.3 reports this exact cancellation on Android and iOS.
      if (failure?.message === 'Share canceled' || failure?.name === 'AbortError') {
        return { status: 'cancelled', message: '내보내기를 취소했어요. 저장 원본은 그대로 남아 있으며 다시 내보낼 수 있어요.' };
      }
      return { status: 'failed', message: '공유 창에서 내보내기를 마치지 못했어요. 저장 원본은 유지했어요. 공유할 앱을 확인한 뒤 다시 시도해 주세요.' };
    }
  };
}
