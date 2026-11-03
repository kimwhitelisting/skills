/**
 * 하루 맛보기 — 아침 도시락 → 등굣길 → 저녁
 *
 *  아침  : 아이의 요청(겹치는 날도 있음)을 읽고 도시락 싸기. 고르는 동안 아이가 아는 취향에 바로 반응.
 *  등굣길: 도시락을 두고 간 날은 꼭, 나머지 날은 따라갈지 말지 선택.
 *          아침 도시락이 마음에 들면 콧노래(덜 돌아봄), 싫은 게 있으면 툴툴(자주 돌아봄).
 *          15살은 따라간 날이 쌓일수록 다음 날 더 경계한다.
 *  저녁  : 돌아온 도시락통 + 등굣길의 한 장면.
 */
import '../style.css';
import './proto.css';
import './follow.css';
import './order.css';
import './day.css';
import { ingredientArt } from '../art.ts';
import { INGREDIENTS, ing } from '../data/ingredients.ts';
import { getMenu } from '../game/bento.ts';
import { josa } from '../game/korean.ts';
import { menuKey } from '../game/menus.ts';
import type { Ingredient, Slot, Tag } from '../game/types.ts';
import { haptic, sfx } from '../ui/feedback.ts';
import { mountFollow, unmountFollow, type FollowResult } from './follow-core.ts';
import { REQUESTS, type Age, type Ctx, type Request, type Sel } from './order-data.ts';

type Mood = 'happy' | 'neutral' | 'grumpy';
interface Plan { reqs: Request[]; forgot: boolean }
interface DayLog {
  plan: Plan; sel: Sel; lunch: number; reqScore: number; liked?: string; disliked?: string; note: string;
  mood: Mood; followed: boolean; follow?: FollowResult; bond: number; indep: number;
}

const DAYS = ['월', '화', '수', '목', '금'];
const DAY_TIME = 30;
const LIKE_POOL: Tag[] = ['달콤', '고기', '생선', '채소', '과일', '면', '튀김'];
const SLOT_LABEL: Record<Slot, string> = { base: '주식', main: '메인', side: '반찬' };
const app = document.getElementById('app')!;

let age: Age = 7;
let ctx: Ctx;
let plans: Plan[] = [];
let day = 0;
let sel: Sel;
let tab: Slot = 'base';
let lastPick: string | undefined;
let phase: 'morning' | 'leave' | 'commute' | 'evening' | 'week' = 'morning';
let logs: DayLog[] = [];
let known = { likes: [] as Tag[], dislikes: [] as string[] };
let vigilance = 0;
let timer = 0;
let timerId = 0;
let pending: Omit<DayLog, 'followed' | 'follow' | 'bond' | 'indep'> | undefined;

