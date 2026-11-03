// 맛보기 공용: 빈 도시락통에서 시작해 칸을 채우는 도시락 싸기
import { ing } from '../data/ingredients.ts';
import { getMenu } from '../game/bento.ts';
import { josa } from '../game/korean.ts';
import { menuKey } from '../game/menus.ts';
import type { Ingredient, Slot } from '../game/types.ts';
import type { Sel } from './order-data.ts';

export const SLOTS: Slot[] = ['base', 'main', 'side'];
export const SLOT_LABEL: Record<Slot, string> = { base: '주식', main: '메인', side: '반찬' };
export type Draft = Partial<Sel>;

export const isFull = (d: Draft): d is Sel => SLOTS.every((s) => !!d[s]);

/** 재료를 담는다. 이미 담긴 같은 재료를 다시 누르면 뺀다. 담으면 다음 빈 칸으로 이동 */
export function placeOrToggle(d: Draft, slot: Slot, id: string): { draft: Draft; tab: Slot; placed: boolean } {
  if (d[slot] === id) {
    const draft = { ...d };
    delete draft[slot];
    return { draft, tab: slot, placed: false };
  }
  const draft = { ...d, [slot]: id };
  const i = SLOTS.indexOf(slot);
  const nextEmpty = [...SLOTS.slice(i + 1), ...SLOTS.slice(0, i)].find((s) => !draft[s]);
  return { draft, tab: nextEmpty ?? slot, placed: true };
}

/** 시간이 다 되면 빈 칸을 아무거나로 허둥지둥 채운다 */
export function fillRandom(d: Draft, avail: (s: Slot) => Ingredient[]): Sel {
  const out = { ...d };
  for (const s of SLOTS) if (!out[s]) { const list = avail(s); out[s] = list[Math.floor(Math.random() * list.length)].id; }
  return out as Sel;
}

/** 도시락통 칸 (빈 칸은 점선 + 칸 이름) */
export function bentoCells(d: Draft, tab: Slot, pic: (i: Ingredient) => string, justPlaced?: Slot): string {
  return SLOTS.map((s) => {
    const id = d[s];
    const cls = [s, tab === s ? 'active' : '', id ? '' : 'empty', justPlaced === s ? 'plop' : ''].join(' ');
    return `<div class="cell ${cls}" data-tab="${s}">${id ? pic(ing(id)) : `<span class="empty-label">${SLOT_LABEL[s]}</span>`}</div>`;
  }).join('');
}

/** 도시락 이름표: 다 채우면 메뉴 이름, 아니면 남은 칸 안내 */
export function menuLabel(d: Draft): string {
  if (isFull(d)) return getMenu(menuKey(d.base, d.main, d.side))?.name ?? '';
  const left = SLOTS.filter((s) => !d[s]).map((s) => SLOT_LABEL[s]).join('·');
  return SLOTS.every((s) => !d[s]) ? '빈 도시락통' : `${josa(left, '을/를')} 담아 주세요`;
}
