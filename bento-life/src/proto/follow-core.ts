/**
 * 맛보기 B — 졸졸 따라가기 v2
 * 아이가 도시락을 두고 갔다! 들키지 말고 따라가서 학교 사물함에 몰래 넣어 주자.
 *
 * 손맛과 한 판의 재미:
 *  - 꾹 누르면 걷기, 떼면 멈춤. 두 번 톡 = 다음 숨을 곳까지 후다닥 (뛰다 걸리면 큰일)
 *  - 가까이 붙을수록 💗(지켜본 마음)이 빨리 쌓인다 → 붙을까 말까가 매 순간의 고민
 *  - 아이가 돌아보기 직전에 숨으면 슬로모션 + "휴~!" 보너스
 *  - 방해꾼: 큰 소리로 아는 척하는 이웃, 졸졸 따라오는 강아지, 같이 걷는 친구(눈이 하나 더)
 *  - 위기 순간엔 달려갈지 참을지
 * 다음 판의 동기:
 *  - 그날의 한 장면이 폴라로이드로 남는다
 *  - 💗 누적으로 변장 도구 해금 (📰 신문지: 어디서나 2초 숨기 / 🪴 화분 모자: 멈춰 있을 때 의심 절반)
 */
import '../style.css';
import './proto.css';
import './follow.css';
import './pixel-ui.css';
import { loadPixelFont } from '../pixel/font.ts';
import { haptic, sfx } from '../ui/feedback.ts';
import { childFront, childSide, parentSide, type Look } from '../pixel/child.ts';
import { dog as dogSprite, neighbor as neighborSprite, school as schoolSprite } from '../pixel/extras.ts';
import { bubble } from '../pixel/fx.ts';
import { Grid, toDataURL } from '../pixel/grid.ts';
import { P } from '../pixel/palette.ts';
import { pole, streetTile, tree } from '../pixel/scenes.ts';
import { blit, sprite } from '../pixel/sprite-cache.ts';

export type Age = 6 | 10 | 15;
interface Tune { speed: number; look: [number, number]; tele: number; lookDur: number; fake: number; rate: number; sight: number; kid: string; label: string }
const TUNE: Record<Age, Tune> = {
  6: { speed: 56, look: [4.5, 7.5], tele: 1.0, lookDur: 1.2, fake: 0, rate: 55, sight: 330, kid: '🧒', label: '6살' },
  10: { speed: 64, look: [3.2, 5.5], tele: 0.7, lookDur: 1.5, fake: 0.18, rate: 70, sight: 360, kid: '👦', label: '10살' },
  15: { speed: 72, look: [2.2, 4.2], tele: 0.45, lookDur: 1.9, fake: 0.32, rate: 90, sight: 400, kid: '🧑', label: '15살' },
};
const ROUTE = 2400;
const LOSE_DIST = 520;
const WALK = 92;
const DASH = 320;
const COVERS = ['🌳', '🪧', '📮', '🚏', '🌲', '🗑️', '🚙', '🌳'];

interface Crisis { at: number; emoji: string; text: string; saved: string; alone: string; hurt: string; done?: boolean }
const CRISES: Record<Age, Crisis[]> = {
  6: [
    { at: 0.36, emoji: '🐕', text: '큰 개가 아이를 보고 짖는다!', saved: '"엄마아빠다!" 와락 안겼다.', alone: '울먹이다가 씩씩하게 지나갔다.', hurt: '울면서 주저앉았다…' },
    { at: 0.74, emoji: '🩹', text: '아이가 돌부리에 걸려 넘어졌다!', saved: '번쩍 안아 일으켰다. 무릎에 호~', alone: '툭툭 털고 일어났다!', hurt: '무릎이 까져서 울고 있다…' },
  ],
  10: [
    { at: 0.36, emoji: '😠', text: '형들이 아이 가방을 잡아당긴다!', saved: '"어? 왜 여기 있어?" 형들은 도망갔다.', alone: '"하지 마!" 소리치자 형들이 가 버렸다.', hurt: '가방을 뺏겼다가 겨우 찾았다…' },
    { at: 0.74, emoji: '🍦', text: '아이가 아이스크림을 떨어뜨렸다!', saved: '새로 사 줬다. 기뻐하지만 고개를 갸웃한다.', alone: '"괜찮아, 내일 먹지 뭐." 어른스럽다.', hurt: '한참을 시무룩하게 걸었다…' },
  ],
  15: [
    { at: 0.38, emoji: '💬', text: '친구와 크게 말다툼을 한다!', saved: '"…설마 미행했어?" 친구 앞에서 얼굴이 새빨개졌다.', alone: '서로 사과하고 어깨동무를 했다.', hurt: '혼자 먼저 가 버렸다. 표정이 어둡다…' },
    { at: 0.76, emoji: '🌧️', text: '갑자기 비가 쏟아진다! 우산이 없다!', saved: '우산을 내밀자 한숨. "…고마워. 근데 왜 있어."', alone: '친구 우산을 같이 쓰고 웃으며 갔다.', hurt: '홀딱 젖어서 학교에 들어갔다…' },
  ],
};

