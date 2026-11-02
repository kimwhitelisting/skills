/**
 * 맛보기 B — 졸졸 따라가기
 * 꾹 누르면 걷고, 떼면 멈춘다. 아이가 뒤돌아볼 때 숨을 곳(나무·전봇대…) 뒤에 있지 않으면 의심 게이지가 찬다.
 * 너무 멀어지면 놓치고, 너무 가까우면 부딪혀 들킨다. 위기 순간엔 "달려가기"로 도와줄지, 참을지 고른다.
 */
import '../style.css';
import './proto.css';
import './follow.css';
import { haptic, sfx } from '../ui/feedback.ts';

type Age = 6 | 10 | 15;
interface Tune { speed: number; look: [number, number]; tele: number; lookDur: number; fake: number; rate: number; sight: number; kid: string; label: string }
const TUNE: Record<Age, Tune> = {
  6: { speed: 52, look: [4.5, 7.5], tele: 1.0, lookDur: 1.2, fake: 0, rate: 55, sight: 330, kid: '🧒', label: '6살' },
  10: { speed: 62, look: [3.2, 5.5], tele: 0.7, lookDur: 1.5, fake: 0.18, rate: 70, sight: 360, kid: '👦', label: '10살' },
  15: { speed: 70, look: [2.2, 4.2], tele: 0.45, lookDur: 1.9, fake: 0.32, rate: 90, sight: 400, kid: '🧑', label: '15살' },
};
const ROUTE = 2600;
const LOSE_DIST = 520;
const WALK = 92;
const COVERS = ['🌳', '🪧', '📮', '🚏', '🌲', '🗑️', '🚙', '🌳'];

interface Crisis { at: number; emoji: string; text: string; saved: Record<Age, string>; alone: string; hurt: string; done?: boolean }
const CRISES: Record<Age, Crisis[]> = {
  6: [
    { at: 0.33, emoji: '🐕', text: '큰 개가 아이를 보고 짖는다!', saved: { 6: '"엄마아빠다!" 와락 안겼다.', 10: '', 15: '' }, alone: '울먹이다가 씩씩하게 지나갔다.', hurt: '울면서 주저앉았다…' },
    { at: 0.68, emoji: '🩹', text: '아이가 돌부리에 걸려 넘어졌다!', saved: { 6: '번쩍 안아 일으켰다. 무릎에 호~', 10: '', 15: '' }, alone: '툭툭 털고 일어났다!', hurt: '무릎이 까져서 울고 있다…' },
  ],
  10: [
    { at: 0.33, emoji: '😠', text: '형들이 아이 가방을 잡아당긴다!', saved: { 6: '', 10: '"어? 왜 여기 있어?" 형들은 도망갔다.', 15: '' }, alone: '"하지 마!" 소리치자 형들이 가 버렸다.', hurt: '가방을 뺏겼다가 겨우 찾았다…' },
    { at: 0.7, emoji: '🍦', text: '아이가 아이스크림을 떨어뜨렸다!', saved: { 6: '', 10: '새로 사 줬다. 기뻐하지만 고개를 갸웃한다.', 15: '' }, alone: '"괜찮아, 내일 먹지 뭐." 어른스럽다.', hurt: '한참을 시무룩하게 걸었다…' },
  ],
  15: [
    { at: 0.35, emoji: '💬', text: '친구와 크게 말다툼을 한다!', saved: { 6: '', 10: '', 15: '"…설마 미행했어?" 친구 앞에서 얼굴이 새빨개졌다.' }, alone: '서로 사과하고 어깨동무를 했다.', hurt: '혼자 먼저 가 버렸다. 표정이 어둡다…' },
    { at: 0.72, emoji: '🌧️', text: '갑자기 비가 쏟아진다! 우산이 없다!', saved: { 6: '', 10: '', 15: '우산을 내밀자 한숨. "…고마워. 근데 왜 있어."' }, alone: '친구 우산을 같이 쓰고 웃으며 갔다.', hurt: '홀딱 젖어서 학교에 들어갔다…' },
  ],
};

const app = document.getElementById('app')!;
let age: Age = 10;
let raf = 0;

