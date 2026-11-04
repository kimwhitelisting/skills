import { EVENTS, EVENT_BY_ID } from '../data/events.ts';
import { applyOutcome } from './apply.ts';
import { ing } from '../data/ingredients.ts';
import { REQUEST_BY_ID, requestsFor, voiceAge, type Ctx, type Request } from '../data/requests.ts';
import { addDelta, applyDelta } from './apply.ts';
import { cheapestCost, packBento, type Selection } from './bento.ts';
import { MEAL_PRIORITY, tuningOf, yearlyIncome } from './config.ts';
import { FINAL_AGE, stageOf } from './constants.ts';
import { decideEnding, earlyEnding } from './endings.ts';
import { josa } from './korean.ts';
import { chance, pick, pickWeighted, shuffle } from './rng.ts';
import { fmt } from './text.ts';
import type { Choice, CommuteResult, Delta, Evening, FollowLevel, GameEvent, GameState, KidMood, LeaveChoice, MealTime, PackResult, Requirement, Step } from './types.ts';

const YEAR_STEPS: Step[] = ['milestone', 'day', 'random', 'summary'];

const inAge = (e: GameEvent, age: number) =>
  e.age !== undefined ? e.age === age : age >= (e.ageMin ?? 0) && age <= (e.ageMax ?? 99);

function eligible(s: GameState, e: GameEvent) {
  if (!inAge(e, s.age)) return false;
  if ((e.once || e.kind === 'milestone') && s.seenEvents.includes(e.id)) return false;
  if (e.shop && !s.unlocks?.includes(e.shop)) return false;
  if (e.wear && !s.wear?.includes(e.wear)) return false;
  return e.when ? e.when(s) : true;
}

export function meetsRequirement(s: GameState, r?: Requirement): { ok: boolean; hint?: string } {
  if (!r) return { ok: true };
  if (r.followMin !== undefined && s.follow < r.followMin) return { ok: false, hint: r.followMin === 2 ? '요즘 몰래 따라다녀야 가능' : '요즘 같이 다녀야 가능' };
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
    // 한 해에 랜덤 이벤트 최대 2개 (아기 때는 드물게)
    const pool = EVENTS.filter((e) => e.kind === 'random' && eligible(s, e));
    const picked: string[] = [];
    for (const p of s.age <= 1 ? [0.35] : s.age <= 2 ? [0.75] : [0.8, 0.45]) {
      if (!chance(s, p)) break;
      const e = pickWeighted(s, pool.filter((x) => !picked.includes(x.id)), (x) => x.weight ?? 1);
      if (e) picked.push(e.id);
    }
    s.eventQueue = picked;
    if (!activateNext(s)) return next(s);
  } else if (step === 'day') {
    s.dayIndex = 0;
    startDay(s);
  }
}

function next(s: GameState): void {
  const i = YEAR_STEPS.indexOf(s.step);
  enterStep(s, YEAR_STEPS[i + 1] ?? 'summary');
}

