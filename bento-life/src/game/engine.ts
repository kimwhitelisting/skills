import { EVENTS, EVENT_BY_ID } from '../data/events.ts';
import { applyDelta, applyOutcome } from './apply.ts';
import { cheapestCost, packBento, type MealResult, type Selection } from './bento.ts';
import { MEAL_PRIORITY, TIME_ORDER, tuningOf, yearlyIncome } from './config.ts';
import { FINAL_AGE, MEAL_TIMES, stageOf } from './constants.ts';
import { decideEnding } from './endings.ts';
import { chance, pickWeighted } from './rng.ts';
import { fmt } from './text.ts';
import type { Choice, Delta, FollowLevel, GameEvent, GameState, MealTime, Requirement, Step } from './types.ts';

const YEAR_STEPS: Step[] = ['milestone', 'follow', 'breakfast', 'lunch', 'dinner', 'random', 'summary'];

export const isMealStep = (step: Step): step is MealTime => (MEAL_TIMES as Step[]).includes(step);

const inAge = (e: GameEvent, age: number) =>
  e.age !== undefined ? e.age === age : age >= (e.ageMin ?? 0) && age <= (e.ageMax ?? 99);

function eligible(s: GameState, e: GameEvent) {
  if (!inAge(e, s.age)) return false;
  if ((e.once || e.kind === 'milestone') && s.seenEvents.includes(e.id)) return false;
  return e.when ? e.when(s) : true;
}

export function meetsRequirement(s: GameState, r?: Requirement): { ok: boolean; hint?: string } {
  if (!r) return { ok: true };
  if (r.followMin !== undefined && s.follow < r.followMin) return { ok: false, hint: r.followMin === 2 ? '올해 "졸졸" 따라다녀야 가능' : '올해 지켜보기 이상 필요' };
  if (r.followMax !== undefined && s.follow > r.followMax) return { ok: false, hint: '너무 따라다니는 중' };
  if (r.money !== undefined && s.money < r.money) return { ok: false, hint: `💰${r.money} 필요` };
  if (r.stat && s.stats[r.stat[0]] < r.stat[1]) return { ok: false, hint: '조건 부족' };
  if (r.flag && !s.flags[r.flag]) return { ok: false, hint: '조건 부족' };
  return { ok: true };
}

const choicesOf = (s: GameState, e: GameEvent): Choice[] => (typeof e.choices === 'function' ? e.choices(s) : e.choices);

/** 큐의 다음 이벤트를 화면용으로 고정한다 */
function activateNext(s: GameState): boolean {
  const id = s.eventQueue.shift();
  if (!id) { s.active = undefined; return false; }
  const e = EVENT_BY_ID[id];
  s.seenEvents.push(id);
  const text = fmt(typeof e.text === 'function' ? e.text(s) : e.text, s);
  const choices = choicesOf(s, e).map((c) => {
    const r = meetsRequirement(s, c.requires);
    return { label: fmt(c.label, s), enabled: r.ok, hint: r.hint };
  });
  if (!choices.some((c) => c.enabled)) choices[0].enabled = true; // 막다른 길 방지
  s.active = { id, emoji: e.emoji, title: fmt(e.title, s), text, choices };
  return true;
}

/** 현재 step에 진입할 때의 처리. 할 일이 없는 step은 건너뛴다. */
function enterStep(s: GameState, step: Step): void {
  s.step = step;
  if (step === 'milestone') {
    s.eventQueue = EVENTS.filter((e) => e.kind === 'milestone' && eligible(s, e)).map((e) => e.id);
    if (!activateNext(s)) return next(s);
  } else if (step === 'random') {
    const pool = EVENTS.filter((e) => e.kind === 'random' && eligible(s, e));
    const p = s.age <= 1 ? 0.35 : 0.75;
    const e = chance(s, p) ? pickWeighted(s, pool, (x) => x.weight ?? 1) : undefined;
    s.eventQueue = e ? [e.id] : [];
    if (!activateNext(s)) return next(s);
  } else if (isMealStep(step)) {
    if (!mealsThisYear(s).includes(step)) return next(s);
    if (s.money < cheapestCost(s)) {
      s.money += 15;
      s.log.push({ age: s.age, text: '반찬값이 바닥났다. 할머니가 15를 보내 주셨다.' });
    }
  }
}

