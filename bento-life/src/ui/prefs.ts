import type { Tuning } from '../game/config.ts';
import { PREFS_KEY, writeKey, readSaved } from '../game/save.ts';

/** 기기별 환경설정 (게임 진행과 별개). 스토어 출시 시 save.ts와 함께 @capacitor/preferences로 이전 */
export interface Prefs {
  sound: boolean;
  haptics: boolean;
  /** 배경음악 */
  music: boolean;
  /** 이미 본 첫 플레이 안내 */
  seenTips: string[];
  /** 실험 설정 — 다음 새 게임부터 적용 */
  tuning: Partial<Tuning>;
  seenIntro: boolean;
  seenDragHint: boolean;
}

const KEY = PREFS_KEY;
const DEFAULTS: Prefs = { sound: true, haptics: true, music: true, seenTips: [], tuning: {}, seenIntro: false, seenDragHint: false };

export function loadPrefs(): Prefs {
  return { ...DEFAULTS, ...readSaved<Partial<Prefs>>(KEY) };
}

export function savePrefs(p: Prefs): void {
  writeKey(KEY, JSON.stringify(p));
}
