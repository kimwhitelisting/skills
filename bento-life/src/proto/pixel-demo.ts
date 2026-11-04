/**
 * 도트 샘플 — 코드로 찍은 아이·재료·장면·이펙트가 게임 화면에서 어떻게 보이는지 확인용.
 *  1) 부엌: 재료를 누르면 도시락에 담기고, 아이가 표정으로 반응 (좋아함: 소시지·계란 / 싫어함: 브로콜리)
 *  2) 등굣길: 아이가 걷다가 뒤돌아보면 부모가 나무 뒤로 후다닥 (자동 재생)
 *  3) 캐릭터: 7살·15살 남녀, 표정
 */
import './pixel-demo.css';
import g11 from 'galmuri/dist/Galmuri11.woff2?url';
import g11b from 'galmuri/dist/Galmuri11-Bold.woff2?url';
import { childFront, childSide, parentSide, CHILD_H, type Expr, type Look } from '../pixel/child.ts';
import { food } from '../pixel/foods.ts';
import { draw as drawFx, spawn, step, bubble, type Fx } from '../pixel/fx.ts';
import { paint, toDataURL, type Grid } from '../pixel/grid.ts';
import { bentoBox, bentoLid, kitchenCounter, kitchenWall, pole, SCENE_W, streetTile, tree } from '../pixel/scenes.ts';
import { haptic, sfx } from '../ui/feedback.ts';

for (const [src, weight] of [[g11, '400'], [g11b, '700']] as const) {
  const f = new FontFace('Galmuri11', `url(${src})`, { weight });
  f.load().then((ff) => document.fonts.add(ff)).catch(() => { /* 기본 글꼴로 */ });
}

// ───────── 그림 캐시 (Grid → 캔버스 한 번만) ─────────
const cache = new Map<string, HTMLCanvasElement>();
function sprite(key: string, make: () => Grid): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) {
    const g = make();
    c = document.createElement('canvas');
    c.width = g.w; c.height = g.h;
    paint(c.getContext('2d')!, g);
    cache.set(key, c);
  }
  return c;
}
const blit = (ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, x: number, y: number, flip = false) => {
  if (!flip) { ctx.drawImage(c, Math.round(x), Math.round(y)); return; }
  ctx.save(); ctx.translate(Math.round(x) + c.width, Math.round(y)); ctx.scale(-1, 1); ctx.drawImage(c, 0, 0); ctx.restore();
};

/** 캔버스를 정수 배율로 화면 폭에 맞춘다 (도트가 고르게 보이도록) */
function fitCanvas(canvas: HTMLCanvasElement, w: number, h: number): number {
  const avail = Math.min(canvas.parentElement!.clientWidth, 520);
  const s = Math.max(1, Math.floor(avail / w));
  canvas.width = w; canvas.height = h;
  canvas.style.width = `${w * s}px`; canvas.style.height = `${h * s}px`;
  return s;
}

const app = document.getElementById('app')!;
app.innerHTML = `
<div class="px-app">
  <header class="px-hud">
    <span class="px-title">도트 샘플</span>
    <span class="px-pill"><img id="hud-heart" alt=""> <b id="hearts">0</b></span>
    <span class="px-pill"><img id="hud-star" alt=""> <b id="stars">0</b></span>
  </header>

  <section class="px-panel">
    <h2>① 부엌 · 도시락 싸기</h2>
    <div class="px-stage"><canvas id="kitchen"></canvas></div>
    <div class="px-tray" id="tray"></div>
    <div class="px-row">
      <button class="px-btn ghost" id="clear">비우기</button>
      <button class="px-btn" id="lid" disabled>뚜껑 닫기</button>
    </div>
    <p class="px-note">이 아이는 <b>소시지·계란</b>을 좋아하고 <b>브로콜리</b>를 싫어해요.</p>
  </section>

  <section class="px-panel">
    <h2>② 등굣길 · 몰래 따라가기</h2>
    <div class="px-stage"><canvas id="street"></canvas></div>
    <p class="px-note">자동 재생 · 아이가 "…" 하면 부모가 나무나 전봇대 뒤로 후다닥</p>
  </section>

  <section class="px-panel">
    <h2>③ 아이 · 7살 → 15살</h2>
    <div class="px-stage"><canvas id="kids"></canvas></div>
    <div class="px-row wrap" id="exprs"></div>
  </section>
</div>`;

