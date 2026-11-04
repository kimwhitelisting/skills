/**
 * 하루 맛보기 (도트판) — 아침 도시락 → 등굣길 → 저녁
 *
 *  아침  : 아이의 요청(겹치는 날도 있음)을 읽고 빈 도시락통을 채운다. 아이가 아는 취향에 표정으로 반응.
 *  등굣길: 도시락을 두고 간 날은 꼭, 나머지 날은 따라갈지 말지 선택.
 *          아침 도시락이 마음에 들면 콧노래(덜 돌아봄), 싫은 게 있으면 툴툴(자주 돌아봄).
 *          15살은 따라간 날이 쌓일수록 다음 날 더 경계한다.
 *  저녁  : 돌아온 도시락통(먹은 칸만 비어 있음) + 아이의 한마디 + 등굣길의 한 장면.
 * 장면은 모두 코드로 찍은 도트 그림이다 (src/pixel).
 */
import '../style.css';
import './proto.css';
import './follow.css';
import './pixel-ui.css';
import './day-px.css';
import { INGREDIENTS, ing } from '../data/ingredients.ts';
import { josa } from '../game/korean.ts';
import type { Slot, Tag } from '../game/types.ts';
import { childFront, type Expr, type Look } from '../pixel/child.ts';
import { entryFloor, entryWall } from '../pixel/extras.ts';
import { loadPixelFont } from '../pixel/font.ts';
import { food } from '../pixel/foods.ts';
import { bubble, draw as drawFx, spawn, step, type Fx } from '../pixel/fx.ts';
import { toDataURL } from '../pixel/grid.ts';
import { loadPartOverrides } from '../pixel/parts-loader.ts';
import { bentoBox, bentoLid, kitchenCounter, kitchenWall } from '../pixel/scenes.ts';
import { blit, clearSprites, sprite } from '../pixel/sprite-cache.ts';
import { haptic, sfx } from '../ui/feedback.ts';
import { fillRandom, isFull, menuLabel, placeOrToggle, type Draft } from './bento-ui.ts';
import { mountFollow, unmountFollow, type FollowResult } from './follow-core.ts';
import { REQUESTS, type Age, type Ctx, type Request, type Sel } from './order-data.ts';

type Mood = 'happy' | 'neutral' | 'grumpy';
interface Plan { reqs: Request[]; forgot: boolean }
interface DayLog {
  plan: Plan; sel: Sel; lunch: number; reqScore: number; liked?: string; disliked?: string; note: string;
  mood: Mood; followed: boolean; follow?: FollowResult; bond: number; indep: number; extra: string;
}

const DAYS = ['월', '화', '수', '목', '금'];
const DAY_TIME = 30;
const LIKE_POOL: Tag[] = ['달콤', '고기', '생선', '채소', '과일', '면', '튀김'];
const SLOTS: Slot[] = ['base', 'main', 'side'];
const SLOT_LABEL: Record<Slot, string> = { base: '주식', main: '메인', side: '반찬' };
const app = document.getElementById('app')!;
app.classList.add('pixel-ui');
loadPixelFont();

let age: Age = 7;
let look: Look = { age: 7, gender: 'girl' };
let ctx: Ctx;
let plans: Plan[] = [];
let day = 0;
let sel: Draft = {};
let tab: Slot = 'base';
let lastPick: string | undefined;
let phase: 'morning' | 'leave' | 'commute' | 'evening' | 'week' = 'morning';
let logs: DayLog[] = [];
let known = { likes: [] as Tag[], dislikes: [] as string[] };
let vigilance = 0;
let timer = 0;
let timerId = 0;
let pending: Omit<DayLog, 'followed' | 'follow' | 'bond' | 'indep' | 'extra'> | undefined;
let busy = false;

// 장면 연출 상태
const fx: Fx[] = [];
let reactExpr: Expr = 'neutral';
let reactUntil = 0;
let shake = 0;
let lidT = -1;

