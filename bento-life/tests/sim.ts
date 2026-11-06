import { available, packBento, selectionCost, type Selection } from '../src/game/bento.ts';
import { advanceYear, chooseEventOption, chooseLeave, commuteParams, continueAfterEvent, endDay, finishCommute, leaveOptions, mealTimeOf, packToday, startGame } from '../src/game/engine.ts';
import { rand } from '../src/game/rng.ts';
import { newGame } from '../src/game/state.ts';
import type { Tuning } from '../src/game/config.ts';
import type { CommuteResult, GameState, LeaveChoice, StatKey } from '../src/game/types.ts';

export type Policy = 'random' | 'helicopter' | 'balanced' | `focus:${StatKey}`;

const focusOf = (p: Policy) => (p.startsWith('focus:') ? (p.slice(6) as StatKey) : undefined);

/** 목표 스탯을 가장 많이 올리는 도시락 (복제본으로 시뮬레이션) */
function greedySel(s: GameState, target: StatKey): Selection {
  let best: Selection | undefined, bestScore = -Infinity;
  for (const b of available(s, 'base')) for (const m of available(s, 'main')) for (const sd of available(s, 'side')) {
    const sel = { base: b.id, main: m.id, side: sd.id };
    if (selectionCost(s, sel) > s.money) continue;
    const c = structuredClone(s);
    packBento(c, mealTimeOf(s.age), sel);
    const score = c.stats[target] * 3 + c.stats.health + c.stats.happy * 0.5 - selectionCost(s, sel) * 0.3;
    if (score > bestScore) { bestScore = score; best = sel; }
  }
  return best!;
}

function randomSel(s: GameState, r: { rng: number }): Selection {
  for (let tries = 0; tries < 30; tries++) {
    const p = (slot: 'base' | 'main' | 'side') => {
      const l = available(s, slot);
      return l[Math.floor(rand(r) * l.length)].id;
    };
    const sel = { base: p('base'), main: p('main'), side: p('side') };
    if (selectionCost(s, sel) <= s.money) return sel;
  }
  const c = (slot: 'base' | 'main' | 'side') => [...available(s, slot)].sort((a, b) => a.cost - b.cost)[0].id;
  return { base: c('base'), main: c('main'), side: c('side') };
}

function leavePolicy(s: GameState, r: { rng: number }, policy: Policy): LeaveChoice {
  const opts = leaveOptions(s);
  if (opts.length === 1) return opts[0];
  if (policy === 'helicopter') return opts.includes('follow') ? 'follow' : 'escort';
  if (policy === 'random') return opts[Math.floor(rand(r) * opts.length)];
  if (s.age < 6) return 'escort';
  return s.age < 10 && rand(r) < 0.5 ? 'follow' : 'trust';
}

/** 등굣길 미니게임을 확률로 흉내 낸다 (봇 실측: 6살 대부분 성공, 15살은 자주 걸림) */
export function simCommute(s: GameState, r: { rng: number }, rushCrisis: boolean): CommuteResult {
  const p = commuteParams(s);
  const base = { 6: 0.08, 10: 0.2, 15: 0.32 }[p.level];
  const roll = rand(r);
  const over: CommuteResult['over'] = roll < Math.min(0.9, base / p.lookMult) ? 'caught' : roll > 0.92 ? 'lost' : 'school';
  const res: CommuteResult = { over, delivered: p.forgot && over === 'school' && rand(r) < 0.75, score: over === 'school' ? 150 : over === 'caught' ? 50 : 60, bond: 0, indep: 0, happy: 0 };
  if (rand(r) < 0.12) {
    // 진짜 위험: 달려가면 붙잡고, 참으면 대개 다친다
    if (rushCrisis) { res.bond += 4; res.indep -= 1; res.momentKind = 'danger-saved'; }
    else if (rand(r) < 0.8) { res.injury = true; res.happy -= 4; res.bond -= 2; res.momentKind = 'danger-hurt'; }
  } else if (rand(r) < 0.5) {
    if (rushCrisis) { res.bond += p.level === 6 ? 3 : p.level === 10 ? 1 : -2; res.indep -= p.level === 6 ? 1 : 2; }
    else if (rand(r) < 0.3 + p.level * 0.03) { res.indep += 3; res.happy += 1; } else { res.happy -= 2; res.bond -= 1; }
  }
  if (over === 'school') { res.bond += 1; res.indep += 1; }
  if (over === 'caught') { res.bond -= 2; res.indep -= 2; res.happy -= 1; }
  if (over === 'lost') res.indep += 1;
  return res;
}

/** 한 판을 끝까지 자동 진행 */
export function playthrough(seed: number, policy: Policy = 'random', tuning?: Partial<Tuning>, shop?: { unlocks?: string[]; wear?: string[] }, observe?: (s: GameState) => void): GameState {
  const g = newGame(seed, tuning);
  if (shop) Object.assign(g, shop);
  const s = startGame(g);
  const r = { rng: seed ^ 0x5bd1e995 };
  const target = focusOf(policy);
  for (let guard = 0; guard < 4000; guard++) {
    observe?.(s);
    if (s.step === 'ending') return s;
    if (s.active) {
      const opts = s.active.choices.map((c, i) => (c.enabled ? i : -1)).filter((i) => i >= 0);
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
    } else if (s.step === 'day') {
      const t = s.today!;
      if (t.phase === 'morning') packToday(s, target ? greedySel(s, target) : randomSel(s, r), undefined, policy === 'random' && rand(r) < 0.1);
      else if (t.phase === 'leave') chooseLeave(s, leavePolicy(s, r, policy));
      else if (t.phase === 'commute') finishCommute(s, simCommute(s, r, policy === 'helicopter' || (policy === 'random' && rand(r) < 0.5)));
      else endDay(s);
    } else if (s.step === 'summary') {
      advanceYear(s);
    } else throw new Error(`unexpected step ${s.step}`);
  }
  throw new Error('playthrough did not finish');
}