/** 올해 싸는 끼니 (설정된 끼니 수만큼, 시기별 중요도 순으로 고른 뒤 시간 순 정렬) */
export function mealsThisYear(s: GameState): MealTime[] {
  const n = tuningOf(s).mealsPerYear;
  const picked = MEAL_PRIORITY[stageOf(s.age).id].slice(0, n);
  return TIME_ORDER.filter((t) => picked.includes(t));
}

function next(s: GameState): void {
  const i = YEAR_STEPS.indexOf(s.step);
  enterStep(s, YEAR_STEPS[i + 1] ?? 'summary');
}

export function startGame(s: GameState): GameState {
  s.yearStart = { ...s.stats };
  enterStep(s, 'milestone');
  return s;
}

export interface ChoiceResult { text: string; delta: Delta; money: number }

export function chooseEventOption(s: GameState, index: number): ChoiceResult {
  const a = s.active;
  if (!a) throw new Error('no active event');
  if (!a.choices[index]?.enabled) throw new Error('choice not available');
  const choice = choicesOf(s, EVENT_BY_ID[a.id])[index];
  const outcome = typeof choice.outcome === 'function' ? choice.outcome(s) : choice.outcome;
  const moneyBefore = s.money;
  const delta = applyOutcome(s, outcome);
  const text = fmt(outcome.text, s);
  s.log.push({ age: s.age, text: `${a.emoji} ${a.title} — ${text}` });
  s.active = undefined;
  return { text, delta, money: s.money - moneyBefore };
}

/** 이벤트 결과 확인 후 호출: 큐에 남은 이벤트가 있으면 띄우고 없으면 다음 step */
export function continueAfterEvent(s: GameState): void {
  if (!activateNext(s)) next(s);
}

export function chooseFollow(s: GameState, level: FollowLevel): Delta {
  if (s.step !== 'follow') throw new Error('not follow step');
  s.follow = level;
  const a = s.age;
  const d: Delta =
    level === 0 ? { indep: a < 3 ? 1 : 4, bond: a < 7 ? -2 : 0 }
      : level === 1 ? { indep: 2, bond: 1 }
        : a < 10 ? { bond: 3, indep: -1 }
          : a < 13 ? { bond: 1, indep: -2, social: -1 }
            : { bond: -3, indep: -3, social: -2, happy: -1 };
  const delta = applyDelta(s, d);
  next(s);
  return delta;
}

export function eatMeal(s: GameState, sel: Selection, everSeen?: ReadonlySet<string>): MealResult {
  if (!isMealStep(s.step)) throw new Error('not a meal step');
  const r = packBento(s, s.step, sel, everSeen);
  s.log.push({ age: s.age, text: `${r.menu.name}` });
  return r;
}

export const continueAfterMeal = (s: GameState) => next(s);

/** 해가 바뀌면 컨디션 스탯은 기준점 쪽으로 조금씩 돌아간다 (관리 안 하면 떨어짐) */
function yearlyDrift(s: GameState): void {
  const pull = (k: 'health' | 'happy' | 'fitness', base: number, rate: number) => { s.stats[k] -= (s.stats[k] - base) * rate; };
  pull('health', 40, 0.1);
  pull('happy', 45, 0.18);
  pull('fitness', 30, 0.08);
}

/** 연말 정산 → 다음 해로. 마지막 해면 엔딩 */
export function advanceYear(s: GameState): void {
  if (s.step !== 'summary') throw new Error('not summary step');
  if (s.age >= FINAL_AGE) {
    s.endingId = decideEnding(s).id;
    s.step = 'ending';
    return;
  }
  s.age += 1;
  s.money += yearlyIncome(s);
  if (s.age >= 7) applyDelta(s, { indep: 1 });
  yearlyDrift(s);
  s.yearStart = { ...s.stats };
  enterStep(s, 'milestone');
}