const shuffle = <T,>(a: T[]) => a.map((v) => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map(([, v]) => v);
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const avail = (slot: Slot) => INGREDIENTS.filter((i) => i.slot === slot && age >= i.minAge && age <= i.maxAge);
const iconCache = new Map<string, string>();
const foodIcon = (id: string) => { let u = iconCache.get(id); if (!u) { u = toDataURL(food(id), 3); iconCache.set(id, u); } return u; };
const totals = () => ({ stars: logs.reduce((a, d) => a + d.lunch, 0), hearts: logs.reduce((a, d) => a + (d.follow?.score ?? 0), 0) });

// ───────── 한 주 준비 ─────────
function newWeek(): void {
  look = { age: age === 7 ? 7 : 15, gender: Math.random() < 0.5 ? 'boy' : 'girl' };
  const likes = shuffle(LIKE_POOL).slice(0, 2);
  const dislikes = shuffle(INGREDIENTS.filter((i) => i.slot !== 'base' && i.minAge <= age && !i.tags.some((t) => likes.includes(t)))).slice(0, 2).map((i) => i.id);
  ctx = { age, likes, dislikes };
  const pool = shuffle(REQUESTS.filter((r) => r.ages.includes(age) && r.id !== 'again'));
  const again = REQUESTS.find((r) => r.id === 'again')!;
  const singles = pool.slice(0, 4);
  singles.splice(2 + Math.floor(Math.random() * 2), 0, again);
  if (age === 7 && !singles.some((r) => r.id === 'picnic')) singles[4] = REQUESTS.find((r) => r.id === 'picnic')!;
  const combinable = pool.filter((r) => !['picnic', 'again'].includes(r.id));
  const forgotDays = shuffle([1, 2, 3, 4]).slice(0, 2);
  plans = singles.map((r, i) => {
    const reqs = [r];
    if (i >= 2 && r.id !== 'again' && r.id !== 'picnic' && Math.random() < 0.6) {
      const other = combinable.find((o) => o.id !== r.id && !(o.id === 'diet' && r.id === 'pe'));
      if (other) reqs.push(other);
    }
    return { reqs, forgot: forgotDays.includes(i) };
  });
  day = 0; logs = []; known = { likes: [], dislikes: [] }; vigilance = 0;
  startMorning();
}

function startMorning(): void {
  phase = 'morning';
  sel = {}; tab = 'base'; lastPick = undefined; lidT = -1; busy = false;
  timer = DAY_TIME;
  clearInterval(timerId);
  timerId = window.setInterval(() => {
    if (phase !== 'morning' || busy) return;
    timer -= 0.25;
    const bar = document.getElementById('clock');
    if (bar) bar.style.width = `${(timer / DAY_TIME) * 100}%`;
    if (timer <= 5 && Math.abs(timer % 1) < 0.01) { sfx('tap'); haptic(12); }
    if (timer <= 0) closeLid(true);
  }, 250);
  render();
}

/** 고르는 동안의 아이 반응 — 이미 알아낸 취향에만 반응 */
function kidReact(): { text: string; mood: Mood } | undefined {
  if (!lastPick) return undefined;
  const it = ing(lastPick);
  if (known.dislikes.includes(it.id)) return { text: age === 15 ? `${josa(it.name, '은/는')} 빼라니까…` : `으… ${josa(it.name, '은/는')} 싫어!`, mood: 'grumpy' };
  if (it.tags.some((t) => known.likes.includes(t))) return { text: age === 15 ? `오, ${it.name}.` : `${it.name}! 좋아!`, mood: 'happy' };
  return { text: age === 15 ? '…' : pick(['음~', '그거 넣어?', '뭐 싸는 거야?']), mood: 'neutral' };
}

/** 뚜껑 닫는 연출 뒤에 실제로 싼다 */
function closeLid(late = false): void {
  if (busy || phase !== 'morning') return;
  if (!isFull(sel) && !late) return;
  busy = true;
  clearInterval(timerId);
  if (!isFull(sel)) sel = fillRandom(sel, avail);
  lidT = 0;
  sfx('pack'); haptic(15);
  render();
  setTimeout(() => pack(late), 900);
}

function pack(late: boolean): void {
  const full = sel as Sel;
  const plan = plans[day];
  const items = [ing(full.base), ing(full.main), ing(full.side)];
  const scores = plan.reqs.map((r) => r.judge(items, ctx));
  const reqScore = Math.floor(scores.reduce((a, b) => a + b, 0) / scores.length);
  const likedItem = items.find((i) => i.tags.some((t) => ctx.likes.includes(t)));
  const dislikedItem = items.find((i) => ctx.dislikes.includes(i.id));
  const lunch = Math.max(0, Math.min(3, reqScore + (likedItem ? 1 : 0) - (dislikedItem ? 1 : 0) - (late ? 1 : 0)));
  const notes: string[] = [];
  plan.reqs.forEach((r, i) => notes.push(scores[i] === 2 ? r.ok[age] : r.miss[age]));
  if (dislikedItem) {
    notes.push(age === 15 ? `${josa(dislikedItem.name, '은/는')} 빼 달라고 몇 번을 말해.` : `${josa(dislikedItem.name, '은/는')} 남겼어. 싫단 말이야.`);
    if (!known.dislikes.includes(dislikedItem.id)) known.dislikes.push(dislikedItem.id);
  }
  if (likedItem) {
    const tag = likedItem.tags.find((t) => ctx.likes.includes(t))!;
    if (!known.likes.includes(tag)) { known.likes.push(tag); notes.push(age === 15 ? `(${likedItem.name}만 싹 비웠다. ${tag} 좋아하는 듯)` : `${likedItem.name} 진짜 맛있었어! (${tag} 좋아하는 것 같다)`); }
  }
  if (late) notes.push('(늦어서 허둥지둥 싸 준 도시락이었다)');
  const mood: Mood = dislikedItem ? 'grumpy' : likedItem && reqScore >= 1 ? 'happy' : 'neutral';
  pending = { plan, sel: { ...full }, lunch, reqScore, liked: likedItem?.id, disliked: dislikedItem?.id, note: notes.join(' '), mood };
  phase = 'leave'; busy = false; lidT = -1;
  render();
}

function goCommute(): void {
  const p = pending!;
  phase = 'commute';
  const moodMult = p.mood === 'happy' ? 1.3 : p.mood === 'grumpy' ? 0.8 : 1;
  const vig = age === 15 ? 1 - vigilance : 1;
  mountFollow(app, {
    age: age === 7 ? 6 : 15, standalone: false, label: `${age}살`, title: `${DAYS[day]}요일 등굣길`, look,
    mood: p.mood, lookMult: moodMult * vig, forgot: p.plan.forgot,
    onEnd: (r) => finishDay(true, r),
  });
}

function finishDay(followed: boolean, f?: FollowResult): void {
  unmountFollow();
  const p = pending!;
  let { lunch } = p;
  let bond = 0, indep = 0;
  const extra: string[] = [];
  if (!followed) {
    indep += 2;
    extra.push(pick(['혼자 씩씩하게 학교에 갔다.', '친구를 만나 수다 떨며 갔다고 한다.', '무슨 일이 있었는지 물어봐도 "그냥."']));
  } else if (f) {
    bond += f.bond; indep += f.indep;
    if (p.plan.forgot && !f.delivered) {
      lunch = Math.max(0, lunch - (f.over === 'caught' ? 0 : 1));
      extra.push(f.over === 'caught' ? '도시락은 받았지만… 친구들 앞에서 받았다.' : '도시락은 교무실에서 늦게 받았다. 다 식어 있었다.');
    }
    if (age === 15) vigilance = Math.min(0.4, vigilance + (f.over === 'caught' ? 0.2 : 0.1));
  }
  if (!followed && age === 15) vigilance = Math.max(0, vigilance - 0.08);
  logs.push({ ...p, lunch, followed, follow: f, bond, indep, extra: extra.join(' ') });
  pending = undefined;
  phase = 'evening';
  app.classList.add('pixel-ui');
  sfx(lunch >= 3 ? 'chime' : lunch >= 2 ? 'ding' : 'tap');
  render();
  if (lunch >= 3) spawn(fx, 'star', 77, 70, 10);
}

// ───────── 장면 (캔버스) ─────────
const KW = 110, KH = 98, COUNTER_Y = 54, BX = 46, BY = 57, KID_X = 8;
const bento = bentoBox();
let sceneCanvas: HTMLCanvasElement | null = null;

function fitScene(c: HTMLCanvasElement): void {
  const availW = Math.min(c.parentElement!.clientWidth, 520);
  const s = Math.max(1, Math.floor(availW / KW));
  c.width = KW; c.height = KH;
  c.style.width = `${KW * s}px`; c.style.height = `${KH * s}px`;
}

function kidExprNow(now: number): Expr {
  if (phase === 'evening') { const d = logs[day]; return d.lunch >= 3 ? 'happy' : d.lunch === 2 ? 'neutral' : d.lunch === 1 ? 'sad' : 'yuck'; }
  if (phase === 'leave') return pending?.mood === 'happy' ? 'happy' : pending?.mood === 'grumpy' ? 'yuck' : 'neutral';
  return now < reactUntil ? reactExpr : 'neutral';
}

function drawScene(now: number, dt: number): void {
  const c = sceneCanvas;
  if (!c || !c.isConnected) return;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, KW, KH);
  const expr = kidExprNow(now);
  const blink = expr === 'neutral' && now % 3300 < 140;
  const bob = (Math.floor(now / 620) % 2) as 0 | 1;
  const sx = shake > 0 ? Math.round(Math.sin(now / 28) * 2) : 0;
  shake = Math.max(0, shake - dt);
  const kidKey = `kid-${look.age}${look.gender}-${expr}-${blink}-${bob}`;
  if (phase === 'leave') {
    g.drawImage(sprite('entry-wall', () => entryWall(KW, 78)), 0, 0);
    blit(g, sprite(kidKey, () => childFront(look, expr, { blink, bob })), KW / 2 - 12, 78 - 40);
    g.drawImage(sprite('entry-floor', () => entryFloor(KW, KH - 78)), 0, 78);
    if (pending?.plan.forgot) {
      blit(g, sprite('lunch-mini', () => bentoLid()), 70, 80, 1);
      bubble(g, 84, 64, 1, '!');
    } else if (pending?.mood === 'happy') bubble(g, KW / 2 + 6, 22, 1, '♪');
  } else {
    g.drawImage(sprite(`kwall-${KW}`, () => kitchenWall(KW, COUNTER_Y + 4)), 0, 0);
    blit(g, sprite(kidKey, () => childFront(look, expr, { blink, bob })), KID_X + sx, COUNTER_Y - 29);
    g.drawImage(sprite(`kcounter-${KW}`, () => kitchenCounter(KW, KH - COUNTER_Y)), 0, COUNTER_Y);
    blit(g, sprite('bento', () => bento.g), BX, BY);
    const shown: Partial<Record<Slot, string>> = phase === 'evening' ? logs[day].sel : sel;
    for (const s of SLOTS) {
      const id = shown[s];
      const cell = bento.cells[s];
      if (phase === 'evening' && id && eatenCell(s)) {
        g.fillStyle = '#efdcbd'; for (const [px, py] of [[4, 5], [12, 9], [18, 4], [8, 13]]) g.fillRect(BX + cell.x + px, BY + cell.y + py, 1, 1);
        continue;
      }
      if (id) blit(g, sprite(`food-${id}`, () => food(id)), BX + cell.x + (cell.w - 16) / 2, BY + cell.y + (cell.h - 16) / 2);
      else if (phase === 'morning' && tab === s) { g.strokeStyle = '#f2b544'; g.lineWidth = 1; g.strokeRect(BX + cell.x + 0.5, BY + cell.y + 0.5, cell.w - 1, cell.h - 1); }
    }
    if (lidT >= 0) {
      lidT += dt;
      const k = Math.min(1, lidT / 0.3);
      blit(g, sprite('lid', bentoLid), BX, BY - 30 * (1 - k));
      if (lidT > 0.3 && lidT - dt <= 0.3) { spawn(fx, 'star', BX + 29, BY + 10, 8); spawn(fx, 'sparkle', BX + 29, BY + 20, 8); sfx('chime'); haptic(20); }
    }
  }
  step(fx, dt);
  drawFx(g, fx, 1);
}

