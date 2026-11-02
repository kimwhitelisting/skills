import type { Ingredient } from '../game/types.ts';

const ADULT = 99;

/**
 * 재료 테이블. 기획 수정은 여기서.
 * - stats: 먹었을 때 기본 효과 (아침/점심/저녁, 선호도 등으로 보정됨)
 * - minAge/maxAge: 해당 나이에만 선택 가능 (이유식 → 일반식 → 매운 음식)
 */
export const INGREDIENTS: Ingredient[] = [
  // ── 주식 (base) ──
  { id: 'formula', slot: 'base', name: '분유', emoji: '🍼', minAge: 0, maxAge: 1, cost: 2, stats: { health: 2, fitness: 1 }, tags: ['우유'], appeal: 1, dish: '분유 세트' },
  { id: 'porridge', slot: 'base', name: '쌀미음', emoji: '🥣', minAge: 0, maxAge: 2, cost: 1, stats: { health: 1, happy: 1 }, tags: ['탄수'], appeal: 0, dish: '미음' },
  { id: 'rice', slot: 'base', name: '흰쌀밥', emoji: '🍚', minAge: 2, maxAge: ADULT, cost: 1, stats: { fitness: 1, happy: 1 }, tags: ['탄수'], appeal: 1, dish: '덮밥' },
  { id: 'riceball', slot: 'base', name: '주먹밥', emoji: '🍙', minAge: 2, maxAge: ADULT, cost: 1, stats: { happy: 2 }, tags: ['탄수'], appeal: 1, dish: '주먹밥' },
  { id: 'multigrain', slot: 'base', name: '잡곡밥', emoji: '🌾', minAge: 3, maxAge: ADULT, cost: 2, stats: { health: 2, smarts: 1 }, tags: ['탄수', '건강'], appeal: -1, dish: '잡곡 도시락' },
  { id: 'bread', slot: 'base', name: '식빵', emoji: '🍞', minAge: 3, maxAge: ADULT, cost: 2, stats: { happy: 2, social: 1 }, tags: ['탄수', '달콤'], appeal: 2, dish: '샌드위치' },
  { id: 'udon', slot: 'base', name: '우동면', emoji: '🍜', minAge: 3, maxAge: ADULT, cost: 2, stats: { happy: 2, fitness: 1 }, tags: ['탄수', '면'], appeal: 2, dish: '볶음우동' },
  { id: 'gimbap', slot: 'base', name: '김밥', emoji: '🌯', minAge: 4, maxAge: ADULT, cost: 3, stats: { happy: 2, social: 2 }, tags: ['탄수'], appeal: 2, dish: '김밥' },

  // ── 메인 반찬 (main) ──
  { id: 'beefpuree', slot: 'main', name: '소고기 퓨레', emoji: '🥩', minAge: 0, maxAge: 2, cost: 3, stats: { health: 2, fitness: 2 }, tags: ['고기', '단백질'], appeal: 0, frag: '소고기' },
  { id: 'whitefish', slot: 'main', name: '흰살생선', emoji: '🐟', minAge: 0, maxAge: ADULT, cost: 3, stats: { health: 2, smarts: 1 }, tags: ['생선', '단백질'], appeal: -1, frag: '생선살' },
  { id: 'egg', slot: 'main', name: '계란말이', emoji: '🥚', minAge: 1, maxAge: ADULT, cost: 1, stats: { health: 1, fitness: 1 }, tags: ['단백질'], appeal: 2, frag: '계란' },
  { id: 'tofu', slot: 'main', name: '두부부침', emoji: '🫘', minAge: 1, maxAge: ADULT, cost: 1, stats: { health: 2 }, tags: ['단백질', '건강'], appeal: -1, frag: '두부' },
  { id: 'chicken', slot: 'main', name: '닭가슴살', emoji: '🍗', minAge: 2, maxAge: ADULT, cost: 3, stats: { fitness: 3 }, tags: ['고기', '단백질'], appeal: 0, frag: '닭가슴살' },
  { id: 'bulgogi', slot: 'main', name: '불고기', emoji: '🥘', minAge: 2, maxAge: ADULT, cost: 4, stats: { fitness: 2, happy: 2 }, tags: ['고기', '단백질', '달콤'], appeal: 3, frag: '불고기' },
  { id: 'mackerel', slot: 'main', name: '고등어구이', emoji: '🐠', minAge: 3, maxAge: ADULT, cost: 3, stats: { smarts: 3, health: 1 }, tags: ['생선', '단백질', '두뇌'], appeal: -2, frag: '고등어' },
  { id: 'sausage', slot: 'main', name: '비엔나소시지', emoji: '🌭', minAge: 3, maxAge: ADULT, cost: 2, stats: { happy: 3, health: -2 }, tags: ['고기', '정크'], appeal: 3, frag: '소시지' },
  { id: 'tonkatsu', slot: 'main', name: '돈까스', emoji: '🍖', minAge: 4, maxAge: ADULT, cost: 4, stats: { happy: 3, fitness: 1, health: -1 }, tags: ['고기', '튀김'], appeal: 3, frag: '돈까스' },
  { id: 'jeyuk', slot: 'main', name: '제육볶음', emoji: '🌶️', minAge: 6, maxAge: ADULT, cost: 3, stats: { fitness: 2, happy: 2 }, tags: ['고기', '매운'], appeal: 2, frag: '제육' },

  // ── 곁들이 반찬 (side) ──
  { id: 'pumpkin', slot: 'side', name: '단호박', emoji: '🎃', minAge: 0, maxAge: ADULT, cost: 1, stats: { health: 1, happy: 1 }, tags: ['채소', '달콤'], appeal: 1 },
  { id: 'banana', slot: 'side', name: '바나나', emoji: '🍌', minAge: 0, maxAge: ADULT, cost: 1, stats: { happy: 1, fitness: 1 }, tags: ['과일', '달콤'], appeal: 2 },
  { id: 'broccoli', slot: 'side', name: '브로콜리', emoji: '🥦', minAge: 1, maxAge: ADULT, cost: 1, stats: { health: 3 }, tags: ['채소'], appeal: -2 },
  { id: 'spinach', slot: 'side', name: '시금치나물', emoji: '🥬', minAge: 2, maxAge: ADULT, cost: 1, stats: { health: 2, smarts: 1 }, tags: ['채소'], appeal: -1, frag: '시금치' },
  { id: 'potato', slot: 'side', name: '감자조림', emoji: '🥔', minAge: 2, maxAge: ADULT, cost: 1, stats: { fitness: 1, happy: 1 }, tags: ['채소', '달콤'], appeal: 1, frag: '감자' },
  { id: 'tomato', slot: 'side', name: '방울토마토', emoji: '🍅', minAge: 2, maxAge: ADULT, cost: 2, stats: { health: 2, happy: 1 }, tags: ['과일', '채소'], appeal: 1, frag: '토마토' },
  { id: 'anchovy', slot: 'side', name: '멸치볶음', emoji: '🦴', minAge: 3, maxAge: ADULT, cost: 2, stats: { fitness: 2, health: 1 }, tags: ['생선', '칼슘'], appeal: -1, frag: '멸치' },
  { id: 'jelly', slot: 'side', name: '젤리', emoji: '🍬', minAge: 3, maxAge: ADULT, cost: 2, stats: { happy: 4, health: -2 }, tags: ['달콤', '정크'], appeal: 3 },
  { id: 'nuts', slot: 'side', name: '견과류', emoji: '🥜', minAge: 4, maxAge: ADULT, cost: 3, stats: { smarts: 3 }, tags: ['두뇌'], appeal: 0 },
  { id: 'kimchi', slot: 'side', name: '김치', emoji: '🫙', minAge: 5, maxAge: ADULT, cost: 1, stats: { health: 2 }, tags: ['채소', '매운', '발효'], appeal: -1 },
];

export const INGREDIENT_BY_ID: Record<string, Ingredient> = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));
export const ing = (id: string): Ingredient => {
  const found = INGREDIENT_BY_ID[id];
  if (!found) throw new Error(`unknown ingredient: ${id}`);
  return found;
};