const shuffle = <T,>(a: T[]) => a.map((v) => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map(([, v]) => v);
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const avail = (slot: Slot) => INGREDIENTS.filter((i) => i.slot === slot && age >= i.minAge && age <= i.maxAge);
const pic = (i: Ingredient) => { const u = ingredientArt(i.id); return u ? `<img class="pic" src="${u}" alt="" draggable="false">` : `<span class="emo">${i.emoji}</span>`; };
const kidEmoji = () => (age === 7 ? '🧒' : '🧑');

// ───────── 한 주 준비 ─────────
function newWeek(): void {
  const likes = shuffle(LIKE_POOL).slice(0, 2);
  const dislikes = shuffle(INGREDIENTS.filter((i) => i.slot !== 'base' && i.minAge <= age && !i.tags.some((t) => likes.includes(t)))).slice(0, 2).map((i) => i.id);
  ctx = { age, likes, dislikes };
  const pool = shuffle(REQUESTS.filter((r) => r.ages.includes(age) && r.id !== 'again'));
  const again = REQUESTS.find((r) => r.id === 'again')!;
  const singles = pool.slice(0, 4);
  singles.splice(2 + Math.floor(Math.random() * 2), 0, again);
  if (age === 7 && !singles.some((r) => r.id === 'picnic')) singles[4] = REQUESTS.find((r) => r.id === 'picnic')!;
  // 수요일부터는 요청이 겹치는 날이 나온다 (예: 체육 + 배탈)
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
  sel = { base: pick(avail('base')).id, main: pick(avail('main')).id, side: pick(avail('side')).id };
  tab = 'base'; lastPick = undefined;
  timer = DAY_TIME;
  clearInterval(timerId);
  timerId = window.setInterval(() => {
    timer -= 0.25;
    const bar = document.getElementById('clock');
    if (bar) bar.style.width = `${(timer / DAY_TIME) * 100}%`;
    if (timer <= 5 && Math.abs(timer % 1) < 0.01) { sfx('tap'); haptic(12); }
    if (timer <= 0) pack(true);
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

function pack(late = false): void {
  clearInterval(timerId);
  const plan = plans[day];
  const items = [ing(sel.base), ing(sel.main), ing(sel.side)];
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
  // 아침에 도시락을 본 아이의 기분 → 등굣길에 영향
  const mood: Mood = dislikedItem ? 'grumpy' : likedItem && reqScore >= 1 ? 'happy' : 'neutral';
  pending = { plan, sel: { ...sel }, lunch, reqScore, liked: likedItem?.id, disliked: dislikedItem?.id, note: notes.join(' '), mood };
  phase = 'leave';
  sfx('pack'); haptic(15);
  render();
}

function goCommute(): void {
  const p = pending!;
  phase = 'commute';
  const moodMult = p.mood === 'happy' ? 1.3 : p.mood === 'grumpy' ? 0.8 : 1;
  const vig = age === 15 ? 1 - vigilance : 1;
  mountFollow(app, {
    age: age === 7 ? 6 : 15, standalone: false, label: `${age}살`, title: `${DAYS[day]}요일 등굣길`,
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
    extra.push(pick(['혼자 씩씩하게 학교에 갔다.', '친구를 만나 수다 떨며 갔다고 한다.', '오늘은 무슨 일이 있었는지 모르겠다. 물어봐도 "그냥."']));
  } else if (f) {
    bond += f.bond; indep += f.indep;
    if (p.plan.forgot && !f.delivered) {
      lunch = Math.max(0, lunch - (f.over === 'caught' ? 0 : 1));
      extra.push(f.over === 'caught' ? '도시락은 받았지만… 친구들 앞에서 받았다.' : '도시락은 교무실에서 늦게 받았다. 다 식어 있었다.');
    }
    if (age === 15) vigilance = Math.min(0.4, vigilance + (f.over === 'caught' ? 0.2 : 0.1));
  }
  if (!followed && age === 15) vigilance = Math.max(0, vigilance - 0.08);
  logs.push({ ...p, lunch, followed, follow: f, bond, indep });
  pending = undefined;
  phase = 'evening';
  sfx(lunch >= 3 ? 'chime' : lunch >= 2 ? 'ding' : 'tap');
  render();
  if (extra.length) { const el = document.getElementById('extra'); if (el) el.textContent = extra.join(' '); }
}

// ───────── 화면 ─────────
function header(): string {
  return `
  <header class="proto-top">
    <h1>하루 맛보기</h1>
    <div class="age-pick">${([7, 15] as Age[]).map((a) => `<button class="${a === age ? 'on' : ''}" data-age="${a}">${a}살</button>`).join('')}</div>
  </header>
  <div class="week-strip">${DAYS.map((d, i) => `<span class="${i === day ? 'today' : ''} ${logs[i] ? 'done' : ''}">${d}${logs[i] ? `<b>${'★'.repeat(logs[i].lunch) || '·'}</b>` : ''}</span>`).join('')}</div>`;
}

function render(): void {
  if (phase === 'commute') return;
  if (phase === 'week') { app.innerHTML = weekView(); return; }
  app.innerHTML = `<div class="proto order day">${header()}${phase === 'morning' ? morningView() : phase === 'leave' ? leaveView() : eveningView()}</div>`;
}

function morningView(): string {
  const plan = plans[day];
  const items = [ing(sel.base), ing(sel.main), ing(sel.side)];
  const menu = getMenu(menuKey(sel.base, sel.main, sel.side));
  const react = kidReact();
  const say = plan.reqs.map((r) => r.say[age]).join(age === 15 ? ' …그리고 ' : ' 아 그리고! ');
  return `
  <div class="kid-zone">
    <span class="meal-tag">${plan.reqs.map((r) => `${r.emoji} ${r.day}`).join(' + ')}</span>
    <div class="bubble big-bubble">${say}</div>
    <div class="kid ${react ? `mood-${react.mood === 'grumpy' ? 'yuck' : react.mood}` : ''}"><span class="emo">${react?.mood === 'happy' ? '😋' : react?.mood === 'grumpy' ? '🤢' : kidEmoji()}</span></div>
    ${react ? `<div class="react-chip mood-${react.mood}" data-pop>${react.text}</div>` : ''}
  </div>
  <div class="counter">
    <div class="clock"><span>⏰ 등교까지</span><div class="bar"><i id="clock" class="low" style="width:${(timer / DAY_TIME) * 100}%"></i></div></div>
    <div class="board">
      <div class="bento">${(['base', 'main', 'side'] as Slot[]).map((s, n) => `<div class="cell ${s} ${tab === s ? 'active' : ''}" data-tab="${s}">${pic(items[n])}</div>`).join('')}</div>
      <div class="menu-label">${menu?.name ?? ''}</div>
    </div>
    <nav class="labels">${(['base', 'main', 'side'] as Slot[]).map((s) => `<button class="label ${s} ${tab === s ? 'on' : ''}" data-tab="${s}">${SLOT_LABEL[s]}</button>`).join('')}</nav>
    <div class="spread">${avail(tab).map((i) => `<button class="ing ${sel[tab] === i.id ? 'on' : ''}" data-ing="${i.id}"><span class="e">${pic(i)}${known.dislikes.includes(i.id) ? '<span class="mark">🙅</span>' : i.tags.some((t) => known.likes.includes(t)) ? '<span class="mark">💗</span>' : ''}</span><span class="n">${i.name}</span></button>`).join('')}</div>
    <button class="btn primary wide pack-btn" data-act="pack">🍱 뚜껑 닫기</button>
  </div>`;
}

function leaveView(): string {
  const p = pending!;
  const moodText = p.mood === 'happy' ? '도시락을 보더니 콧노래를 흥얼거린다 🎵' : p.mood === 'grumpy' ? `도시락을 열어 보더니 인상을 쓴다 😤` : '도시락을 가방에 넣었다.';
  const teenWarn = age === 15 && vigilance > 0.05 ? `<p class="omen">👀 요즘 뒤를 자주 돌아본다… (경계 ${Math.round(vigilance * 100)}%)</p>` : '';
  return `
  <div class="kid-zone">
    <span class="meal-tag">${DAYS[day]}요일 아침 8시</span>
    <div class="bubble big-bubble">${p.plan.forgot ? (age === 15 ? '다녀올게.' : '다녀오겠습니다!') : age === 15 ? '…따라오지 마.' : '다녀오겠습니다!'}</div>
    <div class="kid"><span class="emo">${kidEmoji()}</span></div>
  </div>
  <div class="counter leave">
    <p class="leave-mood">${moodText}</p>
    ${p.plan.forgot ? `
      <div class="forgot">🍱❗ <b>어? 식탁 위에 도시락이…</b><br>두고 갔다!</div>
      ${teenWarn}
      <button class="btn primary wide" data-act="follow">🏃 몰래 따라가서 전해 주기</button>` : `
      ${teenWarn}
      <button class="btn primary wide" data-act="follow">🔭 몰래 따라가 보기 <small>💗를 모을 수 있지만 들키면…</small></button>
      <button class="btn paper wide" data-act="skip">🏠 믿고 보내기 <small>자립심 +2${age === 15 ? ' · 경계가 조금 풀린다' : ''}</small></button>`}
  </div>`;
}

function eveningView(): string {
  const d = logs[day];
  const f = d.follow;
  return `
  <div class="kid-zone">
    <span class="meal-tag">🌙 ${DAYS[day]}요일 저녁</span>
    <div class="bubble big-bubble">${d.note}</div>
    <div class="kid ${d.lunch >= 2 ? 'mood-happy' : 'mood-yuck'}"><span class="emo">${['😣', '😕', '🙂', '😋'][d.lunch]}</span></div>
  </div>
  <div class="counter evening">
    <div class="returned">
      <div class="bento back">${(['base', 'main', 'side'] as Slot[]).map((s) => {
        const id = d.sel[s];
        const eaten = d.lunch >= 3 || (d.lunch === 2 && id !== d.disliked) || (d.lunch === 1 && id === d.liked);
        return `<div class="cell ${s} ${eaten ? 'eaten' : ''}">${eaten ? '<span class="crumbs">✨</span>' : pic(ing(id))}</div>`;
      }).join('')}</div>
      <div class="verdict">${['그대로 돌아왔다…', '조금 먹고 남겼다', '거의 다 먹었다', '싹 비웠다!'][d.lunch]}</div>
      <div class="stars">${'★'.repeat(d.lunch)}${'☆'.repeat(3 - d.lunch)}</div>
    </div>
    <div class="day-sum">
      ${f ? `<figure class="polaroid mini"><figcaption>📷 ${f.moment}</figcaption></figure>
        <p>${f.over === 'caught' ? '😳 등굣길에 들켰다' : f.over === 'lost' ? '💨 등굣길에 놓쳤다' : f.delivered ? '🍱 몰래 배달 성공' : '🏫 교문까지 지켜봤다'} · 💗 ${f.score}</p>` : '<p>🏠 오늘은 믿고 보냈다.</p>'}
      <p id="extra" class="sub"></p>
      <div class="chips">${[['💞 유대감', d.bond], ['🦋 자립심', d.indep]].filter(([, v]) => v).map(([k, v]) => `<span class="chip ${(v as number) > 0 ? 'up' : 'down'}">${k} ${(v as number) > 0 ? '+' : ''}${v}</span>`).join('')}</div>
    </div>
    <button class="btn primary wide" data-act="next">${day < 4 ? `🌙 ${DAYS[day + 1]}요일로` : '📅 일주일 결산'}</button>
  </div>`;
}

function weekView(): string {
  const stars = logs.reduce((a, d) => a + d.lunch, 0);
  const hearts = logs.reduce((a, d) => a + (d.follow?.score ?? 0), 0);
  const bond = logs.reduce((a, d) => a + d.bond, 0);
  const indep = logs.reduce((a, d) => a + d.indep, 0);
  const followed = logs.filter((d) => d.followed).length;
  const caught = logs.filter((d) => d.follow?.over === 'caught').length;
  const verdict = caught >= 2 ? (age === 15 ? '🚪 방문에 "출입금지"가 붙었다' : '🙈 "왜 맨날 따라와?" 소리를 들었다')
    : stars >= 12 && followed <= 3 ? '🔮 아이 마음 독심술사' : followed >= 5 ? '🍱 도시락 들고 졸졸 부모' : stars >= 9 ? '👍 꽤 아는 부모' : '🤔 아직 알아가는 중';
  return `
  <div class="proto order day">
    <div class="overlay-card static">
      <article class="diary">
        <div class="diary-date">${age}살 · 일주일 결산</div>
        <h2>${verdict}</h2>
        <div class="stars">🍱 ${stars}/15 · 💗 ${hearts}</div>
        <ul class="result-list">${logs.map((d, i) => `<li>${DAYS[i]} ${d.plan.reqs.map((r) => r.emoji).join('')} 점심 ${'★'.repeat(d.lunch) || '☆'} · ${d.followed ? (d.follow?.over === 'caught' ? '😳 들킴' : d.follow?.delivered ? '🍱 몰래 배달' : d.follow?.over === 'lost' ? '💨 놓침' : '🔭 지켜봄') : '🏠 믿고 보냄'}</li>`).join('')}</ul>
        <div class="chips">${[['💞 유대감', bond], ['🦋 자립심', indep]].map(([k, v]) => `<span class="chip ${(v as number) >= 0 ? 'up' : 'down'}">${k} ${(v as number) > 0 ? '+' : ''}${v}</span>`).join('')}</div>
        <p class="story">알아낸 것: 💗 ${known.likes.join(', ') || '아직 모름'} · 🙅 ${known.dislikes.map((id) => ing(id).name).join(', ') || '아직 모름'}<br>
        <small>진짜 취향: 💗 ${ctx.likes.join(', ')} · 🙅 ${ctx.dislikes.map((id) => ing(id).name).join(', ')}</small></p>
        <div class="row"><button class="btn primary" data-act="again">새 아이로 다시</button><button class="btn paper" data-age="${age === 7 ? 15 : 7}">${age === 7 ? 15 : 7}살로</button></div>
      </article>
    </div>
  </div>`;
}

// ───────── 입력 ─────────
app.addEventListener('click', (e) => {
  if (phase === 'commute') return; // 등굣길은 follow-core가 처리
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act],[data-age],[data-tab],[data-ing]');
  if (!el) return;
  if (el.dataset.age) { age = Number(el.dataset.age) as Age; newWeek(); return; }
  if (el.dataset.tab) { tab = el.dataset.tab as Slot; sfx('tap'); render(); return; }
  if (el.dataset.ing) {
    sel = { ...sel, [tab]: el.dataset.ing };
    lastPick = el.dataset.ing;
    const order: Slot[] = ['base', 'main', 'side'];
    if (tab !== 'side') tab = order[order.indexOf(tab) + 1];
    const r = kidReact();
    sfx(r?.mood === 'happy' ? 'ding' : 'pop'); haptic(r?.mood === 'grumpy' ? 25 : 8);
    render(); return;
  }
  const act = el.dataset.act;
  if (act === 'pack') pack();
  else if (act === 'follow') goCommute();
  else if (act === 'skip') finishDay(false);
  else if (act === 'next') { if (day < 4) { day++; startMorning(); } else { phase = 'week'; render(); } }
  else if (act === 'again') newWeek();
});

// 자동 테스트용
(window as unknown as { __day: () => unknown }).__day = () => ({ phase, day, vigilance, logs: logs.length });

newWeek();