function eatenCell(s: Slot): boolean {
  const d = logs[day];
  const id = d.sel[s];
  return d.lunch >= 3 || (d.lunch === 2 && id !== d.disliked) || (d.lunch === 1 && id === d.liked);
}

// ───────── 화면 (DOM) ─────────
function hud(): string {
  const t = totals();
  return `
  <header class="px-hud">
    <span class="px-title">도시락 하루</span>
    <div class="age-pick">${([7, 15] as Age[]).map((a) => `<button class="${a === age ? 'on' : ''}" data-age="${a}">${a}살</button>`).join('')}</div>
    <span class="px-pill">★ <b>${t.stars}</b></span>
    <span class="px-pill heart">♥ <b>${t.hearts}</b></span>
  </header>
  <nav class="px-week">${DAYS.map((d, i) => `<span class="${i === day && phase !== 'week' ? 'today' : ''} ${logs[i] ? 'done' : ''}">${d}<b>${logs[i] ? '★'.repeat(logs[i].lunch) || '·' : ''}</b></span>`).join('')}</nav>`;
}

function stage(say: string, tag: string): string {
  return `
  <div class="px-stage">
    <canvas id="scene"></canvas>
    ${tag ? `<span class="px-tag">${tag}</span>` : ''}
    ${say ? `<div class="px-say">${say}</div>` : ''}
  </div>`;
}