const heartImg = toDataURL(heartIcon(), 2);
(document.getElementById('hud-heart') as HTMLImageElement).src = heartImg;
(document.getElementById('hud-star') as HTMLImageElement).src = toDataURL(starIcon(), 2);
let hearts = 0, stars = 0;
const bump = (id: 'hearts' | 'stars', v: number) => {
  const el = document.getElementById(id)!;
  el.textContent = String(v);
  el.parentElement!.classList.remove('pop'); void el.parentElement!.offsetWidth; el.parentElement!.classList.add('pop');
};

function heartIcon(): Grid {
  const g = food('sausage'); // 크기만 빌려 쓰고 새로 그린다
  g.px.fill(null);
  g.stamp(['.rr..rr.', 'rrrrrrrr', 'rrrrrrrr', '.rrrrrr.', '..rrrr..', '...rr...'], 4, 5, { r: '#e2543f' });
  return g.outline('#3b2a24');
}
function starIcon(): Grid {
  const g = food('sausage'); g.px.fill(null);
  g.stamp(['...yy...', '...yy...', 'yyyyyyyy', '.yyyyyy.', '..yyyy..', '.yy..yy.'], 4, 5, { y: '#f2b544' });
  return g.outline('#3b2a24');
}

// ═════════ ① 부엌 ═════════
const look: Look = { age: 7, gender: 'girl' };
type Slot = 'base' | 'main' | 'side';
const FOODS: { id: string; name: string; slot: Slot; like?: boolean; dislike?: boolean }[] = [
  { id: 'rice', name: '흰쌀밥', slot: 'base' }, { id: 'riceball', name: '주먹밥', slot: 'base' }, { id: 'gimbap', name: '김밥', slot: 'base' },
  { id: 'egg', name: '계란말이', slot: 'main', like: true }, { id: 'sausage', name: '문어소시지', slot: 'main', like: true },
  { id: 'broccoli', name: '브로콜리', slot: 'side', dislike: true },
];
const box: Partial<Record<Slot, string>> = {};
const kfx: Fx[] = [];
let kidExpr: Expr = 'neutral', exprUntil = 0, lidT = -1, kidShake = 0;
const tray = document.getElementById('tray')!;
tray.innerHTML = FOODS.map((f) => `<button class="px-food" data-id="${f.id}"><img src="${toDataURL(food(f.id), 3)}" alt=""><span>${f.name}</span></button>`).join('');
const kc = document.getElementById('kitchen') as HTMLCanvasElement;
const KW = 110, KH = 98, COUNTER_Y = 54;
let ks = fitCanvas(kc, KW, KH);
const kctx = kc.getContext('2d')!;
const bento = bentoBox();
const BX = 46, BY = 57;
const KID_X = 8;

tray.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('.px-food');
  if (!b || lidT >= 0) return;
  const f = FOODS.find((x) => x.id === b.dataset.id)!;
  box[f.slot] = f.id;
  const c = bento.cells[f.slot];
  spawn(kfx, 'sparkle', BX + c.x + c.w / 2, BY + c.y + c.h / 2, 6);
  if (f.like) { kidExpr = 'happy'; spawn(kfx, 'heart', KID_X + 12, COUNTER_Y - 30, 4); hearts += 3; bump('hearts', hearts); sfx('ding'); haptic(10); }
  else if (f.dislike) { kidExpr = 'yuck'; kidShake = 0.4; sfx('tap'); haptic(30); }
  else { kidExpr = 'surprise'; sfx('pop'); haptic(8); }
  exprUntil = performance.now() + 1400;
  (document.getElementById('lid') as HTMLButtonElement).disabled = !(box.base && box.main && box.side);
});
document.getElementById('clear')!.addEventListener('click', () => { delete box.base; delete box.main; delete box.side; (document.getElementById('lid') as HTMLButtonElement).disabled = true; sfx('tap'); });
document.getElementById('lid')!.addEventListener('click', () => {
  if (lidT >= 0) return;
  lidT = 0; sfx('pack'); haptic(15);
  (document.getElementById('lid') as HTMLButtonElement).disabled = true;
});

