import { INGREDIENTS, ing } from '../data/ingredients.ts';
import MENU_TABLE from '../data/menus.generated.json';
import { addDelta, applyDelta } from './apply.ts';
import { josa } from './korean.ts';
import { menuKey } from './menus.ts';
import { fmt } from './text.ts';
import type { Delta, GameState, Ingredient, MealTime, Menu, Slot, Tag } from './types.ts';

/** 한 끼의 긍정 효과 배율 (1년 3끼 × 20년 = 60끼 기준 밸런스) */
const MEAL_SCALE = 0.6;

const MENUS = new Map<string, Menu>((MENU_TABLE as Menu[]).map((m) => [m.key, m]));
export const ALL_MENUS = MENU_TABLE as Menu[];
export const getMenu = (key: string) => MENUS.get(key);

export interface Selection { base: string; main: string; side: string }

export const available = (s: GameState, slot: Slot): Ingredient[] =>
  INGREDIENTS.filter((i) => i.slot === slot && s.age >= i.minAge && s.age <= i.maxAge);

export const selectionCost = (sel: Selection) => ing(sel.base).cost + ing(sel.main).cost + ing(sel.side).cost;

export function cheapestCost(s: GameState): number {
  return (['base', 'main', 'side'] as const).reduce((sum, slot) => sum + Math.min(...available(s, slot).map((i) => i.cost)), 0);
}

export function randomSelection(s: GameState, rnd: () => number = Math.random): Selection {
  const p = (slot: Slot) => {
    const list = available(s, slot);
    return list[Math.floor(rnd() * list.length)].id;
  };
  return { base: p('base'), main: p('main'), side: p('side') };
}

export function isValidSelection(s: GameState, sel: Selection): boolean {
  return (['base', 'main', 'side'] as const).every((slot) => available(s, slot).some((i) => i.id === sel[slot]));
}

export interface MealResult { menu: Menu; isNew: boolean; firstEver: boolean; lines: string[]; delta: Delta }

const TAG_WORD: Partial<Record<Tag, string>> = {
  달콤: '달콤한', 고기: '고기', 생선: '생선', 채소: '채소', 과일: '과일', 면: '면', 매운: '매운', 튀김: '튀긴',
};

/**
 * 도시락을 먹인다. 스탯/플래그를 갱신하고 반응 텍스트를 돌려준다.
 * @param everSeen 도감(모든 회차)에서 이미 발견한 메뉴 — 첫 발견 연출용
 */