export function startGame(s: GameState): GameState {
  s.yearStart = { ...s.stats };
  s.yearKnown = { likes: [...s.child.known.likes], dislikes: [...s.child.known.dislikes], talent: s.child.known.talent };
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

// ───────────────────────── 하루 ─────────────────────────
//  아침: 요청을 읽고 도시락 싸기 → 배웅(믿고 보내기 / 같이 가기 / 따라가기)
//  → (따라가면) 등굣길 미니게임 → 저녁: 점심 별점 + 아이의 한마디

/** 이 나이의 도시락은 어느 끼니인가 (영아 이유식, 학교 점심, 고등학생 야자 저녁…) */
export const mealTimeOf = (age: number): MealTime => MEAL_PRIORITY[stageOf(age).id][0];
/** 0~1살: 이유식만 (배웅 없음) · 2~5살: 어린이집 (같이 가기) · 6살~: 등굣길 미니게임 */
export const canCommute = (age: number) => age >= 6;
export const hasLeave = (age: number) => age >= 2;

const FORGOT_CHANCE = 0.3;

function startDay(s: GameState): void {
  // 할머니 찬스: 반찬값이 바닥나면 보내 주신다 — 공짜는 아니다 (잔소리 이벤트, 엔딩 「할머니가 키운 아이」)
  let notice: string | undefined;
  if (s.money < cheapestCost(s)) {
    s.money += 15;
    const n = (s.flags.grandma = (s.flags.grandma ?? 0) + 1);
    notice = n === 1 ? '반찬값이 바닥났다… 할머니가 15를 보내 주셨다.'
      : n === 2 ? '또 할머니 찬스. "애 굶기면 안 된다" 하시며 15를 보내셨다.'
        : `할머니가 아예 반찬통을 들고 오셨다. (할머니 찬스 ${n}번째)`;
    s.log.push({ age: s.age, text: `🧓 ${notice}` });
  }
  let reqs: string[] = [];
  if (s.age >= 2) {
    const pool = shuffle(s, requestsFor(s.age).filter((r) => r.id !== 'again' || !!s.lastSel));
    const first = pool[0];
    if (first) {
      reqs = [first.id];
      const other = pool.find((o) => o.id !== first.id && !['again', 'picnic'].includes(o.id) && !(o.id === 'diet' && first.id === 'pe') && !(o.id === 'pe' && first.id === 'diet'));
      if (s.age >= 9 && !['again', 'picnic'].includes(first.id) && other && chance(s, 0.5)) reqs.push(other.id);
    }
  }
  s.today = { reqs, forgot: canCommute(s.age) && chance(s, FORGOT_CHANCE), phase: 'morning', notice };
}

export const todayRequests = (s: GameState): Request[] => (s.today?.reqs ?? []).map((id) => REQUEST_BY_ID[id]);

const lunchCtx = (s: GameState): Ctx => ({ age: voiceAge(s.age), likes: s.child.likes, dislikes: s.child.dislikes, yesterday: s.lastSel });

/** 아침: 도시락을 싼다. late = 시간이 다 돼서 허둥지둥 싼 도시락 */
export function packToday(s: GameState, sel: Selection, everSeen?: ReadonlySet<string>, late = false): PackResult {
  const t = s.today;
  if (s.step !== 'day' || t?.phase !== 'morning') throw new Error('not morning');
  const meal = packBento(s, mealTimeOf(s.age), sel, everSeen);
  const items = [ing(sel.base), ing(sel.main), ing(sel.side)];
  const reqs = todayRequests(s);
  const ctx = lunchCtx(s);
  const scores = reqs.map((r) => r.judge(items, ctx));
  const reqScore = reqs.length ? Math.floor(scores.reduce((a, b) => a + b, 0) / scores.length) : undefined;
  const liked = items.find((i) => i.tags.some((g) => s.child.likes.includes(g)));
  const disliked = items.find((i) => s.child.dislikes.includes(i.id));
  const base = reqScore ?? ({ happy: 2, neutral: 1, sad: 1, yuck: 0 } as const)[meal.mood];
  const lunch = Math.max(0, Math.min(3, base + (liked ? 1 : 0) - (disliked ? 1 : 0) - (late ? 1 : 0)));
  const mood: KidMood = disliked ? 'grumpy' : liked && (reqScore ?? 1) >= 1 ? 'happy' : 'neutral';
  const pack: PackResult = { meal, sel: { ...sel }, lunch, reqScore, liked: liked?.id, disliked: disliked?.id, late, mood };
  t.pack = pack;
  s.lastSel = { ...sel };
  s.log.push({ age: s.age, text: meal.menu.name });
  if (hasLeave(s.age)) t.phase = 'leave';
  else settle(s, {});
  return pack;
}

/** 오늘 고를 수 있는 배웅 방식 (도시락을 두고 간 날은 따라갈 수밖에) */
export function leaveOptions(s: GameState): LeaveChoice[] {
  if (!hasLeave(s.age)) return [];
  if (!canCommute(s.age)) return ['escort', 'trust'];
  return s.today?.forgot ? ['follow'] : ['follow', 'trust'];
}

/** 하루 효과 배율: 하루를 여러 번 보내는 설정이면 하루의 무게가 줄어든다 */
const dayScale = (s: GameState) => 2 / (1 + tuningOf(s).daysPerYear);
const scaled = (s: GameState, d: Delta): Delta => { const k = dayScale(s); const o: Delta = {}; addDelta(o, d, k); return o; };

/** 배웅 방식 선택. follow면 등굣길 미니게임으로 (finishCommute 로 결과를 넘긴다) */
export function chooseLeave(s: GameState, choice: LeaveChoice): Evening | undefined {
  const t = s.today;
  if (s.step !== 'day' || t?.phase !== 'leave') throw new Error('not leave phase');
  if (!leaveOptions(s).includes(choice)) throw new Error(`leave ${choice} not allowed`);
  t.leave = choice;
  s.follow = (choice === 'trust' ? 0 : choice === 'escort' ? 1 : 2) as FollowLevel;
  if (choice === 'follow') { t.phase = 'commute'; return undefined; }
  const a = s.age;
  const extra: string[] = [];
  let d: Delta;
  if (choice === 'escort') {
    d = { bond: 2, indep: 1 };
    extra.push(pick(s, ['손잡고 같이 걸어갔다. 가는 내내 재잘재잘.', '어린이집 앞에서 한참을 손을 흔들었다.', '가다가 개미 구경을 10분 했다.']));
  } else {
    d = a < 6 ? { indep: 3, bond: -1 } : { indep: 4, bond: a < 8 ? -1 : 0 };
    if (a >= 13) s.vigilance = Math.max(0, s.vigilance - 0.08);
    extra.push(a < 6 ? '어린이집 차에 태워 보냈다. 창문에 얼굴을 붙이고 갔다.' : pick(s, ['혼자 씩씩하게 학교에 갔다.', '친구를 만나 수다 떨며 갔다고 한다.', '무슨 일이 있었는지 물어봐도 "그냥."']));
  }
  return settle(s, scaled(s, d), extra);
}

/** 등굣길 미니게임에 넘길 값 */
export function commuteParams(s: GameState) {
  const t = s.today!;
  const a = s.age;
  const level = (a < 10 ? 6 : a < 13 ? 10 : 15) as 6 | 10 | 15;
  const moodMult = t.pack?.mood === 'happy' ? 1.3 : t.pack?.mood === 'grumpy' ? 0.8 : 1;
  return { level, mood: t.pack?.mood ?? 'neutral', forgot: t.forgot, lookMult: moodMult * (1 - s.vigilance) };
}

/** 따라다니는 것 자체의 대가: 혼자 다니는 법을 배울 기회가 줄어든다 (클수록 크다) */
const followCost = (age: number): Delta => (age < 10 ? { indep: -0.5 } : age < 13 ? { indep: -1.5, social: -1 } : { indep: -3, social: -1 });

export function finishCommute(s: GameState, r: CommuteResult): Evening {
  const t = s.today;
  if (s.step !== 'day' || t?.phase !== 'commute') throw new Error('not commute phase');
  t.commute = { ...r, log: r.log?.slice(0, 6) };
  s.hearts += Math.max(0, Math.round(r.score));
  const d: Delta = { bond: r.bond, indep: r.indep, happy: r.happy };
  addDelta(d, followCost(s.age));
  const extra: string[] = [];
  let lunchAdj = 0;
  if (t.forgot && !r.delivered) {
    if (r.over !== 'caught') lunchAdj = -1;
    extra.push(r.over === 'caught' ? '도시락은 받았지만… 친구들 앞에서 받았다.' : '도시락은 교무실에서 늦게 받았다. 다 식어 있었다.');
  }
  if (s.age >= 13) s.vigilance = Math.min(0.4, s.vigilance + (r.over === 'caught' ? 0.2 : 0.1));
  return settle(s, scaled(s, d), extra, lunchAdj);
}

/** 저녁 정산: 점심 별점 효과 + 배웅 효과 */
function settle(s: GameState, leave: Delta, extra: string[] = [], lunchAdj = 0): Evening {
  const t = s.today!;
  const p = t.pack!;
  const lunch = Math.max(0, Math.min(3, p.lunch + lunchAdj));
  const d: Delta = { ...leave };
  addDelta(d, { happy: [-2, 0, 2, 3][lunch], bond: lunch === 3 ? 1 : 0 });
  const applied = applyDelta(s, d);
  const total: Delta = {};
  addDelta(total, p.meal.delta);
  addDelta(total, applied);
  const says = lunchSays(s, p, lunch);
  t.evening = { lunch, says, extra, delta: total };
  t.phase = 'evening';
  s.album.push({ age: s.age, menu: p.meal.menu.key, lunch, leave: t.leave, over: t.commute?.over, moment: t.commute?.moment });
  if (s.album.length > 60) s.album.shift();
  return t.evening;
}

/** 아이가 저녁에 하는 말: 요청을 맞췄는지 + 싫은/좋은 재료 */
function lunchSays(s: GameState, p: PackResult, lunch: number): string[] {
  const v = voiceAge(s.age);
  if (s.age <= 1) return [lunch >= 2 ? '(오물오물… 한 그릇 싹 비웠다)' : lunch === 1 ? '(몇 숟갈 먹다가 고개를 돌렸다)' : '(퉤! 숟가락을 밀어냈다)'];
  if (s.age <= 3) return [lunch >= 2 ? '맛있었떠!' : lunch === 1 ? '쪼금 먹었어.' : '맛없어…'];
  const items = [ing(p.sel.base), ing(p.sel.main), ing(p.sel.side)];
  const ctx = lunchCtx(s);
  const out = todayRequests(s).map((r) => fmt(r.judge(items, ctx) === 2 ? r.ok[v] : r.miss[v], s));
  if (p.disliked) {
    const n = ing(p.disliked).name;
    out.push(v === 15 ? `${josa(n, '은/는')} 빼 달라고 몇 번을 말해.` : `${josa(n, '은/는')} 남겼어. 싫단 말이야.`);
  } else if (p.liked && !out.length) out.push(v === 15 ? '…맛있었어.' : `${ing(p.liked).name} 진짜 맛있었어!`);
  if (p.late) out.push('(늦어서 허둥지둥 싸 준 도시락이었다)');
  if (!out.length) out.push(lunch >= 2 ? (v === 15 ? '잘 먹었어.' : '다 먹었어!') : v === 15 ? '…그냥 그랬어.' : '음… 그냥 그랬어.');
  return out;
}

/** 저녁 화면을 닫으면: 다음 날, 또는 올해의 마지막 날이면 다음 step */
export function endDay(s: GameState): void {
  if (s.step !== 'day' || s.today?.phase !== 'evening') throw new Error('day not finished');
  s.today = undefined;
  s.dayIndex += 1;
  if (s.dayIndex < tuningOf(s).daysPerYear) startDay(s);
  else next(s);
}

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
  const early = earlyEnding(s);
  if (early) {
    s.endingId = early.id;
    s.step = 'ending';
    return;
  }
  if (s.age >= FINAL_AGE) {
    s.endingId = decideEnding(s).id;
    s.step = 'ending';
    return;
  }
  s.age += 1;
  s.vigilance = Math.max(0, s.vigilance - 0.05);
  s.money += yearlyIncome(s);
  if (s.age >= 7) applyDelta(s, { indep: 1 });
  yearlyDrift(s);
  s.yearStart = { ...s.stats };
  s.yearKnown = { likes: [...s.child.known.likes], dislikes: [...s.child.known.dislikes], talent: s.child.known.talent };
  enterStep(s, 'milestone');
}
