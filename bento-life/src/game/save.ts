import type { GameState, Photo } from './types.ts';

// 웹/웹뷰 공통 localStorage. 안드로이드 앱에서는 entry-app.ts가 거울(@capacitor/preferences)을 달아
// 앱 저장소에도 같이 쓴다 (기기 저장 공간이 부족할 때 웹뷰 저장소가 지워져도 진행이 남도록).
const RUN_KEY = 'bento-life:run:v2';
const DEX_KEY = 'bento-life:dex:v1';
export const PREFS_KEY = 'bento-life:prefs:v1';
/** 앱 저장소로 옮겨 둘 키 전부 */
export const STORAGE_KEYS = [RUN_KEY, DEX_KEY, PREFS_KEY];

type Mirror = (key: string, value: string | null) => void;
let mirror: Mirror | undefined;
/** 앱(Capacitor)에서만: 저장할 때마다 앱 저장소에도 같이 쓴다 */
export const setStorageMirror = (m: Mirror) => { mirror = m; };
/** 문자열 그대로 저장 (거울 포함) */
export function writeKey(key: string, value: string | null): void {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* 저장 불가 환경 무시 */ }
  try { mirror?.(key, value); } catch { /* 앱 저장소 실패는 무시 */ }
}

/** 도감 + 하트 지갑 (판이 끝나도 남는 것) */
export interface Dex { menus: string[]; endings: string[]; events: string[]; plays: number; hearts: number; owned: string[]; equip: { theme?: string; hat?: string }; photos: Record<string, Photo> }

function read<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}
function write(key: string, v: unknown) {
  writeKey(key, JSON.stringify(v));
}

export const loadRun = () => {
  const s = read<GameState>(RUN_KEY);
  return s?.version === 2 ? s : undefined;
};
export const saveRun = (s: GameState) => write(RUN_KEY, s);
export const clearRun = () => writeKey(RUN_KEY, null);

export const loadDex = (): Dex => ({ menus: [], endings: [], events: [], plays: 0, hearts: 0, owned: [], equip: {}, photos: {}, ...read<Dex>(DEX_KEY) });
export const saveDex = (d: Dex) => write(DEX_KEY, d);
