import type { StorageStatus } from '../game/save.ts';
import type { SyncMode } from './sync.ts';
export interface SaveStatusInput {
  local: StorageStatus;
  signedIn: boolean;
  unavailable: boolean;
  online: boolean;
  sync?: { mode: SyncMode; dirty: boolean; pending: boolean; hasConfirmedSave: boolean; saveIssue: boolean };
}
/** Login and local persistence never stand in for an acknowledged cloud save. */
export function saveStatusLabel({ local, signedIn, unavailable, online, sync }: SaveStatusInput): string {
  if (local.blocked || local.errors.length) return '기기 저장 오류 · 확인이 필요해요';
  if (local.pending) return '기기에 저장 중';
  if (unavailable) return '계정 확인 필요 · 기기 기록은 유지해요';
  if (!signedIn) return '이 기기에만 저장 · 계정 보관 안 됨';
  if (!sync || sync.mode === 'loading') return '계정 저장 확인 중';
  if (sync.mode === 'choose') return '계정에 보관할 진행 선택 필요';
  if (sync.mode === 'conflict') return '서로 다른 진행 · 이어갈 기록 선택 필요';
  if (sync.mode === 'blocked') return '계정 저장 확인 필요 · 기기 기록 유지';
  if (sync.dirty || sync.pending) return !online || sync.saveIssue
    ? '기기에 저장됨 · 계정 전송 대기'
    : '기기에 저장됨 · 계정에 저장 중';
  if (sync.hasConfirmedSave) return sync.saveIssue || !online
    ? '마지막 확인 시 계정에 저장됨 · 연결 확인 필요'
    : '계정에 저장됨';
  return '계정 저장 완료 확인 필요';
}