interface State {
  t: number; px: number; kx: number; walking: boolean; dashTo?: number;
  kidState: 'walk' | 'tele' | 'look' | 'pause'; kidTimer: number; nextLook: number; fakeOut: boolean;
  sus: number; lostFor: number; nearMiss: number; covers: { x: number; e: string }[];
  crisis?: Crisis; crisisLeft: number; log: string[]; bond: number; indep: number; happy: number; over?: 'school' | 'caught' | 'lost';
}
let st: State;

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function newRun(): void {
  const covers: { x: number; e: string }[] = [];
  for (let x = 180; x < ROUTE - 100; x += rnd(170, 290)) covers.push({ x, e: COVERS[Math.floor(Math.random() * COVERS.length)] });
  CRISES[age].forEach((c) => (c.done = false));
  st = { t: 0, px: 70, kx: 250, walking: false, kidState: 'walk', kidTimer: 0, nextLook: rnd(...TUNE[age].look), fakeOut: false,
    sus: 0, lostFor: 0, nearMiss: 0, covers, crisisLeft: 0, log: [], bond: 0, indep: 0, happy: 0 };
  render();
  cancelAnimationFrame(raf);
  let last = performance.now();
  const loop = (now: number) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; tick(dt); draw(); if (!st.over) raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);
}

const hidden = () => st.covers.some((c) => Math.abs(st.px - c.x) < 34);

function tick(dt: number): void {
  const T = TUNE[age];
  st.t += dt;
  // ── 위기 순간: 시간이 잠깐 느려진다 ──
  if (st.crisis) {
    st.crisisLeft -= dt;
    if (st.crisisLeft <= 0) resolveCrisis(false);
    return;
  }
  // ── 부모 이동 ──
  if (st.dashTo !== undefined) {
    st.px += 340 * dt;
    if (st.px >= st.dashTo) { st.px = st.dashTo; st.dashTo = undefined; }
  } else if (st.walking) st.px += WALK * dt;
  // ── 아이 ──
  st.kidTimer += dt;
  if (st.kidState === 'walk') {
    st.kx += T.speed * dt;
    if (st.kidTimer > st.nextLook) {
      st.kidState = 'tele'; st.kidTimer = 0; st.fakeOut = Math.random() < T.fake;
      if (Math.random() < 0.15) { st.kidState = 'pause'; } // 신발끈 묶기 — 갑자기 멈춤
    }
  } else if (st.kidState === 'pause') {
    if (st.kidTimer > 1.6) { st.kidState = 'walk'; st.kidTimer = 0; st.nextLook = rnd(...T.look); }
  } else if (st.kidState === 'tele') {
    if (st.kidTimer > T.tele) {
      st.kidTimer = 0;
      if (st.fakeOut) { st.kidState = 'walk'; st.nextLook = rnd(...T.look) * 0.6; }
      else { st.kidState = 'look'; sfx('tap'); }
    }
  } else if (st.kidState === 'look') {
    const dist = st.kx - st.px;
    if (dist < T.sight && !hidden()) {
      const near = 1 + Math.max(0, (T.sight - dist) / T.sight) * 1.5;
      // 무궁화 꽃이 피었습니다: 움직이다 걸리면 크게, 가만히 서 있으면 조금 의심한다
      st.sus += T.rate * near * (st.walking ? 1.6 : 0.3) * dt;
      if (st.sus > 30 && st.kidTimer < dt * 2) st.nearMiss++;
    }
    if (st.kidTimer > T.lookDur) { st.kidState = 'walk'; st.kidTimer = 0; st.nextLook = rnd(...T.look); }
  }
  // 의심은 천천히 식는다
  if (st.kidState !== 'look') st.sus = Math.max(0, st.sus - 6 * dt);
  // 너무 가까우면 부딪힌다
  const gap = st.kx - st.px;
  if (gap < 26 && st.dashTo === undefined) st.sus += 120 * dt;
  // 너무 멀면 놓친다
  st.lostFor = gap > LOSE_DIST ? st.lostFor + dt : 0;
  // 위기 발생
  const c = CRISES[age].find((x) => !x.done && st.kx >= x.at * ROUTE);
  if (c) { c.done = true; st.crisis = c; st.crisisLeft = 2.6; st.kidState = 'pause'; st.kidTimer = -99; sfx('ding'); haptic(40); render(); }
  // 끝
  if (st.sus >= 100) end('caught');
  else if (st.lostFor > 2.2) end('lost');
  else if (st.kx >= ROUTE) end('school');
}