// ───────── 해금 (기기에 저장) ─────────
const SAVE_KEY = 'bento-life:proto-follow:v1';
interface Saved { total: number; best: number; runs: number }
const TOOLS = [
  { id: 'news', emoji: '📰', name: '신문지', need: 600, desc: '한 판에 한 번, 어디서든 2초 숨기' },
  { id: 'pot', emoji: '🪴', name: '화분 모자', need: 1500, desc: '멈춰 있으면 의심이 절반만 찬다' },
];
function loadSaved(): Saved { try { return { total: 0, best: 0, runs: 0, ...JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}') }; } catch { return { total: 0, best: 0, runs: 0 }; } }
function save(s: Saved) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* 저장 불가 */ } }
let saved = loadSaved();
/** 본 게임은 하트 상점에서 산 도구를 넘겨준다 (opts.tools). 맛보기는 누적 하트로 해금 */
const hasTool = (id: string) => (opts.tools ? opts.tools.includes(id) : saved.total >= TOOLS.find((t) => t.id === id)!.need);

// ───────── 상태 ─────────
type Moment = { rank: number; kind: string; text: string };
interface Watcher { x: number; state: 'walk' | 'tele' | 'look'; timer: number; next: number }
interface State {
  phase: 'intro' | 'run' | 'deliver' | 'over';
  t: number; px: number; kx: number; walking: boolean; dashTo?: number; lastMoveT: number; slow: number;
  kidState: 'walk' | 'tele' | 'look' | 'pause'; kidTimer: number; nextLook: number; fakeOut: boolean;
  sus: number; lostFor: number; score: number; nearMiss: number; covers: { x: number; e: string }[];
  crisis?: Crisis; crisisLeft: number; log: string[]; bond: number; indep: number; happy: number;
  over?: 'school' | 'caught' | 'lost'; delivered?: boolean; deliverLeft: number;
  events: { at: number; kind: 'neighbor' | 'dog' | 'friend'; done?: boolean }[];
  neighbor?: { x: number; left: number }; dog?: { left: number; bark: number }; friend?: Watcher & { left: number };
  newsLeft: number; newsUsed: boolean; heartAcc: number; moment: Moment; stepAcc: number;
}
let age: Age = 10;

