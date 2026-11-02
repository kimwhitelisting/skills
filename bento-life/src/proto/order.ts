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
import { getMenu } from '../game/bento.ts';
import { josa } from '../game/korean.ts';
import { menuKey } from '../game/menus.ts';
import type { Ingredient, Slot, Tag } from '../game/types.ts';
import { haptic, sfx } from '../ui/feedback.ts';

type Age = 7 | 15;
type Sel = Record<Slot, string>;
interface Ctx { age: Age; likes: Tag[]; dislikes: string[]; yesterday?: Sel }
interface Request {
  id: string; emoji: string; day: string; say: Record<Age, string>;
  /** 0~2: 요청을 얼마나 맞췄나 */
  judge: (items: Ingredient[], c: Ctx) => number;
  /** 못 맞췄을 때 아이가 저녁에 하는 말 (다음에 쓸 힌트) */
  miss: Record<Age, string>;
  ok: Record<Age, string>;
  ages: Age[];
}
const sum = (items: Ingredient[], k: 'fitness' | 'smarts' | 'health' | 'happy') => items.reduce((a, i) => a + Math.max(0, i.stats[k] ?? 0), 0);
const has = (items: Ingredient[], t: Tag) => items.some((i) => i.tags.includes(t));
const appeal = (items: Ingredient[]) => items.reduce((a, i) => a + i.appeal, 0);

const REQUESTS: Request[] = [
  { id: 'pe', emoji: '🏃', day: '체육 있는 날', ages: [7, 15],
    say: { 7: '오늘 체육 있어! 힘나는 거 싸 줘!', 15: '오늘 체육 두 시간 연속이래.' },
    judge: (it) => (sum(it, 'fitness') >= 5 ? 2 : sum(it, 'fitness') >= 3 ? 1 : 0),
    ok: { 7: '고기 먹고 달리기 1등 했어!', 15: '덕분에 안 쓰러지고 버텼다.' },
    miss: { 7: '체육 시간에 배고파서 힘들었어… 고기 같은 거 넣어 주지.', 15: '체육 끝나고 배고파 죽는 줄. 단백질 좀.' } },
  { id: 'test', emoji: '📝', day: '시험날', ages: [7, 15],
    say: { 7: '받아쓰기 시험이야… 머리 좋아지는 거!', 15: '오늘 중간고사. 졸리면 끝이야.' },
    judge: (it) => (has(it, '두뇌') || sum(it, 'smarts') >= 3 ? 2 : sum(it, 'smarts') >= 1 ? 1 : 0),
    ok: { 7: '생선 먹어서 그런가 다 맞았어!', 15: '머리가 맑았어. 잘 본 것 같아.' },
    miss: { 7: '시험 볼 때 머리가 멍했어… 생선이나 견과류 먹으면 좋대.', 15: '점심 먹고 졸려서 망함. 생선 같은 게 낫대.' } },
  { id: 'swap', emoji: '🔄', day: '반찬 교환의 날', ages: [7, 15],
    say: { 7: '친구랑 반찬 바꿔 먹기로 했어! 인기 많은 걸로!', 15: '애들이 도시락 구경한대. 이상한 거 싸지 마.' },
    judge: (it) => (appeal(it) >= 6 ? 2 : appeal(it) >= 3 ? 1 : 0),
    ok: { 7: '내 반찬 제일 먼저 없어졌어!', 15: '애들이 다 한 입씩 뺏어 먹음. ㅋ' },
    miss: { 7: '아무도 안 바꿔 줬어… 소시지나 돈까스 같은 거!', 15: '아무도 안 쳐다봄. 다음엔 좀 인기 있는 걸로.' } },
  { id: 'tummy', emoji: '🤢', day: '배탈 기운', ages: [7, 15],
    say: { 7: '배가 좀 아파…', 15: '어제부터 속이 안 좋아.' },
    judge: (it) => (has(it, '매운') || has(it, '튀김') || has(it, '정크') ? 0 : it.some((i) => ['porridge', 'tofu', 'banana', 'udon', 'rice', 'whitefish', 'pumpkin'].includes(i.id)) ? 2 : 1),
    ok: { 7: '부드러운 거라 배가 안 아팠어.', 15: '속 편했어. 고마워.' },
    miss: { 7: '먹고 나서 배가 더 아팠어… 맵거나 튀긴 건 싫어.', 15: '기름진 거 먹고 하루 종일 고생함.' } },
  { id: 'picnic', emoji: '🧺', day: '소풍날', ages: [7],
    say: { 7: '오늘 소풍이야!! 소풍엔 뭐 먹는지 알지?', 15: '' },
    judge: (it) => (it[0].id === 'gimbap' ? 2 : it[0].id === 'riceball' ? 1 : 0),
    ok: { 7: '돗자리에서 김밥 먹었어! 최고의 소풍!', 15: '' },
    miss: { 7: '다들 김밥 싸 왔는데 나만 아니었어…', 15: '' } },
  { id: 'spicy', emoji: '🌶️', day: '매운 게 당기는 날', ages: [15],
    say: { 7: '', 15: '아 매운 거 땡긴다.' },
    judge: (it) => (has(it, '매운') ? 2 : 0),
    ok: { 7: '', 15: '이거지. 스트레스 풀렸다.' },
    miss: { 7: '', 15: '매운 거 먹고 싶다니까… 제육이나 김치라도.' } },
  { id: 'diet', emoji: '🥗', day: '다이어트 선언', ages: [15],
    say: { 7: '', 15: '나 다이어트 할 거야. 진짜로.' },
    judge: (it, c) => (has(it, '정크') || has(it, '튀김') ? 0 : has(it, '채소') ? (it.some((i) => i.tags.some((t) => c.likes.includes(t))) ? 2 : 1) : 0),
    ok: { 7: '', 15: '건강한데 맛있네? 이건 계속 먹을 수 있어.' },
    miss: { 7: '', 15: '다이어트 한다니까 왜… 아니면 채소만 있어서 너무 맛없었거나.' } },
  { id: 'whatever', emoji: '🤷', day: '사춘기', ages: [15],
    say: { 7: '', 15: '…아무거나.' },
    judge: (it, c) => (it.some((i) => i.tags.some((t) => c.likes.includes(t))) && !it.some((i) => c.dislikes.includes(i.id)) ? 2 : 0),
    ok: { 7: '', 15: '…맛있었어. (아무거나가 아니었다)' },
    miss: { 7: '', 15: '…. (아무거나는 아무거나가 아니었다. 좋아하는 걸 원했던 것 같다)' } },
  { id: 'again', emoji: '🔁', day: '어제 그거', ages: [7, 15],
    say: { 7: '어제 그 반찬 또 먹고 싶어!', 15: '어제 그 메인, 또 해 줘.' },
    judge: (it, c) => (c.yesterday && it[1].id === c.yesterday.main ? 2 : 0),
    ok: { 7: '또 먹어도 맛있어!', 15: '역시.' },
    miss: { 7: '어제 거랑 달라… 어제 메인 반찬이 좋았는데.', 15: '어제 거 해 달라니까.' } },
  { id: 'rain', emoji: '🌧️', day: '비 오는 날', ages: [7, 15],
    say: { 7: '비 와서 추워… 따뜻한 거!', 15: '비 오니까 국물 땡긴다.' },
    judge: (it) => (['udon', 'porridge'].includes(it[0].id) ? 2 : it[1].id === 'bulgogi' || it[1].id === 'jeyuk' ? 1 : 0),
    ok: { 7: '따끈해서 몸이 녹았어!', 15: '국물 최고.' },
    miss: { 7: '도시락이 다 식어서 추웠어… 우동 같은 거!', 15: '비 오는 날엔 국물이지…' } },
];

