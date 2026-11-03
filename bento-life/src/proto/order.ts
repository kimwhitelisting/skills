/**
 * 맛보기 A — 아이 마음 읽기
 * 월~금, 매일 아침 아이가 상황과 요청을 말한다. 진짜 뜻과 숨은 취향을 읽어 도시락을 싸면
 * 저녁에 돌아온 도시락통으로 결과를 알 수 있다. 아이의 한마디가 다음 날의 힌트가 된다.
 */
import '../style.css';
import './proto.css';
import './order.css';
import { ingredientArt } from '../art.ts';
import { INGREDIENTS, ing } from '../data/ingredients.ts';
import { josa } from '../game/korean.ts';
import type { Ingredient, Slot, Tag } from '../game/types.ts';
import { haptic, sfx } from '../ui/feedback.ts';

import { bentoCells, fillRandom, isFull, menuLabel, placeOrToggle, type Draft } from './bento-ui.ts';
import { REQUESTS, type Age, type Ctx, type Request, type Sel } from './order-data.ts';

const LIKE_POOL: Tag[] = ['달콤', '고기', '생선', '채소', '과일', '면', '튀김'];
const DAYS = ['월', '화', '수', '목', '금'];
const app = document.getElementById('app')!;

interface Day { req: Request; sel: Sel; score: number; reqScore: number; liked?: string; disliked?: string; note: string }
let age: Age = 7;
let ctx: Ctx;
let plan: Request[] = [];
let day = 0;
let sel: Draft = {};
let justPlaced: Slot | undefined;
let tab: Slot = 'base';
let history: Day[] = [];
let known = { likes: [] as Tag[], dislikes: [] as string[] };
let phase: 'pack' | 'evening' | 'week' = 'pack';
let timer = 0;
let timerId = 0;
const DAY_TIME = 25;

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const shuffle = <T,>(a: T[]) => a.map((v) => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map(([, v]) => v);
const avail = (slot: Slot) => INGREDIENTS.filter((i) => i.slot === slot && age >= i.minAge && age <= i.maxAge);
const pic = (i: Ingredient) => { const u = ingredientArt(i.id); return u ? `<img class="pic" src="${u}" alt="" draggable="false">` : `<span class="emo">${i.emoji}</span>`; };

function newWeek(): void {
  const likes = shuffle(LIKE_POOL).slice(0, 2);
  const dislikes = shuffle(INGREDIENTS.filter((i) => i.slot !== 'base' && i.minAge <= age && !i.tags.some((t) => likes.includes(t)))).slice(0, 2).map((i) => i.id);
  ctx = { age, likes, dislikes };
  const pool = REQUESTS.filter((r) => r.ages.includes(age) && r.id !== 'again');
  plan = shuffle(pool).slice(0, 4);
  plan.splice(2 + Math.floor(Math.random() * 2), 0, REQUESTS.find((r) => r.id === 'again')!); // "어제 그거"는 셋째·넷째 날
  if (age === 7 && !plan.some((r) => r.id === 'picnic')) plan[4] = REQUESTS.find((r) => r.id === 'picnic')!;
  day = 0; history = []; known = { likes: [], dislikes: [] };
  startDay();
}

function startDay(): void {
  phase = 'pack';
  sel = {};
  tab = 'base';
  timer = DAY_TIME;
  clearInterval(timerId);
  timerId = window.setInterval(() => {
    timer -= 0.25;
    const bar = document.getElementById('clock');
    if (bar) bar.style.width = `${(timer / DAY_TIME) * 100}%`;
    if (timer <= 5 && timer > 4.75) { sfx('tap'); haptic(15); }
    if (timer <= 0) pack(true);
  }, 250);
  render();
}

function pack(late = false): void {
  if (!isFull(sel) && !late) return;
  clearInterval(timerId);
  const full: Sel = isFull(sel) ? sel : fillRandom(sel, avail);
  sel = full;
  const req = plan[day];
  const items = [ing(full.base), ing(full.main), ing(full.side)];
  const reqScore = req.judge(items, ctx);
  const likedItem = items.find((i) => i.tags.some((t) => ctx.likes.includes(t)));
  const dislikedItem = items.find((i) => ctx.dislikes.includes(i.id));
  let score = reqScore + (likedItem ? 1 : 0) - (dislikedItem ? 1 : 0) - (late ? 1 : 0);
  score = Math.max(0, Math.min(3, score));
  const notes: string[] = [];
  notes.push(reqScore === 2 ? req.ok[age] : req.miss[age]);
  if (dislikedItem) {
    notes.push(age === 15 ? `${josa(dislikedItem.name, '은/는')} 빼 달라고 몇 번을 말해.` : `${josa(dislikedItem.name, '은/는')} 남겼어. 싫단 말이야.`);
    if (!known.dislikes.includes(dislikedItem.id)) known.dislikes.push(dislikedItem.id);
  }
  if (likedItem) {
    const tag = likedItem.tags.find((t) => ctx.likes.includes(t))!;
    if (!known.likes.includes(tag)) { known.likes.push(tag); notes.push(age === 15 ? `(${likedItem.name}만 다 먹었다. ${tag} 좋아하는 듯)` : `${likedItem.name} 진짜 맛있었어! (${tag} 좋아하는 것 같다)`); }
  }
  if (late) notes.push('(늦어서 허둥지둥 싸 준 도시락이었다)');
  history.push({ req, sel: { ...full }, score, reqScore, liked: likedItem?.id, disliked: dislikedItem?.id, note: notes.join(' ') });
  ctx.yesterday = { ...full };
  phase = 'evening';
  sfx(score >= 3 ? 'chime' : score >= 2 ? 'ding' : 'tap');
  haptic(score <= 1 ? 40 : 15);
  render();
}

// ───────── 화면 ─────────
function render(): void {
  if (phase === 'week') return void (app.innerHTML = weekView());
  const req = plan[day];
  const kidFace = age === 7 ? '🧒' : '🧑';
  const h = history[day];
  app.innerHTML = `
  <div class="proto order">
    <header class="proto-top">
      <h1>아이 마음 읽기</h1>
      <div class="age-pick">${([7, 15] as Age[]).map((a) => `<button class="${a === age ? 'on' : ''}" data-age="${a}">${a}살</button>`).join('')}</div>
    </header>
    <div class="week-strip">${DAYS.map((d, i) => `<span class="${i === day ? 'today' : ''} ${history[i] ? 'done' : ''}">${d}${history[i] ? `<b>${'★'.repeat(history[i].score) || '·'}</b>` : ''}</span>`).join('')}</div>
    <div class="kid-zone">
      <span class="meal-tag">${req.emoji} ${req.day}</span>
      <div class="bubble big-bubble">${phase === 'evening' ? h.note : req.say[age]}</div>
      <div class="kid ${phase === 'evening' ? (h.score >= 2 ? 'mood-happy' : 'mood-yuck') : ''}"><span class="emo">${phase === 'evening' ? (h.score >= 3 ? '😋' : h.score === 2 ? '🙂' : h.score === 1 ? '😕' : '😣') : kidFace}</span></div>
    </div>
    ${phase === 'pack' ? `
    <div class="counter">
      <div class="clock"><span>⏰ 등교까지</span><div class="bar"><i id="clock" class="low" style="width:${(timer / DAY_TIME) * 100}%"></i></div></div>
      <div class="board">
        <div class="bento">${bentoCells(sel, tab, pic, justPlaced)}</div>
        <div class="menu-label ${isFull(sel) ? '' : 'pending'}">${menuLabel(sel)}</div>
      </div>
      <nav class="labels">${(['base', 'main', 'side'] as Slot[]).map((s) => `<button class="label ${s} ${tab === s ? 'on' : ''}" data-tab="${s}">${{ base: '주식', main: '메인', side: '반찬' }[s]}${sel[s] ? ' ✓' : ''}</button>`).join('')}</nav>
      <div class="spread">${avail(tab).map((i) => `<button class="ing ${sel[tab] === i.id ? 'on' : ''}" data-ing="${i.id}"><span class="e">${pic(i)}${known.dislikes.includes(i.id) ? '<span class="mark">🙅</span>' : i.tags.some((t) => known.likes.includes(t)) ? '<span class="mark">💗</span>' : ''}</span><span class="n">${i.name}</span></button>`).join('')}</div>
      <button class="btn primary wide pack-btn" data-act="pack" ${isFull(sel) ? '' : 'disabled'}>${isFull(sel) ? '🍱 뚜껑 닫고 보내기' : '세 칸을 다 채워 주세요'}</button>
    </div>` : `
    <div class="counter evening">
      <div class="returned">
        <div class="bento back s${h.score}">${(['base', 'main', 'side'] as Slot[]).map((s) => {
          const id = h.sel[s];
          const eaten = h.score >= 3 || (h.score === 2 && id !== h.disliked) || (h.score === 1 && id === h.liked);
          return `<div class="cell ${s} ${eaten ? 'eaten' : ''}">${eaten ? '<span class="crumbs">✨</span>' : pic(ing(id))}</div>`;
        }).join('')}</div>
        <div class="verdict">${['그대로 돌아왔다…', '조금 먹고 남겼다', '거의 다 먹었다', '싹 비웠다!'][h.score]}</div>
        <div class="stars">${'★'.repeat(h.score)}${'☆'.repeat(3 - h.score)}</div>
        <div class="why">요청 ${h.reqScore === 2 ? '딱 맞음' : h.reqScore === 1 ? '조금 맞음' : '빗나감'}${h.liked ? ' · 좋아하는 맛 💗' : ''}${h.disliked ? ' · 싫어하는 재료 🙅' : ''}</div>
      </div>
      <button class="btn primary wide" data-act="next">${day < 4 ? `🌙 ${DAYS[day + 1]}요일로` : '📅 일주일 결산'}</button>
    </div>`}
  </div>`;
}

function weekView(): string {
  const total = history.reduce((a, d) => a + d.score, 0);
  const title = total >= 13 ? '🔮 아이 마음 독심술사' : total >= 10 ? '👍 꽤 아는 부모' : total >= 6 ? '🤔 아직 알아가는 중' : '😵 우리 애… 누구세요?';
  return `
  <div class="proto order">
    <div class="overlay-card static">
      <article class="diary">
        <div class="diary-date">${age}살 · 일주일 결산</div>
        <h2>${title}</h2>
        <div class="stars">${total} / 15 ★</div>
        <ul class="result-list">${history.map((d, i) => `<li>${DAYS[i]} ${d.req.emoji} ${d.req.day} — ${'★'.repeat(d.score) || '☆'}</li>`).join('')}</ul>
        <p class="story">알아낸 것: 💗 ${known.likes.join(', ') || '아직 모름'} · 🙅 ${known.dislikes.map((id) => ing(id).name).join(', ') || '아직 모름'}<br>
        <small>진짜 취향: 💗 ${ctx.likes.join(', ')} · 🙅 ${ctx.dislikes.map((id) => ing(id).name).join(', ')}</small></p>
        <div class="row"><button class="btn primary" data-act="again">새 아이로 다시</button>${age === 7 ? '<button class="btn paper" data-age="15">15살로</button>' : '<button class="btn paper" data-age="7">7살로</button>'}</div>
      </article>
    </div>
  </div>`;
}

app.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act],[data-age],[data-tab],[data-ing]');
  if (!el) return;
  if (el.dataset.age) { age = Number(el.dataset.age) as Age; newWeek(); return; }
  if (el.dataset.tab) { tab = el.dataset.tab as Slot; sfx('tap'); render(); return; }
  if (el.dataset.ing) {
    const placedSlot = tab;
    const res = placeOrToggle(sel, tab, el.dataset.ing);
    sel = res.draft; tab = res.tab;
    justPlaced = res.placed ? placedSlot : undefined;
    sfx(res.placed ? 'pop' : 'tap'); haptic(8); render(); justPlaced = undefined; return;
  }
  const act = el.dataset.act;
  if (act === 'pack') pack();
  else if (act === 'next') { if (day < 4) { day++; startDay(); } else { phase = 'week'; render(); } }
  else if (act === 'again') newWeek();
});

newWeek();
