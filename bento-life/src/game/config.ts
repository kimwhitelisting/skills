import type { GameState, MealTime } from './types.ts';

/**
 * 실험용 조정값. 새 게임을 시작할 때 GameState.tuning 에 복사되어 그 판 동안 고정된다.
 * 게임 안 ⚙️ 설정 > 실험 설정 에서 바꿀 수 있다.
 */
export interface Tuning {
  /** 1년에 보내는 하루 수 (1~3). 늘리면 하루의 효과가 그만큼 작아진다 */
  daysPerYear: 1 | 2 | 3;
  /** 매년 들어오는 반찬값 = incomeBase + incomePerDay × 하루 수 */
  incomeBase: number;
  incomePerDay: number;
  /** 재료 가격 배율 */
  priceMult: number;
}

export const DEFAULT_TUNING: Tuning = { daysPerYear: 1, incomeBase: 2, incomePerDay: 6, priceMult: 1 };

export const tuningOf = (s: GameState): Tuning => ({ ...DEFAULT_TUNING, ...s.tuning });

export const yearlyIncome = (s: GameState) => {
  const t = tuningOf(s);
  return t.incomeBase + t.incomePerDay * t.daysPerYear;
};

const TIME_ORDER: MealTime[] = ['breakfast', 'lunch', 'dinner'];

/** 시기별로 중요한 끼니 순서 — 끼니 수가 줄면 앞에서부터 남는다 */
export const MEAL_PRIORITY: Record<string, MealTime[]> = {
  infant: ['lunch', 'breakfast', 'dinner'],
  toddler: ['lunch', 'dinner', 'breakfast'], // 어린이집 도시락
  child: ['lunch', 'breakfast', 'dinner'], // 학교 도시락
  teen: ['lunch', 'breakfast', 'dinner'],
  high: ['dinner', 'lunch', 'breakfast'], // 야자 도시락
  adult: ['dinner', 'lunch', 'breakfast'], // 마지막 집밥
};
export { TIME_ORDER };