function resolveCrisis(ran: boolean): void {
  const c = st.crisis!;
  st.crisis = undefined;
  st.kidState = 'walk'; st.kidTimer = 0; st.nextLook = rnd(...TUNE[age].look);
  if (ran) {
    st.dashTo = st.kx - 40;
    st.log.push(`${c.emoji} 달려갔다 — ${c.saved[age]}`);
    st.bond += age === 6 ? 3 : age === 10 ? 1 : -2;
    st.indep -= age === 6 ? 1 : 2;
    st.sus = Math.min(99, st.sus + (age === 6 ? 0 : age === 10 ? 45 : 70));
    sfx('pop'); haptic(20);
  } else {
    const handled = Math.random() < 0.3 + age * 0.03;
    st.log.push(`${c.emoji} 참았다 — ${handled ? c.alone : c.hurt}`);
    if (handled) { st.indep += 3; st.happy += 1; } else { st.happy -= 2; st.bond -= 1; }
    sfx(handled ? 'ding' : 'tap');
  }
  render();
}

function end(how: 'school' | 'caught' | 'lost'): void {
  st.over = how;
  if (how === 'school') { st.bond += 1; st.indep += 1; }
  if (how === 'caught') { st.bond -= 2; st.indep -= 2; st.happy -= 1; }
  if (how === 'lost') { st.indep += 1; }
  sfx(how === 'school' ? 'chime' : 'tap'); haptic(how === 'caught' ? 60 : 20);
  render();
}

// ───────── 화면 ─────────
function render(): void {
  const T = TUNE[age];
  app.innerHTML = `
  <div class="proto follow">
    <header class="proto-top">
      <h1>졸졸 따라가기</h1>
      <div class="age-pick">${([6, 10, 15] as Age[]).map((a) => `<button class="${a === age ? 'on' : ''}" data-age="${a}">${TUNE[a].label}</button>`).join('')}</div>
    </header>
    <div class="hud-meters">
      <div class="meter"><span>👀 의심</span><div class="bar"><i id="sus" class="low"></i></div></div>
      <div class="meter"><span>🏫 학교까지</span><div class="bar"><i id="prog" class="high"></i></div></div>
    </div>
    <div class="street" id="street">
      <div class="sky"></div>
      <div class="world" id="world">
        <div class="houses"></div>
        ${st.covers.map((c) => `<span class="cover" style="left:${c.x - 28}px">${c.e}</span>`).join('')}
        <span class="school" style="left:${ROUTE - 10}px">🏫</span>
        <div class="kid-walker" id="kid"><span class="kid-bubble" id="kb"></span><span class="kid-emoji">${T.kid}</span><span class="pack">🎒</span></div>
        <div class="parent" id="parent"><i class="head"></i><i class="body"></i><span class="bag">🍱</span></div>
      </div>
      <div class="gap-warn" id="warn"></div>
    </div>
    <div class="controls">
      <p class="tip">${st.crisis ? '' : '꾹 누르면 걷고, 떼면 멈춰요. 아이가 <b>뒤돌아보면</b> 나무나 전봇대 뒤에서 멈춰 있기!'}</p>
      <button class="hold" id="hold">👣 꾹 눌러서 걷기</button>
    </div>
    ${st.crisis ? `
    <div class="crisis">
      <div class="crisis-card">
        <div class="crisis-emoji">${st.crisis.emoji}</div>
        <p>${st.crisis.text}</p>
        <div class="crisis-time"><i id="ctime"></i></div>
        <div class="row"><button class="btn primary" data-act="run">달려가기!</button><button class="btn paper" data-act="wait">참는다</button></div>
      </div>
    </div>` : ''}
    ${st.over ? resultCard() : ''}
  </div>`;
  draw();
}

