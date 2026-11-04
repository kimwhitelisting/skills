import { INGREDIENTS, ing } from '../data/ingredients.ts';
import { SIGNATURES } from '../data/signatures.ts';
import type { Ingredient, Menu } from './types.ts';

export const menuKey = (base: string, main: string, side: string) => `${base}|${main}|${side}`;

/** 세 재료의 나이 범위가 겹칠 때만 실제로 만들 수 있는 조합 */
export function comboAgeRange(a: Ingredient, b: Ingredient, c: Ingredient): [number, number] | null {
  const min = Math.max(a.minAge, b.minAge, c.minAge);
  const max = Math.min(a.maxAge, b.maxAge, c.maxAge);
  return min <= max ? [min, max] : null;
}

/** 규칙 기반 자동 이름: "{메인} {요리형태} & {반찬}" */
export function autoName(base: Ingredient, main: Ingredient, side: Ingredient): string {
  const m = main.frag ?? main.name;
  const s = side.frag ?? side.name;
  return `${m} ${base.dish ?? base.name} & ${s}`;
}

/** 모든 가능한 조합의 메뉴 테이블 생성 (시그니처가 자동 이름을 덮어씀) */
export function buildMenuTable(): Menu[] {
  const bases = INGREDIENTS.filter((i) => i.slot === 'base');
  const mains = INGREDIENTS.filter((i) => i.slot === 'main');
  const sides = INGREDIENTS.filter((i) => i.slot === 'side');
  const sig = new Map(SIGNATURES.map((s) => [menuKey(...s.combo), s]));

  for (const s of SIGNATURES) {
    const [b, m, sd] = s.combo.map(ing);
    if (b.slot !== 'base' || m.slot !== 'main' || sd.slot !== 'side') throw new Error(`signature ${s.name}: combo must be [base, main, side]`);
    if (!comboAgeRange(b, m, sd)) throw new Error(`signature ${s.name} can never be made (age ranges don't overlap)`);
  }

  const out: Menu[] = [];
  for (const b of bases)
    for (const m of mains)
      for (const sd of sides) {
        if (!comboAgeRange(b, m, sd)) continue;
        const key = menuKey(b.id, m.id, sd.id);
        const s = sig.get(key);
        const menu: Menu = { key, base: b.id, main: m.id, side: sd.id, name: s?.name ?? autoName(b, m, sd) };
        if (s) {
          menu.signature = true;
          if (s.desc) menu.desc = s.desc;
          if (s.bonus) menu.bonus = s.bonus;
          if (s.flags) menu.flags = s.flags;
        }
        out.push(menu);
      }
  return out;
}