function render(): void {
  if (phase === 'commute') return;
  if (phase === 'week') { app.innerHTML = `<div class="day-px">${hud()}${weekView()}</div>`; return; }
  app.innerHTML = `<div class="day-px">${hud()}${phase === 'morning' ? morningView() : phase === 'leave' ? leaveView() : eveningView()}</div>`;
  sceneCanvas = document.getElementById('scene') as HTMLCanvasElement;
  if (sceneCanvas) fitScene(sceneCanvas);
}

function morningView(): string {
  const plan = plans[day];
  const react = kidReact();
  const say = react && Date.now() < reactUntilWall ? react.text : plan.reqs.map((r) => r.say[age]).join(age === 15 ? ' …그리고 ' : ' 아 그리고! ');
  return `
  ${stage(say, plan.reqs.map((r) => `${r.emoji} ${r.day}`).join(' + '))}
  <section class="px-panel">
    <div class="px-clock"><span>등교까지</span><div class="bar"><i id="clock" class="low" style="width:${(timer / DAY_TIME) * 100}%"></i></div></div>
    <div class="px-menu ${isFull(sel) ? '' : 'pending'}">${menuLabel(sel)}</div>
    <nav class="px-tabs">${SLOTS.map((s) => `<button class="px-tab ${tab === s ? 'on' : ''}" data-tab="${s}">${SLOT_LABEL[s]}${sel[s] ? ' ✓' : ''}</button>`).join('')}</nav>
    <div class="px-foods">${avail(tab).map((i) => `
      <button class="px-food ${sel[tab] === i.id ? 'on' : ''}" data-ing="${i.id}">
        <img src="${foodIcon(i.id)}" alt="">
        <span>${i.name}</span>
        ${known.dislikes.includes(i.id) ? '<i class="mark no">싫어</i>' : i.tags.some((t) => known.likes.includes(t)) ? '<i class="mark yes">좋아</i>' : ''}
      </button>`).join('')}</div>
    <button class="btn primary wide" data-act="pack" ${isFull(sel) && !busy ? '' : 'disabled'}>${busy ? '뚜껑 닫는 중…' : isFull(sel) ? '뚜껑 닫기' : '세 칸을 다 채워 주세요'}</button>
  </section>`;
}
let reactUntilWall = 0;

