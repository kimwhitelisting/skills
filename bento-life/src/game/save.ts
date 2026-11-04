import type { GameState } from './types.ts';

// 웹/웹뷰 공통 localStorage. 스토어 출시 시 @capacitor/preferences 로 교체 가능하도록 이 파일에만 둔다.
const RUN_KEY = 'bento-life:run:v2';
const DEX_KEY = 'bento-life:dex:v1';

export interface Dex { menus: string[]; endings: string[]; plays: number }

function read<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}
function write(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* 저장 불가 환경 무시 */ }
}

export const loadRun = () => {
  const s = read<GameState>(RUN_KEY);
  return s?.version === 2 ? s : undefined;
};
export const saveRun = (s: GameState) => write(RUN_KEY, s);
export const clearRun = () => { try { localStorage.removeItem(RUN_KEY); } catch { /* */ } };

export const loadDex = (): Dex => ({ menus: [], endings: [], plays: 0, ...read<Dex>(DEX_KEY) });
export const saveDex = (d: Dex) => write(DEX_KEY, d);
