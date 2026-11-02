import { available, cheapestCost, packBento, selectionCost, type Selection } from '../src/game/bento.ts';
import { advanceYear, chooseEventOption, chooseFollow, continueAfterEvent, continueAfterMeal, eatMeal, isMealStep, startGame } from '../src/game/engine.ts';
import { rand } from '../src/game/rng.ts';
import { newGame } from '../src/game/state.ts';
import type { FollowLevel, GameState, MealTime, StatKey } from '../src/game/types.ts';

export type Policy = 'random' | 'helicopter' | 'balanced' | `focus:${StatKey}`;

const focusOf = (p: Policy) => (p.startsWith('focus:') ? (p.slice(6) as StatKey) : undefined);

/** 목표 스탯을 가장 많이 올리는 도시락 (복제본으로 시뮬레이션) */
function greedySel(s: GameState, target: StatKey): Selection {
  let best: Selection | undefined, bestScore = -Infinity;
  for (const b of available(s, 'base')) for (const m of available(s, 'main')) for (const sd of available(s, 'side')) {
    const sel = { base: b.id, main: m.id, side: sd.id };
    if (selectionCost(sel) > s.money) continue;
    const c = structuredClone(s);
    packBento(c, s.step as MealTime, sel);
    const score = c.stats[target] * 3 + c.stats.health + c.stats.happy * 0.5 - selectionCost(sel) * 0.3;
    if (score > bestScore) { bestScore = score; best = sel; }
  }
  return best!;
}

function pickSel(s: GameState, r: { rng: number }, policy: Policy): Selection {
  for (let tries = 0; tries < 30; tries++) {
    const p = (slot: 'base' | 'main' | 'side') => {
      const l = available(s, slot);
      return l[Math.floor(rand(r) * l.length)].id;
    };
    const sel = { base: p('base'), main: p('main'), side: p('side') };
    if (selectionCost(sel) <= s.money) return sel;
    void policy;
  }
  // 가장 싼 조합
  const c = (slot: 'base' | 'main' | 'side') => [...available(s, slot)].sort((a, b) => a.cost - b.cost)[0].id;
  return { base: c('base'), main: c('main'), side: c('side') };
}

/** 한 판을 끝까지 자동 진행 */
export function playthrough(seed: number, policy: Policy = 'random'): GameState {
  const s = startGame(newGame(seed));
  const r = { rng: seed ^ 0x5bd1e995 };
  for (let guard = 0; guard < 2000; guard++) {
    if (s.step === 'ending') return s;
    if (s.active) {
      const opts = s.active.choices.map((c, i) => (c.enabled ? i : -1)).filter((i) => i >= 0);
      const target = focusOf(policy);
      let pickIdx = opts[Math.floor(rand(r) * opts.length)];
      if (target) {
        let best = -Infinity;
        for (const i of opts) {
          const c = structuredClone(s);
          chooseEventOption(c, i);
          const sc = c.stats[target] * 3 + c.stats.indep + c.stats.happy * 0.5;
          if (sc > best) { best = sc; pickIdx = i; }
        }
      }
      chooseEventOption(s, pickIdx);
      continueAfterEvent(s);
    } else if (s.step === 'follow') {
      const lvl: FollowLevel = policy === 'helicopter' ? 2 : policy === 'random' ? (Math.floor(rand(r) * 3) as FollowLevel) : s.age < 8 ? 1 : 0;
      chooseFollow(s, lvl);
    } else if (isMealStep(s.step)) {
      if (s.money < cheapestCost(s)) throw new Error('stuck: cannot afford any bento');
      const target = focusOf(policy);
      eatMeal(s, target ? greedySel(s, target) : pickSel(s, r, policy));
      continueAfterMeal(s);
    } else if (s.step === 'summary') {
      advanceYear(s);
    } else throw new Error(`unexpected step ${s.step}`);
  }
  throw new Error('playthrough did not finish');
}