function leaveView(): string {
  const p = pending!;
  const moodText = p.mood === 'happy' ? '도시락을 보더니 콧노래를 흥얼거린다.' : p.mood === 'grumpy' ? '도시락을 열어 보더니 인상을 쓴다.' : '도시락을 가방에 넣었다.';
  const say = p.plan.forgot ? (age === 15 ? '다녀올게.' : '다녀오겠습니다!') : age === 15 ? '…따라오지 마.' : '다녀오겠습니다!';
  const teenWarn = age === 15 && vigilance > 0.05 ? `<p class="px-warn">요즘 뒤를 자주 돌아본다… 경계 ${Math.round(vigilance * 100)}%</p>` : '';
  return `
  ${stage(say, `${DAYS[day]}요일 아침 8시`)}
  <section class="px-panel">
    <p class="px-line">${moodText}</p>
    ${p.plan.forgot ? `
      <div class="px-alert">어? 신발장 앞에 도시락이…<br><b>두고 갔다!</b></div>
      ${teenWarn}
      <button class="btn primary wide" data-act="follow">몰래 따라가서 전해 주기</button>` : `
      ${teenWarn}
      <button class="btn primary wide" data-act="follow">몰래 따라가 보기<small>♥를 모을 수 있지만 들키면…</small></button>
      <button class="btn wide" data-act="skip">믿고 보내기<small>자립심 +2${age === 15 ? ' · 경계가 조금 풀린다' : ''}</small></button>`}
  </section>`;
}