export function packBento(s: GameState, time: MealTime, sel: Selection, everSeen: ReadonlySet<string> = new Set()): MealResult {
  if (!isValidSelection(s, sel)) throw new Error('invalid selection for age');
  const cost = selectionCost(sel);
  if (cost > s.money) throw new Error('not enough money');
  const key = menuKey(sel.base, sel.main, sel.side);
  const menu = MENUS.get(key);
  if (!menu) throw new Error(`menu table missing ${key} — run npm run gen:menus`);

  s.money -= cost;
  const items = [ing(sel.base), ing(sel.main), ing(sel.side)];
  const tags = new Set(items.flatMap((i) => i.tags));
  const lines: string[] = [];
  const d: Delta = {};
  const say = (t: string) => lines.push(fmt(t, s));

  // 1) 재료 기본 효과 (싫어하는 재료는 남겨서 효과 없음)
  for (const it of items) {
    if (s.child.dislikes.includes(it.id)) {
      d.happy = (d.happy ?? 0) - 2;
      if (!s.child.known.dislikes.includes(it.id)) {
        s.child.known.dislikes.push(it.id);
        say(`{c}가 ${josa(it.name, '을/를')} 골라냈다… 싫어하는 음식인가 보다. (발견!)`);
      } else say(`역시나 ${josa(it.name, '은/는')} 그대로 남아 돌아왔다.`);
      continue;
    }
    addDelta(d, it.stats);
  }

  // 2) 좋아하는 맛 (남긴 재료는 제외)
  const eatenTags = new Set(items.filter((i) => !s.child.dislikes.includes(i.id)).flatMap((i) => i.tags));
  for (const like of s.child.likes) {
    if (!eatenTags.has(like)) continue;
    d.happy = (d.happy ?? 0) + 2;
    if (!s.child.known.likes.includes(like)) {
      s.child.known.likes.push(like);
      say(`${TAG_WORD[like] ?? like} 음식에 눈이 반짝! {c}는 ${TAG_WORD[like] ?? like} 걸 좋아한다. (발견!)`);
    }
  }

  // 3) 영양 균형
  if (tags.has('탄수') && tags.has('단백질') && (tags.has('채소') || tags.has('과일'))) {
    d.health = (d.health ?? 0) + 2;
    say('탄·단·채 완벽한 균형! 🥗');
  }
  const junk = items.filter((i) => i.tags.includes('정크')).length;
  if (junk >= 2) { d.health = (d.health ?? 0) - 2; d.happy = (d.happy ?? 0) + 1; say('몸에 나쁜 건 왜 이렇게 맛있을까.'); }
  if (tags.has('매운') && s.age < 8 && !s.child.likes.includes('매운')) { d.happy = (d.happy ?? 0) - 4; say('너무 매워서 울음을 터뜨렸다 😭'); }

  // 4) 반복 / 새로움
  if (s.recentMenus.includes(key)) { d.happy = (d.happy ?? 0) - 2; say('"또 이거야?" 시큰둥하다.'); }
  const isNew = !s.runMenus.includes(key);
  const firstEver = !everSeen.has(key);
  if (isNew) { s.runMenus.push(key); d.happy = (d.happy ?? 0) + 1; }

  // 5) 시그니처
  if (menu.signature) {
    addDelta(d, menu.bonus);
    for (const [k, v] of Object.entries(menu.flags ?? {})) s.flags[k] = (s.flags[k] ?? 0) + v;
    say(`✨ 특별 메뉴 「${menu.name}」! ${menu.desc ?? ''}`);
  }

  // 6) 끼니별 보정
  if (time === 'breakfast') {
    if (d.smarts && d.smarts > 0) d.smarts *= 1.5;
    if (s.age >= 7 && d.smarts && d.smarts > 0) say('든든한 아침 덕분에 수업 시간에 집중이 잘 된다.');
  } else if (time === 'lunch') {
    const appeal = items.reduce((a, i) => a + i.appeal, 0);
    if (s.age >= 4) {
      d.social = (d.social ?? 0) + Math.round(appeal / 2);
      if (appeal >= 6) say('친구들이 반찬 하나만 달라고 몰려들었다!');
      else if (appeal <= -2) say('친구들이 도시락을 보고 "으… 그게 뭐야?"');
    }
    if (s.follow === 2) {
      for (const k of Object.keys(d) as (keyof Delta)[]) if (d[k]! > 0) d[k]! *= 1.3;
      say(s.age < 10 ? '따끈할 때 직접 건네줬다. 🍱' : '교문 앞에서 도시락을 건네줬다. 친구들이 쳐다본다…');
    }
  } else {
    d.bond = (d.bond ?? 0) + 1;
    if (d.fitness && d.fitness > 0) d.fitness *= 1.3;
  }
  if (s.age <= 1 && d.health && d.health > 0) d.health *= 1.5;

  s.recentMenus = [key, ...s.recentMenus].slice(0, 3);
  s.lastMeals[time] = key;
  for (const k of Object.keys(d) as (keyof Delta)[]) if (d[k]! > 0) d[k]! *= MEAL_SCALE;
  const delta = applyDelta(s, d);
  if (!lines.length) say('냠냠, 깨끗하게 비웠다.');
  return { menu, isNew, firstEver, lines, delta };
}
