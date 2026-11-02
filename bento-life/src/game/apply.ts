import { STAT_KEYS, TALENT_INFO } from './constants.ts';
import type { Delta, GameState, Outcome } from './types.ts';

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/**
 * 스탯 변화 적용 (스탯은 내부적으로 실수, 화면엔 반올림).
 * - 상승분은 수확체감: 높을수록 덜 오른다 (50→×0.55, 80→×0.27)
 * - 재능 스탯은 상승분 1.3배
 * 실제 변화량을 반환
 */
export function applyDelta(s: GameState, delta: Delta): Delta {
  const talentStat = TALENT_INFO[s.child.talent].stat;
  const actual: Delta = {};
  for (const k of STAT_KEYS) {
    const d = delta[k];
    if (!d) continue;
    const before = s.stats[k];
    const gain = d > 0 ? d * Math.max(0.12, 1 - before / 110) * (k === talentStat ? 1.3 : 1) : d;
    s.stats[k] = clamp(before + gain);
    if (s.stats[k] !== before) actual[k] = s.stats[k] - before;
  }
  return actual;
}

/** 표시용: 반올림해서 0이 아닌 것만 */
export function displayDelta(d: Delta): Delta {
  return roundDelta(d);
}

export function addDelta(into: Delta, d: Delta | undefined, mult = 1): Delta {
  if (!d) return into;
  for (const k of STAT_KEYS) if (d[k]) into[k] = (into[k] ?? 0) + d[k]! * mult;
  return into;
}

export function roundDelta(d: Delta): Delta {
  const out: Delta = {};
  for (const k of STAT_KEYS) {
    const v = Math.round(d[k] ?? 0);
    if (v) out[k] = v;
  }
  return out;
}

export function applyOutcome(s: GameState, o: Outcome): Delta {
  if (o.money) s.money = Math.max(0, s.money + o.money);
  if (o.flags) for (const [k, v] of Object.entries(o.flags)) s.flags[k] = (s.flags[k] ?? 0) + v;
  o.apply?.(s);
  return o.stats ? applyDelta(s, o.stats) : {};
}