function eveningView(): string {
  const d = logs[day];
  const f = d.follow;
  return `
  ${stage(d.note, `${DAYS[day]}요일 저녁`)}
  <section class="px-panel">
    <div class="px-verdict">${['그대로 돌아왔다…', '조금 먹고 남겼다', '거의 다 먹었다', '싹 비웠다!'][d.lunch]}</div>
    <div class="px-stars">${'★'.repeat(d.lunch)}<span>${'★'.repeat(3 - d.lunch)}</span></div>
    ${f ? `<p class="px-line">${f.over === 'caught' ? '등굣길에 들켰다' : f.over === 'lost' ? '등굣길에 놓쳤다' : f.delivered ? '몰래 배달 성공' : '교문까지 지켜봤다'} · ♥ ${f.score}</p><p class="px-sub">「${f.moment}」</p>` : '<p class="px-line">오늘은 믿고 보냈다.</p>'}
    ${d.extra ? `<p class="px-sub">${d.extra}</p>` : ''}
    <div class="chips">${[['유대감', d.bond], ['자립심', d.indep]].filter(([, v]) => v).map(([k, v]) => `<span class="chip ${(v as number) > 0 ? 'up' : 'down'}">${k} ${(v as number) > 0 ? '+' : ''}${v}</span>`).join('')}</div>
    <button class="btn primary wide" data-act="next">${day < 4 ? `${DAYS[day + 1]}요일로` : '일주일 결산'}</button>
  </section>`;
}

function weekView(): string {
  const t = totals();
  const bond = logs.reduce((a, d) => a + d.bond, 0);
  const indep = logs.reduce((a, d) => a + d.indep, 0);
  const followed = logs.filter((d) => d.followed).length;
  const caught = logs.filter((d) => d.follow?.over === 'caught').length;
  const verdict = caught >= 2 ? (age === 15 ? '방문에 "출입금지"가 붙었다' : '"왜 맨날 따라와?" 소리를 들었다')
    : t.stars >= 12 && followed <= 3 ? '아이 마음 독심술사' : followed >= 5 ? '도시락 들고 졸졸 부모' : t.stars >= 9 ? '꽤 아는 부모' : '아직 알아가는 중';
  const face = toDataURL(childFront(look, caught >= 2 ? 'yuck' : t.stars >= 9 ? 'happy' : 'neutral'), 4);
  return `
  <section class="px-panel week">
    <img class="px-face" src="${face}" alt="">
    <div class="px-sub">${age}살 · 일주일 결산</div>
    <h2>${verdict}</h2>
    <div class="px-week-stats"><span>★ 점심 <b>${t.stars}</b>/15</span><span>♥ <b>${t.hearts}</b></span></div>
    <ul class="result-list">${logs.map((d, i) => `<li>${DAYS[i]} ${d.plan.reqs.map((r) => r.emoji).join('')} 점심 ${'★'.repeat(d.lunch) || '☆'} · ${d.followed ? (d.follow?.over === 'caught' ? '들킴' : d.follow?.delivered ? '몰래 배달' : d.follow?.over === 'lost' ? '놓침' : '지켜봄') : '믿고 보냄'}</li>`).join('')}</ul>
    <div class="chips">${[['유대감', bond], ['자립심', indep]].map(([k, v]) => `<span class="chip ${(v as number) >= 0 ? 'up' : 'down'}">${k} ${(v as number) > 0 ? '+' : ''}${v}</span>`).join('')}</div>
    <p class="px-line">알아낸 것: 좋아함 ${known.likes.join(', ') || '아직 모름'} · 싫어함 ${known.dislikes.map((id) => ing(id).name).join(', ') || '아직 모름'}</p>
    <p class="px-sub">진짜 취향: 좋아함 ${ctx.likes.join(', ')} · 싫어함 ${ctx.dislikes.map((id) => ing(id).name).join(', ')}</p>
    <div class="px-row"><button class="btn primary" data-act="again">새 아이로</button><button class="btn" data-age="${age === 7 ? 15 : 7}">${age === 7 ? 15 : 7}살로</button></div>
  </section>`;
}