const LIKE_POOL: Tag[] = ['달콤', '고기', '생선', '채소', '과일', '면', '튀김'];
const DAYS = ['월', '화', '수', '목', '금'];
const app = document.getElementById('app')!;

interface Day { req: Request; sel: Sel; score: number; reqScore: number; liked?: string; disliked?: string; note: string }
let age: Age = 7;
let ctx: Ctx;
let plan: Request[] = [];
let day = 0;
let sel: Sel;
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
  sel = { base: pick(avail('base')).id, main: pick(avail('main')).id, side: pick(avail('side')).id };
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
  clearInterval(timerId);
  const req = plan[day];
  const items = [ing(sel.base), ing(sel.main), ing(sel.side)];
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
  history.push({ req, sel: { ...sel }, score, reqScore, liked: likedItem?.id, disliked: dislikedItem?.id, note: notes.join(' ') });
  ctx.yesterday = { ...sel };
  phase = 'evening';
  sfx(score >= 3 ? 'chime' : score >= 2 ? 'ding' : 'tap');
  haptic(score <= 1 ? 40 : 15);
  render();
}

// ───────── 화면 ─────────
function render(): void {
  if (phase === 'week') return void (app.innerHTML = weekView());
  const req = plan[day];
  const items = [ing(sel.base), ing(sel.main), ing(sel.side)];
  const menu = getMenu(menuKey(sel.base, sel.main, sel.side));
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
        <div class="bento">${(['base', 'main', 'side'] as Slot[]).map((s, n) => `<div class="cell ${s} ${tab === s ? 'active' : ''}" data-tab="${s}">${pic(items[n])}</div>`).join('')}</div>
        <div class="menu-label">${menu?.name ?? ''}</div>
      </div>
      <nav class="labels">${(['base', 'main', 'side'] as Slot[]).map((s) => `<button class="label ${s} ${tab === s ? 'on' : ''}" data-tab="${s}">${{ base: '주식', main: '메인', side: '반찬' }[s]}</button>`).join('')}</nav>
      <div class="spread">${avail(tab).map((i) => `<button class="ing ${sel[tab] === i.id ? 'on' : ''}" data-ing="${i.id}"><span class="e">${pic(i)}${known.dislikes.includes(i.id) ? '<span class="mark">🙅</span>' : i.tags.some((t) => known.likes.includes(t)) ? '<span class="mark">💗</span>' : ''}</span><span class="n">${i.name}</span></button>`).join('')}</div>
      <button class="btn primary wide pack-btn" data-act="pack">🍱 뚜껑 닫고 보내기</button>
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
    sel = { ...sel, [tab]: el.dataset.ing };
    const order: Slot[] = ['base', 'main', 'side'];
    if (tab !== 'side') tab = order[order.indexOf(tab) + 1];
    sfx('pop'); haptic(8); render(); return;
  }
  const act = el.dataset.act;
  if (act === 'pack') pack();
  else if (act === 'next') { if (day < 4) { day++; startDay(); } else { phase = 'week'; render(); } }
  else if (act === 'again') newWeek();
});

newWeek();