/** 하루 맛보기 등에 끼워 넣을 때의 옵션 */
export interface FollowOpts {
  age: Age;
  standalone: boolean;
  /** 화면에 보일 나이 (예: 7살) — 없으면 난이도 나이 */
  label?: string;
  title?: string;
  /** 아침 도시락 기분: 좋으면 덜 돌아보고, 싫으면 자주 돌아본다 */
  mood?: 'happy' | 'neutral' | 'grumpy';
  /** 돌아보는 간격 배율 (클수록 덜 돌아봄) */
  lookMult?: number;
  /** 도시락을 두고 간 날이면 학교에서 몰래 넣기까지 */
  forgot?: boolean;
  onEnd?: (r: FollowResult) => void;
  /** 본 게임: 하트 상점에서 산 변장 도구 id (있으면 누적 해금 대신 이걸 쓴다) */
  tools?: string[];
  /** 도트 캐릭터 생김새 (없으면 나이에 맞춰 기본) */
  look?: Look;
}
export interface FollowResult { over: 'school' | 'caught' | 'lost'; delivered: boolean; score: number; nearMiss: number; log: string[]; bond: number; indep: number; happy: number; moment: string }
let opts: FollowOpts = { age: 10, standalone: true, forgot: true };
const label = () => opts.label ?? TUNE[age].label;
const kidLook = (): Look => opts.look ?? { age: age === 15 ? 15 : 7, gender: 'girl' };
const friendLook = (): Look => ({ age: kidLook().age, gender: kidLook().gender === 'girl' ? 'boy' : 'girl' });
/** 도트 한 칸 = 화면 3px. 게임 좌표(px)를 도트 칸으로 바꿀 때 나눈다 */
const S = 3;
const GROUND = 92;
let st: State;
let raf = 0;
let app: HTMLElement = document.body;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const shuffle = <T,>(a: T[]) => a.map((v) => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map(([, v]) => v);

function newRun(showIntro = true): void {
  const covers: { x: number; e: string }[] = [];
  for (let x = 200; x < ROUTE - 120; x += rnd(160, 270)) covers.push({ x, e: COVERS[Math.floor(Math.random() * COVERS.length)] });
  CRISES[age].forEach((c) => (c.done = false));
  const kinds = shuffle<'neighbor' | 'dog' | 'friend'>(['neighbor', 'dog', 'friend']);
  st = {
    phase: showIntro ? 'intro' : 'run', t: 0, px: 70, kx: 250, walking: false, lastMoveT: -9, slow: 0,
    kidState: 'walk', kidTimer: 0, nextLook: rnd(...TUNE[age].look), fakeOut: false,
    sus: 0, lostFor: 0, score: 0, nearMiss: 0, covers, crisisLeft: 0, log: [], bond: 0, indep: 0, happy: 0, deliverLeft: 0,
    events: [{ at: 0.2, kind: kinds[0] }, { at: 0.57, kind: kinds[1] }],
    newsLeft: 0, newsUsed: false, heartAcc: 0, moment: { rank: 0, kind: 'calm', text: '별일 없던 평화로운 등굣길' }, stepAcc: 0,
  };
  render();
  cancelAnimationFrame(raf);
  let last = performance.now();
  const loop = (now: number) => {
    const real = Math.min(0.05, (now - last) / 1000); last = now;
    if (st.phase === 'run' || st.phase === 'deliver') { tick(st.slow > 0 ? real * 0.3 : real, real); draw(); }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
}

const remember = (rank: number, kind: string, text: string) => { if (rank >= st.moment.rank) st.moment = { rank, kind, text }; };
const inCover = () => st.covers.some((c) => Math.abs(st.px - c.x) < 34);
const hidden = () => inCover() || st.newsLeft > 0;

/** 지금 누군가(아이·친구)가 나를 보고 있나 */
function watchedBy(): number {
  const T = TUNE[age];
  if (hidden()) return 0;
  let eyes = 0;
  if (st.kidState === 'look' && st.kx - st.px < T.sight) eyes += 1;
  if (st.friend?.state === 'look' && st.friend.x - st.px < T.sight) eyes += 0.5; // 친구는 곁눈질
  return eyes;
}

function float(text: string, cls = '') {
  const world = document.getElementById('world');
  if (!world) return;
  const el = document.createElement('span');
  el.className = `float ${cls}`;
  el.textContent = text;
  el.style.left = `${st.px}px`;
  world.append(el);
  setTimeout(() => el.remove(), 1100);
}

function tick(dt: number, real: number): void {
  const T = TUNE[age];
  st.t += dt;
  st.slow = Math.max(0, st.slow - real);
  st.newsLeft = Math.max(0, st.newsLeft - dt);

  if (st.phase === 'deliver') {
    st.deliverLeft -= real;
    if (st.deliverLeft <= 0) finishDeliver(false);
    return;
  }
  if (st.crisis) { st.crisisLeft -= real; if (st.crisisLeft <= 0) resolveCrisis(false); return; }

  // ── 부모 ──
  const moving = st.dashTo !== undefined || st.walking;
  if (st.dashTo !== undefined) {
    st.px += DASH * dt;
    if (st.px >= st.dashTo) { st.px = st.dashTo; st.dashTo = undefined; }
  } else if (st.walking) st.px += WALK * dt;
  if (moving) {
    st.lastMoveT = st.t;
    st.stepAcc += dt;
    if (st.stepAcc > (st.dashTo !== undefined ? 0.12 : 0.32)) { st.stepAcc = 0; sfx('tap'); }
  }

  // ── 아이 ──
  const lookMult = (st.dog ? 0.75 : 1) * (opts.lookMult ?? 1);
  st.kidTimer += dt;
  if (st.kidState === 'walk') {
    st.kx += T.speed * dt;
    if (st.kidTimer > st.nextLook * lookMult) {
      st.kidTimer = 0; st.fakeOut = Math.random() < T.fake;
      st.kidState = Math.random() < 0.12 ? 'pause' : 'tele';
      if (st.kidState === 'tele') haptic(8);
    }
  } else if (st.kidState === 'pause') {
    if (st.kidTimer > 1.5) { st.kidState = 'walk'; st.kidTimer = 0; st.nextLook = rnd(...T.look); }
  } else if (st.kidState === 'tele') {
    if (st.kidTimer > T.tele) {
      st.kidTimer = 0;
      if (st.fakeOut) { st.kidState = 'walk'; st.nextLook = rnd(...T.look) * 0.6; }
      else startLook();
    }
  } else if (st.kidState === 'look' && st.kidTimer > T.lookDur) { st.kidState = 'walk'; st.kidTimer = 0; st.nextLook = rnd(...T.look); }

  // ── 친구 (눈이 하나 더) ──
  if (st.friend) {
    const f = st.friend;
    f.left -= dt; f.x = st.kx + 34; f.timer += dt;
    if (f.state === 'walk' && f.timer > f.next) { f.state = 'tele'; f.timer = 0; }
    else if (f.state === 'tele' && f.timer > T.tele * 1.8) { f.state = 'look'; f.timer = 0; }
    else if (f.state === 'look' && f.timer > T.lookDur * 0.7) { f.state = 'walk'; f.timer = 0; f.next = rnd(3.5, 6); }
    if (f.left <= 0 && f.state !== 'look') { st.friend = undefined; float('👋 친구는 다른 길로', 'info'); }
  }
  // ── 강아지 ──
  if (st.dog) {
    st.dog.left -= dt; st.dog.bark -= dt;
    if (st.dog.bark <= 0) { st.dog.bark = rnd(1.6, 2.8); float('멍!', 'bark'); if (st.kx - st.px < T.sight) st.sus += 6; sfx('tap'); }
    if (st.dog.left <= 0) { st.dog = undefined; float('🐶 강아지는 집에 갔다', 'info'); }
  }
  // ── 이웃 ──
  if (st.neighbor) {
    st.neighbor.left -= real;
    if (st.neighbor.left <= 0) {
      st.neighbor = undefined;
      // 큰 소리로 아는 척 → 아이가 예고 없이 바로 돌아본다
      float('"어머~ 이게 누구야!!"', 'shout'); sfx('ding'); haptic(40);
      if (st.kx - st.px < T.sight * 1.2) { startLook(true); st.sus += 15; }
      remember(3, 'neighbor-fail', '이웃의 우렁찬 인사에 얼어붙은 순간');
      render();
    }
  }

  // ── 의심 ──
  const eyes = watchedBy();
  if (eyes > 0) {
    const gap = st.kx - st.px;
    const near = 1 + Math.max(0, (T.sight - gap) / T.sight) * 1.5;
    const still = hasTool('pot') && !moving ? 0.15 : 0.3;
    const mult = st.dashTo !== undefined ? 3.2 : moving ? 1.6 : still;
    st.sus += T.rate * near * mult * eyes * dt;
  } else if (st.kidState !== 'look') st.sus = Math.max(0, st.sus - 6 * dt);
  const gap = st.kx - st.px;
  if (gap < 26 && st.dashTo === undefined) st.sus += 120 * dt;
  st.lostFor = gap > LOSE_DIST ? st.lostFor + dt : 0;

  // ── 💗 지켜본 마음: 들키지 않고 가까울수록 빨리 ──
  if (eyes === 0 && gap < T.sight) {
    const rate = (gap < 140 ? 14 : gap < 240 ? 6 : 1.5) * (1 + (age - 6) * 0.06);
    st.score += rate * dt; st.heartAcc += rate * dt;
    if (st.heartAcc >= 10) { st.heartAcc = 0; float('💗', gap < 140 ? 'heart big' : 'heart'); }
  }

  // ── 방해꾼 등장 ──
  const ev = st.events.find((e) => !e.done && st.kx >= e.at * ROUTE);
  if (ev) {
    ev.done = true;
    if (ev.kind === 'neighbor') { st.neighbor = { x: st.px + 70, left: 1.8 }; sfx('tap'); haptic(20); }
    if (ev.kind === 'dog') { st.dog = { left: 9, bark: 1.2 }; remember(2, 'dog', '모르는 강아지가 졸졸 따라온 날'); }
    if (ev.kind === 'friend') { st.friend = { x: st.kx + 34, state: 'walk', timer: 0, next: rnd(2.5, 4), left: 10 }; float('🧑‍🤝‍🧑 친구가 합류했다!', 'info'); }
    render();
  }
  // ── 위기 ──
  const c = CRISES[age].find((x) => !x.done && st.kx >= x.at * ROUTE);
  if (c) { c.done = true; st.crisis = c; st.crisisLeft = 2.6; st.kidState = 'pause'; st.kidTimer = -99; st.walking = false; sfx('ding'); haptic(40); render(); }

  if (st.sus >= 100) end('caught');
  else if (st.lostFor > 2.2) end('lost');
  else if (st.kx >= ROUTE) {
    if (opts.forgot === false) { st.log.push('🏫 교문 안으로 들어가는 뒷모습까지 지켜봤다.'); end('school'); }
    else { st.phase = 'deliver'; st.deliverLeft = 2.2; st.walking = false; sfx('ding'); haptic(30); render(); }
  }
}

function startLook(sudden = false): void {
  st.kidState = 'look'; st.kidTimer = 0;
  sfx('tap');
  // 아슬아슬: 돌아보기 직전까지 움직이다가 숨음 → 슬로모션 + 보너스
  if (!sudden && inCover() && st.t - st.lastMoveT < 0.45) {
    st.nearMiss++; st.score += 20; st.slow = 0.7;
    float('휴~! +20💗', 'phew'); sfx('ding'); haptic(35);
    const cover = st.covers.reduce((a, c) => (Math.abs(c.x - st.px) < Math.abs(a.x - st.px) ? c : a));
    remember(2 + st.nearMiss * 0.1, 'nearmiss', `${cover.e} 뒤로 아슬아슬하게 쏙 숨은 순간`);
  }
}

function resolveCrisis(ran: boolean): void {
  const c = st.crisis!;
  st.crisis = undefined;
  st.kidState = 'walk'; st.kidTimer = 0; st.nextLook = rnd(...TUNE[age].look);
  if (ran) {
    st.dashTo = st.kx - 40;
    st.log.push(`${c.emoji} 달려갔다 — ${c.saved}`);
    st.bond += age === 6 ? 3 : age === 10 ? 1 : -2;
    st.indep -= age === 6 ? 1 : 2;
    st.score += age === 6 ? 30 : 15;
    st.sus = Math.min(99, st.sus + (age === 6 ? 0 : age === 10 ? 45 : 70));
    remember(4, 'crisis-run', `${c.emoji} 참지 못하고 뛰쳐나간 순간`);
    sfx('pop'); haptic(20);
  } else {
    const handled = Math.random() < 0.3 + age * 0.03;
    st.log.push(`${c.emoji} 참았다 — ${handled ? c.alone : c.hurt}`);
    if (handled) { st.indep += 3; st.happy += 1; st.score += 20; remember(3, 'crisis-alone', `${c.emoji} 혼자 해내는 걸 숨어서 지켜본 순간`); }
    else { st.happy -= 2; st.bond -= 1; remember(3, 'crisis-hurt', `${c.emoji} 뛰어나가고 싶은 걸 꾹 참은 순간`); }
    sfx(handled ? 'ding' : 'tap');
  }
  render();
}

function finishDeliver(ok: boolean): void {
  const near = st.kx - st.px < 320;
  st.delivered = ok && near;
  if (st.delivered) { st.score += 40; remember(st.moment.rank > 2 ? st.moment.rank : 2.5, st.moment.rank > 2 ? st.moment.kind : 'deliver', st.moment.rank > 2 ? st.moment.text : '사물함에 도시락을 몰래 쏙 넣은 순간'); }
  st.log.push(st.delivered ? '🍱 사물함에 몰래 쏙! 아이는 점심에 깜짝 놀랐다.' : near ? '🍱 머뭇거리다 타이밍을 놓쳤다. 도시락은 교무실에 맡겼다.' : '🍱 너무 멀어서 못 넣었다. 도시락은 교무실에 맡겼다.');
  end('school');
}

function end(how: 'school' | 'caught' | 'lost'): void {
  st.over = how; st.phase = 'over'; st.walking = false;
  if (how === 'school') { st.bond += 1; st.indep += 1; }
  if (how === 'caught') { st.bond -= 2; st.indep -= 2; st.happy -= 1; st.score *= 0.5; remember(5, 'caught', '결국 딱 걸린 순간'); }
  if (how === 'lost') { st.indep += 1; remember(1.5, 'lost', '아이를 놓치고 두리번거린 순간'); }
  st.score = Math.round(st.score);
  const before = saved.total;
  saved = { total: saved.total + st.score, best: Math.max(saved.best, st.score), runs: saved.runs + 1 };
  save(saved);
  const unlocked = opts.tools ? [] : TOOLS.filter((t) => before < t.need && saved.total >= t.need);
  if (unlocked.length) st.log.push(...unlocked.map((t) => `🎁 새 변장 도구: ${t.emoji} ${t.name} — ${t.desc}`));
  sfx(how === 'school' ? 'chime' : 'tap'); haptic(how === 'caught' ? 60 : 20);
  render();
}

// ───────── 화면 ─────────
function render(): void {
  const T = TUNE[age];
  app.innerHTML = `
  <div class="proto follow">
    ${opts.standalone ? `<header class="proto-top">
      <h1>졸졸 따라가기</h1>
      <div class="age-pick">${([6, 10, 15] as Age[]).map((a) => `<button class="${a === age ? 'on' : ''}" data-age="${a}">${TUNE[a].label}</button>`).join('')}</div>
    </header>` : `<header class="proto-top"><h1>${opts.title ?? '등굣길'}</h1><span class="mood-tag">${opts.mood === 'happy' ? '🎵 기분 좋음' : opts.mood === 'grumpy' ? '😤 툴툴' : '😐 보통'}</span></header>`}
    <div class="hud-meters">
      <div class="meter"><span>👀 의심</span><div class="bar"><i id="sus" class="low"></i></div></div>
      <div class="meter"><span>🏫</span><div class="bar"><i id="prog" class="high"></i></div></div>
      <div class="score-badge">💗 <b id="score">0</b></div>
    </div>
    <div class="street" id="street">
      <canvas id="streetc"></canvas>
      <div class="world" id="world">
        ${st.dog ? '<button class="sprite dog hit" data-tap="dog" id="dog" aria-label="강아지에게 간식"></button>' : ''}
        ${st.neighbor ? `<button class="sprite neighbor hit" data-tap="neighbor" style="left:${st.neighbor.x}px" aria-label="이웃에게 쉿"><span class="say">어머~?! <b>쉿!</b></span></button>` : ''}
      </div>
      <div class="gap-warn" id="warn"></div>
      <div class="slowmo" id="slowmo"></div>
    </div>
    <div class="controls">
      <p class="tip">꾹 = 걷기 · <b>두 번 톡</b> = 다음 숨을 곳까지 후다닥 · <b>가까울수록 💗</b></p>
      <div class="control-row">
        ${hasTool('news') ? `<button class="tool-btn" data-act="news" ${st.newsUsed ? 'disabled' : ''}>📰</button>` : ''}
        <button class="hold" id="hold">👣 꾹 / 톡톡</button>
      </div>
    </div>
    ${st.phase === 'intro' ? introCard() : ''}
    ${st.crisis ? `
    <div class="crisis">
      <div class="crisis-card">
        <div class="crisis-emoji">${st.crisis.emoji}</div>
        <p>${st.crisis.text}</p>
        <div class="crisis-time"><i id="ctime"></i></div>
        <div class="row"><button class="btn primary" data-act="run">달려가기!</button><button class="btn paper" data-act="wait">참는다</button></div>
      </div>
    </div>` : ''}
    ${st.phase === 'deliver' ? `
    <div class="crisis">
      <div class="crisis-card">
        <div class="crisis-emoji">🏫🍱</div>
        <p>교실에 들어갔다! 지금이야!</p>
        <div class="crisis-time"><i id="ctime"></i></div>
        <button class="btn primary wide big-tap" data-act="deliver">🤫 사물함에 몰래 쏙!</button>
      </div>
    </div>` : ''}
    ${st.phase === 'over' ? resultCard() : ''}
  </div>`;
  draw();
}

function introCard(): string {
  const next = TOOLS.find((t) => saved.total < t.need);
  const moodLine = opts.mood === 'happy' ? '아침 도시락이 마음에 들었는지 콧노래를 부르며 간다. (덜 돌아본다)'
    : opts.mood === 'grumpy' ? '아침 도시락 때문에 툴툴대며 나갔다. (자주 돌아본다)' : '';
  return `
  <div class="overlay-card">
    <article class="diary">
      <div class="diary-date">${label()} · 아침 8시</div>
      <h2>${opts.forgot === false ? '🔭 몰래 따라가 보자' : '🍱 도시락을 두고 갔다!'}</h2>
      <p class="story center">${opts.forgot === false ? '도시락은 잘 챙겨 갔다.<br>들키지 말고 <b>교문까지</b> 지켜보자.' : '들키지 말고 따라가서<br><b>학교 사물함에 몰래</b> 넣어 주자.'}</p>
      ${moodLine ? `<p class="omen">${moodLine}</p>` : ''}
      <ul class="result-list">
        <li>👣 꾹 누르면 걷고, 떼면 멈춰요</li>
        <li>👀 아이가 "…?" 하면 곧 돌아봐요 — 숨을 곳 뒤에서 멈추기</li>
        <li>⚡ 두 번 톡 치면 다음 숨을 곳까지 후다닥 (뛰다 걸리면 큰일)</li>
        <li>💗 들키지 않고 <b>가까이</b> 있을수록 빨리 쌓여요</li>
      </ul>
      ${opts.standalone ? `<div class="pick-row"><span>누구를 따라갈까?</span><div class="age-pick">${([6, 10, 15] as Age[]).map((a) => `<button class="${a === age ? 'on' : ''}" data-age="${a}">${TUNE[a].label}</button>`).join('')}</div></div>` : ''}
      ${opts.tools ? `<p class="sub center">${opts.tools.length ? `가져온 변장 도구 ${TOOLS.filter((t) => opts.tools!.includes(t.id)).map((t) => t.emoji).join(' ')}` : '변장 도구는 ♥ 하트 상점에서'}</p>` : `<p class="sub center">누적 💗 ${saved.total}${next ? ` · 다음 변장 도구 ${next.emoji}까지 ${next.need - saved.total}` : ' · 변장 도구 모두 해금!'}</p>`}
      <button class="btn primary wide" data-act="start">출발!</button>
    </article>
  </div>`;
}

/** 그날의 한 장면을 도트로 조립한 폴라로이드 */
function polaroid(): string {
  const k = st.moment.kind;
  const g = new Grid(64, 46).rect(0, 0, 64, 30, P.sky).rect(0, 30, 64, 16, P.grass).hline(0, 63, 30, P.grassDark).rect(0, 38, 64, 8, P.road);
  const kid = kidLook();
  const put = (src: Grid, x: number) => g.draw(src, x, 44 - src.h);
  if (k === 'caught') { put(parentSide(2), 14); put(childFront(kid, 'yuck'), 32); }
  else if (k === 'nearmiss') { put(parentSide(0), 10); put(tree(), 6); put(childFront(kid, 'surprise'), 36); }
  else if (k === 'neighbor-fail' || k === 'neighbor-ok') { put(neighborSprite(), 8); put(childFront(kid, k === 'neighbor-ok' ? 'neutral' : 'surprise'), 34); }
  else if (k === 'dog') { put(dogSprite(0), 10); put(childSide(kid, 2), 34); }
  else if (k === 'deliver') { put(schoolSprite(), -4); put(childFront(kid, 'happy'), 38); }
  else if (k === 'crisis-run') { put(parentSide(4), 18); put(childFront(kid, 'happy'), 32); }
  else if (k === 'crisis-alone') { put(tree(), 4); put(childFront(kid, 'happy'), 34); }
  else if (k === 'crisis-hurt') { put(tree(), 4); put(childFront(kid, 'sad'), 34); }
  else if (k === 'lost') { put(parentSide(0), 26); }
  else { put(childSide(kid, 1), 22); }
  return `<figure class="polaroid"><img class="p-img" src="${toDataURL(g, 3)}" alt=""><figcaption>${st.moment.text}</figcaption></figure>`;
}

function resultCard(): string {
  const title = st.over === 'school' ? (st.delivered ? '🍱 몰래 배달 성공!' : opts.forgot === false ? '🏫 끝까지 지켜봤다' : '🏫 학교 도착') : st.over === 'caught' ? '😳 들켰다!' : '💨 놓쳤다…';
  const line = st.over === 'caught'
    ? (age === 15 ? '"진짜 미쳤어? 따라오지 말라고 했잖아!"' : age === 10 ? '"…왜 계속 따라와? 창피해."' : '"어! 엄마아빠다!" (기뻐하지만 혼자 가는 연습은 못 했다)')
    : st.over === 'lost' ? '아이는 혼자 학교에 갔다. 무슨 일이 있었는지는 모른다.' : st.delivered ? '점심시간, 사물함을 연 아이가 갸웃했다. "어? 내 도시락이 왜 여기…?"' : '아이는 끝까지 몰랐다.';
  const fx = [['💞 유대감', st.bond], ['🦋 자립심', st.indep], ['😊 행복', st.happy]].filter(([, v]) => v)
    .map(([k, v]) => `<span class="chip ${(v as number) > 0 ? 'up' : 'down'}">${k} ${(v as number) > 0 ? '+' : ''}${v}</span>`).join('');
  const next = TOOLS.find((t) => saved.total < t.need);
  return `
  <div class="overlay-card">
    <article class="diary">
      <div class="diary-date">${label()} 등굣길 · 오늘의 한 장</div>
      <h2>${title}</h2>
      ${polaroid()}
      <div class="score-line">💗 <b>${st.score}</b>${st.score >= saved.best && saved.runs > 1 ? ' <span class="new">최고 기록!</span>' : ''}${st.nearMiss ? ` · 휴~ ${st.nearMiss}번` : ''}</div>
      <p class="story center">${line}</p>
      <ul class="result-list">${st.log.map((l) => `<li>${l}</li>`).join('')}</ul>
      <div class="chips">${fx}</div>
      ${opts.tools ? '' : `<p class="sub center">누적 💗 ${saved.total}${next ? ` · ${next.emoji} ${next.name}까지 ${next.need - saved.total}` : ''}</p>`}
      ${opts.standalone ? `<div class="row"><button class="btn primary" data-act="again">다시</button>${age !== 15 ? `<button class="btn paper" data-age="${age === 6 ? 10 : 15}">더 큰 아이로</button>` : ''}</div>` : '<button class="btn primary wide" data-act="evening">🌙 저녁으로</button>'}
    </article>
  </div>`;
}

function draw(): void {
  const street = document.getElementById('street');
  const canvas = document.getElementById('streetc') as HTMLCanvasElement | null;
  const world = document.getElementById('world');
  if (!street || !canvas || !world) return;
  const w = street.clientWidth;
  // 화면 높이에 맞춰 하늘을 늘린다 (아래 조작 영역 약 170px을 남기고)
  const avail = window.innerHeight - street.getBoundingClientRect().top - 176;
  const LW = Math.ceil(w / S), LH = Math.max(100, Math.min(128, Math.floor(avail / S)));
  if (canvas.width !== LW || canvas.height !== LH) { canvas.width = LW; canvas.height = LH; canvas.style.width = `${LW * S}px`; canvas.style.height = `${LH * S}px`; }
  const Y = LH - 100, G = GROUND + Y;
  const cam = Math.max(0, st.px - w * 0.28);
  world.style.transform = `translateX(${-cam}px)`;
  const ctx = canvas.getContext('2d')!;
  const cx = (x: number) => x / S - cam / S;
  ctx.fillStyle = P.sky; ctx.fillRect(0, 0, LW, LH);
  ctx.drawImage(sprite(`street-${ROUTE}`, () => streetTile(Math.ceil((ROUTE + 800) / S))), -Math.round(cam / S), Y);
  const sch = sprite('school', schoolSprite);
  blit(ctx, sch, cx(ROUTE) - 10, G - sch.height);
  // 부모 (숨을 곳보다 먼저 그려서 가려지게)
  const moving = st.walking || st.dashTo !== undefined;
  const pf = Math.floor(st.px / 7) % 8;
  const par = sprite(`parent-${pf}-${st.dashTo !== undefined}`, () => parentSide(pf, { dash: st.dashTo !== undefined }));
  const hid = hidden();
  blit(ctx, par, cx(st.px) - 10, G - par.height, hid ? 0.5 : 1);
  if (hasTool('pot')) blit(ctx, sprite('pot', potHat), cx(st.px) - 5, G - par.height - 5, hid ? 0.5 : 1);
  for (const c of st.covers) {
    const cov = c.e === '🌳' || c.e === '🌲' ? sprite('tree', tree) : sprite('pole', pole);
    blit(ctx, cov, cx(c.x) - cov.width / 2, G - cov.height);
  }
  if (st.newsLeft > 0) blit(ctx, sprite('news', newspaper), cx(st.px) - 9, G - 40);
  // 아이 (걸음 프레임은 실제로 간 거리에 맞춰 넘어간다 → 미끄러지지 않음)
  const kid = kidLook();
  const looking = st.kidState === 'look';
  const seen = watchedBy() > 0;
  const kf = Math.floor(st.kx / 7) % 8;
  const kidS = looking ? sprite(`kf-${kid.age}${kid.gender}-${seen}`, () => childFront(kid, seen ? 'surprise' : 'neutral'))
    : sprite(`ks-${kid.age}${kid.gender}-${kf}`, () => childSide(kid, kf));
  const kx = cx(st.kx) - 12, ky = G - kidS.height;
  blit(ctx, kidS, kx, ky);
  const mark = st.kidState === 'tele' ? '…' : looking ? (seen ? '!' : '…') : opts.mood === 'happy' && Math.floor(st.t) % 3 === 0 && !st.crisis ? '♪' : null;
  if (mark) bubble(ctx, Math.round(kx + 7), ky - 13, 1, mark);
  if (st.friend) {
    const fl = friendLook();
    const fLook = st.friend.state === 'look';
    const ff = Math.floor(st.friend.x / 7) % 8;
    const fs = fLook ? sprite(`ff-${fl.age}${fl.gender}`, () => childFront(fl, 'neutral', { outfit: 'berry', plain: true })) : sprite(`fs-${fl.age}${fl.gender}-${ff}`, () => childSide(fl, ff, 'neutral', { outfit: 'berry', plain: true }));
    blit(ctx, fs, cx(st.friend.x) - 12, G - fs.height);
    if (st.friend.state !== 'walk') bubble(ctx, Math.round(cx(st.friend.x) - 5), G - fs.height - 13, 1, fLook && seen ? '!' : '…');
  }
  if (st.dog) {
    const d = sprite(`dog-${Math.floor(st.t * 6) % 2}`, () => dogSprite(Math.floor(st.t * 6) % 2));
    blit(ctx, d, cx(st.px - 44) - 10, G - d.height);
    const btn = document.getElementById('dog');
    if (btn) btn.style.left = `${st.px - 44 - 30}px`;
  }
  if (st.neighbor) { const n = sprite('neighbor', neighborSprite); blit(ctx, n, cx(st.neighbor.x) - 11, G - n.height); }
  void moving;
  (document.getElementById('sus') as HTMLElement).style.width = `${Math.min(100, st.sus)}%`;
  (document.getElementById('prog') as HTMLElement).style.width = `${Math.min(100, (st.kx / ROUTE) * 100)}%`;
  document.getElementById('score')!.textContent = String(Math.round(st.score));
  const gap = st.kx - st.px;
  document.getElementById('warn')!.textContent = gap > LOSE_DIST * 0.8 ? '너무 멀어요! 놓치겠어요' : gap < 60 ? '너무 가까워요!' : gap < 140 && watchedBy() === 0 ? '♥♥ 딱 좋은 거리' : '';
  document.getElementById('slowmo')!.className = `slowmo ${st.slow > 0 ? 'on' : ''}`;
  const ct = document.getElementById('ctime');
  if (ct && st.crisis) ct.style.width = `${(st.crisisLeft / 2.6) * 100}%`;
  if (ct && st.phase === 'deliver') ct.style.width = `${(st.deliverLeft / 2.2) * 100}%`;
}

function potHat(): Grid {
  const g = new Grid(12, 9).rect(2, 4, 8, 5, P.tomato).hline(1, 10, 4, P.tomatoDark).set(5, 2, P.green).set(6, 1, P.green).set(7, 2, P.green).vline(6, 2, 3, P.greenDark);
  return g.outline(P.ink);
}
function newspaper(): Grid {
  const g = new Grid(20, 28).rect(0, 0, 20, 28, P.cream);
  for (let y = 3; y < 26; y += 3) g.hline(2, 17, y, P.greyDark);
  g.rect(2, 3, 8, 6, P.grey);
  return g.outline(P.ink);
}

// ───────── 입력 ─────────
let lastTap = 0;
function dash(): void {
  const next = st.covers.find((c) => c.x > st.px + 40 && c.x < st.px + 320);
  st.dashTo = next ? next.x : st.px + 120;
  sfx('pop'); haptic(10);
}
const setWalk = (v: boolean) => { if (st && st.phase === 'run' && !st.crisis) st.walking = v; document.getElementById('hold')?.classList.toggle('down', v); };
let bound = false;
/** 지금 화면에 따라가기가 떠 있는지 (하루 맛보기에서 다른 화면일 땐 입력을 무시) */
let active = false;
function bindOnce(): void {
  if (bound) return;
  bound = true;
  app.addEventListener('pointerdown', (e) => { if (!active) return;
    const t = e.target as HTMLElement;
    const tap = t.closest<HTMLElement>('[data-tap]');
    if (tap) {
      e.preventDefault();
      if (tap.dataset.tap === 'neighbor' && st.neighbor) {
        st.neighbor = undefined; st.score += 10; float('🤫 쉿! +10💗', 'phew'); sfx('pop'); haptic(15);
        remember(2.5, 'neighbor-ok', '이웃 입을 손가락 하나로 막은 순간'); render();
      } else if (tap.dataset.tap === 'dog' && st.dog) {
        st.dog = undefined; float('🦴 간식 주고 보냄', 'info'); sfx('pop'); render();
      }
      return;
    }
    if (t.closest('#hold') || t.closest('#street')) {
      e.preventDefault();
      const now = performance.now();
      if (st.phase === 'run' && !st.crisis && now - lastTap < 300) dash();
      lastTap = now;
      setWalk(true);
    }
  });
  window.addEventListener('pointerup', () => setWalk(false));
  window.addEventListener('pointercancel', () => setWalk(false));
  window.addEventListener('keydown', (e) => { if (!active) return; if (e.code === 'Space' && !e.repeat) { e.preventDefault(); setWalk(true); } if (e.code === 'ArrowRight' && st.phase === 'run') dash(); });
  window.addEventListener('keyup', (e) => { if (e.code === 'Space') setWalk(false); });
  app.addEventListener('click', (e) => { if (!active) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act],[data-age]');
    if (!el) return;
    if (el.dataset.age) { age = Number(el.dataset.age) as Age; newRun(); return; }
    const act = el.dataset.act;
    if (act === 'start') { st.phase = 'run'; sfx('tap'); render(); }
    else if (act === 'run' && st.crisis) resolveCrisis(true);
    else if (act === 'wait' && st.crisis) resolveCrisis(false);
    else if (act === 'deliver' && st.phase === 'deliver') { sfx('chime'); haptic(30); finishDeliver(true); }
    else if (act === 'news' && !st.newsUsed && st.phase === 'run') { st.newsUsed = true; st.newsLeft = 2; float('📰 바스락', 'info'); sfx('pop'); render(); }
    else if (act === 'again') newRun(false);
    else if (act === 'evening') opts.onEnd?.(result());
  });
}

// 자동 테스트용 (게임 진행에는 영향 없음)
(window as unknown as { __follow: () => State }).__follow = () => st;

const result = (): FollowResult => ({
  over: st.over!, delivered: !!st.delivered, score: st.score, nearMiss: st.nearMiss, log: st.log,
  bond: st.bond, indep: st.indep, happy: st.happy, moment: st.moment.text,
});

/** 화면(root)에 따라가기 한 판을 띄운다 */
export function mountFollow(root: HTMLElement, o: FollowOpts): void {
  app = root;
  app.classList.add('pixel-ui');
  loadPixelFont();
  opts = o;
  age = o.age;
  saved = loadSaved();
  active = true;
  bindOnce();
  newRun(true);
}

/** 다른 화면으로 넘어갈 때 애니메이션 정지 */
export function unmountFollow(): void { cancelAnimationFrame(raf); active = false; if (st) st.walking = false; }
