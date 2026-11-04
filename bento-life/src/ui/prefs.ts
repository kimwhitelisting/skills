import type { Tuning } from '../game/config.ts';

/** 기기별 환경설정 (게임 진행과 별개). 스토어 출시 시 save.ts와 함께 @capacitor/preferences로 이전 */
export interface Prefs {
  sound: boolean;
  haptics: boolean;
  /** 실험 설정 — 다음 새 게임부터 적용 */
  tuning: Partial<Tuning>;
  seenIntro: boolean;
  seenDragHint: boolean;
}

const KEY = 'bento-life:prefs:v1';
const DEFAULTS: Prefs = { sound: true, haptics: true, tuning: {}, seenIntro: false, seenDragHint: false };

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    return { ...DEFAULTS, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePrefs(p: Prefs): void {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* 저장 불가 환경 무시 */ }
}