// ───────── 입력 ─────────
app.addEventListener('click', (e) => {
  if (phase === 'commute') return; // 등굣길은 follow-core가 처리
  const target = e.target as HTMLElement;
  // 캔버스의 도시락 칸을 누르면 그 칸으로
  if (target.id === 'scene' && phase === 'morning') {
    const r = target.getBoundingClientRect();
    const x = ((e as MouseEvent).clientX - r.left) / (r.width / KW), y = ((e as MouseEvent).clientY - r.top) / (r.height / KH);
    for (const s of SLOTS) { const c = bento.cells[s]; if (x >= BX + c.x && x < BX + c.x + c.w && y >= BY + c.y && y < BY + c.y + c.h) { tab = s; sfx('tap'); render(); return; } }
    return;
  }
  const el = target.closest<HTMLElement>('[data-act],[data-age],[data-tab],[data-ing]');
  if (!el) return;
  if (el.dataset.age) { age = Number(el.dataset.age) as Age; newWeek(); return; }
  if (busy) return;
  if (el.dataset.tab) { tab = el.dataset.tab as Slot; sfx('tap'); render(); return; }
  if (el.dataset.ing) {
    const placedSlot = tab;
    const res = placeOrToggle(sel, tab, el.dataset.ing);
    sel = res.draft; tab = res.tab;
    lastPick = res.placed ? el.dataset.ing : undefined;
    const r = kidReact();
    const cell = bento.cells[placedSlot];
    if (res.placed) {
      spawn(fx, 'sparkle', BX + cell.x + cell.w / 2, BY + cell.y + cell.h / 2, 6);
      reactExpr = r?.mood === 'happy' ? 'happy' : r?.mood === 'grumpy' ? 'yuck' : 'surprise';
      reactUntil = performance.now() + 1500; reactUntilWall = Date.now() + 1500;
      if (r?.mood === 'happy') spawn(fx, 'heart', KID_X + 12, COUNTER_Y - 30, 4);
      if (r?.mood === 'grumpy') shake = 0.4;
      setTimeout(() => { if (phase === 'morning' && !busy) render(); }, 1550);
    }
    sfx(!res.placed ? 'tap' : r?.mood === 'happy' ? 'ding' : 'pop'); haptic(r?.mood === 'grumpy' ? 25 : 8);
    render(); return;
  }
  const act = el.dataset.act;
  if (act === 'pack') closeLid();
  else if (act === 'follow') goCommute();
  else if (act === 'skip') finishDay(false);
  else if (act === 'next') { if (day < 4) { day++; startMorning(); } else { phase = 'week'; render(); } }
  else if (act === 'again') newWeek();
});

// ───────── 루프 ─────────
let last = performance.now();
function loop(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (phase !== 'commute') drawScene(now, dt);
  requestAnimationFrame(loop);
}
window.addEventListener('resize', () => { if (sceneCanvas) fitScene(sceneCanvas); });

// 자동 테스트용
(window as unknown as { __day: () => unknown }).__day = () => ({ phase, day, vigilance, logs: logs.length });

void loadPartOverrides().then(() => { clearSprites(); newWeek(); requestAnimationFrame(loop); });