function drawKitchen(now: number, dt: number) {
  kctx.clearRect(0, 0, kc.width, kc.height);
  kctx.drawImage(sprite('kwall', () => kitchenWall(KW, COUNTER_Y + 4)), 0, 0);
  // 조리대 너머로 빼꼼 보는 아이 (숨쉬기 + 눈 깜빡임)
  if (now > exprUntil) kidExpr = 'neutral';
  const blink = kidExpr === 'neutral' && now % 3200 < 140;
  const bob = (Math.floor(now / 600) % 2) as 0 | 1;
  const shake = kidShake > 0 ? Math.round(Math.sin(now / 30) * 2) : 0;
  kidShake = Math.max(0, kidShake - dt);
  blit(kctx, sprite(`kid-${look.age}${look.gender}-${kidExpr}-${blink}-${bob}`, () => childFront(look, kidExpr, { blink, bob })), KID_X + shake, COUNTER_Y - 29);
  kctx.drawImage(sprite('kcounter', () => kitchenCounter(KW, KH - COUNTER_Y)), 0, COUNTER_Y);
  // 도시락
  blit(kctx, sprite('bento', () => bento.g), BX, BY);
  for (const slot of ['base', 'main', 'side'] as Slot[]) {
    const id = box[slot];
    if (!id) continue;
    const c = bento.cells[slot];
    blit(kctx, sprite(`food-${id}`, () => food(id)), BX + c.x + (c.w - 16) / 2, BY + c.y + (c.h - 16) / 2);
  }
  if (lidT >= 0) {
    lidT += dt;
    const k = Math.min(1, lidT / 0.3);
    blit(kctx, sprite('lid', bentoLid), BX, BY - 30 * (1 - k));
    if (lidT > 0.3 && lidT - dt <= 0.3) { spawn(kfx, 'star', BX + 29, BY + 10, 8); spawn(kfx, 'sparkle', BX + 29, BY + 20, 8); stars += 1; bump('stars', stars); sfx('chime'); haptic(25); }
    if (lidT > 1.6) { lidT = -1; delete box.base; delete box.main; delete box.side; }
  }
  step(kfx, dt);
  kctx.save(); kctx.scale(1, 1); drawFx(kctx, kfx, 1); kctx.restore();
}

// ═════════ ② 등굣길 ═════════
const sc = document.getElementById('street') as HTMLCanvasElement;
const SH = 96;
fitCanvas(sc, SCENE_W, SH);
const sctx = sc.getContext('2d')!;
const WORLD = 960;
const covers = [70, 190, 300, 420, 540, 660, 790].map((x, i) => ({ x, kind: i % 3 === 1 ? 'pole' : 'tree' }));
const walker: Look = { age: 7, gender: 'girl' };
const st = { kx: 60, px: 20, kid: 'walk' as 'walk' | 'tele' | 'look', kt: 0, next: 3.5, frame: 0, ft: 0, pf: 0, dashTo: -1 as number, sfx: [] as Fx[], loopT: 0 };

function nearestCover(x: number) { return covers.reduce((a, c) => (Math.abs(c.x - x) < Math.abs(a.x - x) ? c : a)); }

function stepStreet(dt: number) {
  st.kt += dt;
  if (st.kid === 'walk') {
    st.kx += 22 * dt;
    if (st.kt > st.next) { st.kid = 'tele'; st.kt = 0; }
  } else if (st.kid === 'tele' && st.kt > 0.7) { st.kid = 'look'; st.kt = 0; sfx('tap'); }
  else if (st.kid === 'look' && st.kt > 1.4) { st.kid = 'walk'; st.kt = 0; st.next = 2.5 + Math.random() * 2.5; }
  // 부모: 평소엔 따라 걷고, "…"가 뜨면 가까운 숨을 곳으로 후다닥
  if (st.kid === 'tele' && st.dashTo < 0) {
    const ahead = covers.find((c) => c.x > st.px - 6 && c.x < st.kx - 20) ?? nearestCover(st.px);
    st.dashTo = ahead.x;
  }
  if (st.dashTo >= 0) {
    const dir = Math.sign(st.dashTo - st.px);
    st.px += dir * 70 * dt;
    if (Math.random() < 0.5) spawn(st.sfx, 'dust', st.px + 2, 90, 1);
    if (Math.abs(st.dashTo - st.px) < 2) { st.px = st.dashTo; st.dashTo = -1; }
  } else if (st.kid === 'walk' && st.kx - st.px > 46) st.px += 24 * dt;
  st.ft += dt;
  if (st.ft > 0.16) { st.ft = 0; if (st.kid === 'walk') st.frame++; if (st.dashTo >= 0 || (st.kid === 'walk' && st.kx - st.px > 46)) st.pf++; }
  if (st.kx > WORLD - 60) { st.kx = 60; st.px = 20; st.dashTo = -1; }
  step(st.sfx, dt);
}