function resultCard(): string {
  const title = st.over === 'school' ? '🏫 무사히 학교 도착!' : st.over === 'caught' ? '😳 들켰다!' : '💨 놓쳤다…';
  const line = st.over === 'caught'
    ? (age === 15 ? '"진짜 미쳤어? 따라오지 말라고 했잖아!"' : age === 10 ? '"…왜 계속 따라와? 창피해."' : '"어! 엄마아빠다!" (기뻐하지만 혼자 가는 연습은 못 했다)')
    : st.over === 'lost' ? '아이는 혼자 학교에 갔다. 무슨 일이 있었는지는 모른다.' : '아이는 끝까지 몰랐다. 도시락은 몰래 사물함에.';
  const stars = st.over === 'school' ? (st.sus < 30 ? 3 : st.sus < 65 ? 2 : 1) : st.over === 'lost' ? 1 : 0;
  const fx = [['💞 유대감', st.bond], ['🦋 자립심', st.indep], ['😊 행복', st.happy]].filter(([, v]) => v)
    .map(([k, v]) => `<span class="chip ${(v as number) > 0 ? 'up' : 'down'}">${k} ${(v as number) > 0 ? '+' : ''}${v}</span>`).join('');
  return `
  <div class="overlay-card">
    <article class="diary">
      <div class="diary-date">${TUNE[age].label} 등굣길</div>
      <h2>${title}</h2>
      <div class="stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      <p class="story center">${line}</p>
      <ul class="result-list">${st.log.map((l) => `<li>${l}</li>`).join('') || '<li>별일 없는 등굣길이었다.</li>'}<li>아슬아슬했던 순간: ${st.nearMiss}번</li></ul>
      <div class="chips">${fx}</div>
      <div class="row"><button class="btn primary" data-act="again">다시</button>${age !== 15 ? `<button class="btn paper" data-age="${age === 6 ? 10 : 15}">더 큰 아이로</button>` : ''}</div>
    </article>
  </div>`;
}

function draw(): void {
  const T = TUNE[age];
  const world = document.getElementById('world');
  const street = document.getElementById('street');
  if (!world || !street) return;
  const w = street.clientWidth;
  const cam = Math.max(0, st.px - w * 0.28);
  world.style.transform = `translateX(${-cam}px)`;
  const kid = document.getElementById('kid')!;
  const parent = document.getElementById('parent')!;
  const looking = st.kidState === 'look';
  kid.style.left = `${st.kx}px`;
  kid.className = `kid-walker ${looking ? 'looking' : ''} ${st.kidState === 'walk' ? 'stepping' : ''}`;
  const kb = document.getElementById('kb')!;
  kb.textContent = st.kidState === 'tele' ? '…?' : looking ? '👀' : st.kidState === 'pause' && !st.crisis ? '🎀' : '';
  parent.style.left = `${st.px}px`;
  parent.className = `parent ${hidden() ? 'hidden' : ''} ${st.walking || st.dashTo !== undefined ? 'stepping' : ''} ${looking && !hidden() && st.kx - st.px < T.sight ? 'seen' : ''}`;
  const sus = document.getElementById('sus');
  if (sus) sus.style.width = `${Math.min(100, st.sus)}%`;
  const prog = document.getElementById('prog');
  if (prog) prog.style.width = `${Math.min(100, (st.kx / ROUTE) * 100)}%`;
  const warn = document.getElementById('warn')!;
  const gap = st.kx - st.px;
  warn.textContent = gap > LOSE_DIST * 0.8 ? '💨 너무 멀어요! 놓치겠어요' : gap < 60 ? '⚠️ 너무 가까워요!' : '';
  const ct = document.getElementById('ctime');
  if (ct && st.crisis) ct.style.width = `${(st.crisisLeft / 2.6) * 100}%`;
}

// ───────── 입력 ─────────
const setWalk = (v: boolean) => { if (st && !st.over && !st.crisis) st.walking = v; document.getElementById('hold')?.classList.toggle('down', v); };
app.addEventListener('pointerdown', (e) => {
  const t = e.target as HTMLElement;
  if (t.closest('#hold') || t.closest('#street')) { e.preventDefault(); setWalk(true); }
});
window.addEventListener('pointerup', () => setWalk(false));
window.addEventListener('pointercancel', () => setWalk(false));
window.addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); setWalk(true); } });
window.addEventListener('keyup', (e) => { if (e.code === 'Space') setWalk(false); });
app.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act],[data-age]');
  if (!el) return;
  if (el.dataset.age) { age = Number(el.dataset.age) as Age; newRun(); return; }
  if (el.dataset.act === 'run' && st.crisis) resolveCrisis(true);
  else if (el.dataset.act === 'wait' && st.crisis) resolveCrisis(false);
  else if (el.dataset.act === 'again') newRun();
});

// 자동 테스트용 (게임 진행에는 영향 없음)
(window as unknown as { __follow: () => State }).__follow = () => st;

newRun();