function drawStreet(now: number) {
  const cam = Math.max(0, Math.min(WORLD - SCENE_W, st.px - 40));
  sctx.clearRect(0, 0, sc.width, sc.height);
  sctx.drawImage(sprite('street', () => streetTile(WORLD)), -Math.round(cam), 0);
  const hidden = covers.some((c) => Math.abs(c.x - st.px) < 5);
  // 부모 (숨을 곳보다 뒤에 그려서 가려지게)
  const pSprite = sprite(`parent-${st.pf % 4}-${st.dashTo >= 0}`, () => parentSide(st.pf % 4, { dash: st.dashTo >= 0 }));
  sctx.globalAlpha = hidden ? 0.55 : 1;
  blit(sctx, pSprite, st.px - 10 - cam, 92 - 46);
  sctx.globalAlpha = 1;
  for (const c of covers) {
    const s = c.kind === 'tree' ? sprite('tree', tree) : sprite('pole', pole);
    blit(sctx, s, c.x - s.width / 2 - cam, 92 - s.height);
  }
  // 아이
  const kx = st.kx - 12 - cam, ky = 92 - CHILD_H;
  if (st.kid === 'look') blit(sctx, sprite(`walk-look`, () => childFront(walker, hidden ? 'neutral' : 'surprise')), kx, ky);
  else blit(sctx, sprite(`walk-${st.frame % 4}`, () => childSide(walker, st.frame % 4)), kx, ky);
  if (st.kid === 'tele') bubble(sctx, Math.round(kx + 8), ky - 4, 1, '…');
  if (st.kid === 'look') bubble(sctx, Math.round(kx + 8), ky - 4, 1, hidden ? '…' : '!');
  if (st.kid === 'walk' && Math.floor(now / 900) % 4 === 0) bubble(sctx, Math.round(kx + 8), ky - 4, 1, '♪');
  drawFx(sctx, st.sfx, 1, cam);
}

// ═════════ ③ 아이들 ═════════
const kidc = document.getElementById('kids') as HTMLCanvasElement;
fitCanvas(kidc, SCENE_W, 56);
const kidctx = kidc.getContext('2d')!;
const LOOKS: Look[] = [{ age: 7, gender: 'boy' }, { age: 7, gender: 'girl' }, { age: 15, gender: 'boy' }, { age: 15, gender: 'girl' }];
let sheetExpr: Expr = 'neutral';
const EXPRS: [Expr, string][] = [['neutral', '기본'], ['happy', '신남'], ['yuck', '질색'], ['sad', '시무룩'], ['surprise', '깜짝']];
document.getElementById('exprs')!.innerHTML = EXPRS.map(([e, n]) => `<button class="px-btn small ${e === 'neutral' ? 'on' : ''}" data-e="${e}">${n}</button>`).join('');
document.getElementById('exprs')!.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-e]');
  if (!b) return;
  sheetExpr = b.dataset.e as Expr;
  document.querySelectorAll('#exprs .px-btn').forEach((x) => x.classList.toggle('on', x === b));
  sfx('pop');
});
function drawKids(now: number) {
  kidctx.clearRect(0, 0, kidc.width, kidc.height);
  kidctx.fillStyle = '#f6e7cf'; kidctx.fillRect(0, 0, kidc.width, kidc.height);
  kidctx.fillStyle = '#d9a066'; kidctx.fillRect(0, 50, kidc.width, 6);
  LOOKS.forEach((l, i) => {
    const blink = sheetExpr === 'neutral' && (now + i * 700) % 3000 < 130;
    const bob = (Math.floor((now + i * 300) / 600) % 2) as 0 | 1;
    blit(kidctx, sprite(`sheet-${l.age}${l.gender}-${sheetExpr}-${blink}-${bob}`, () => childFront(l, sheetExpr, { blink, bob })), 12 + i * 36, 50 - CHILD_H);
  });
}

// ═════════ 루프 ═════════
let last = performance.now();
function loop(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  drawKitchen(now, dt);
  stepStreet(dt); drawStreet(now);
  drawKids(now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.addEventListener('resize', () => { ks = fitCanvas(kc, KW, KH); fitCanvas(sc, SCENE_W, SH); fitCanvas(kidc, SCENE_W, 56); });
void ks;
