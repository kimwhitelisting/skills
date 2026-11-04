/**
 * 도트 부품 작업대 — 그리는 사람이 고친 부품 PNG를 올리면 게임 속 모습으로 바로 보여 준다.
 *   성장 단계 · 성별 · 방향 · 부품을 고르고 → 원본 받기 → 도트 편집기로 고치기 → 올리기
 *   → 표정 5개, 눈 깜빡임, 걷기 8프레임, 이벤트 장면 속 모습을 한 화면에서 확인.
 *   올린 부품은 이 기기에 저장되고, 다 되면 같은 이름으로 src/assets/pixel/parts/ 에 넣는다.
 */
import '../style.css';
import './pixel-ui.css';
import './day-px.css';
import '../game.css';
import { childFront, childLayers, childSide, EXPRS, PART_OVERRIDES, partKey, PX_AGES, WALK_FRAMES, type Gender, type Look, type PxAge, type View } from '../pixel/child.ts';
import { eventScene } from '../pixel/event-scenes.ts';
import { loadPixelFont } from '../pixel/font.ts';
import { Grid, paint } from '../pixel/grid.ts';
import { loadPartOverrides } from '../pixel/parts-loader.ts';

const STAGE_NAME: Record<PxAge, string> = { 1: '아기', 4: '유치원', 7: '초등 저', 11: '초등 고', 15: '중학생', 18: '고등학생', 19: '스무 살' };
const STORE = 'bento-life:parts-lab:v1';
const app = document.getElementById('app')!;
app.classList.add('pixel-ui');
loadPixelFont();

let age: PxAge = 7;
let gender: Gender = 'girl';
let view: View = 'front';
let layer = 'hair';
let msg = '';
const uploaded = new Map<string, string>(); // key → dataURL (이번 기기에 올린 것)

const look = (): Look => ({ age, gender });
const layersNow = () => childLayers(view, look());
const keyNow = () => partKey(view, look(), layer);
const esc = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// ───────── 저장 (이 기기) ─────────
function persist(): void {
  try { localStorage.setItem(STORE, JSON.stringify(Object.fromEntries(uploaded))); } catch { /* 저장 불가 */ }
}
async function restore(): Promise<void> {
  let saved: Record<string, string> = {};
  try { saved = JSON.parse(localStorage.getItem(STORE) ?? '{}'); } catch { /* 없음 */ }
  for (const [k, url] of Object.entries(saved)) { const g = await gridFromUrl(url).catch(() => undefined); if (g) { PART_OVERRIDES.set(k, g); uploaded.set(k, url); } }
}

// ───────── PNG ↔ Grid ─────────
const hex = (n: number) => n.toString(16).padStart(2, '0');
function gridFromUrl(url: string): Promise<Grid> {
  return new Promise((ok, fail) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const ctx = c.getContext('2d')!; ctx.drawImage(im, 0, 0);
      const d = ctx.getImageData(0, 0, im.width, im.height).data;
      const g = new Grid(im.width, im.height);
      for (let i = 0; i < im.width * im.height; i++) g.px[i] = d[i * 4 + 3] < 128 ? null : `#${hex(d[i * 4])}${hex(d[i * 4 + 1])}${hex(d[i * 4 + 2])}`;
      ok(g);
    };
    im.onerror = fail; im.src = url;
  });
}
function canvasOf(g: Grid, scale: number, grid = false): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = g.w * scale; c.height = g.h * scale;
  const ctx = c.getContext('2d')!;
  if (grid) { for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { ctx.fillStyle = (x + y) % 2 ? '#efe3cf' : '#f7eedf'; ctx.fillRect(x * scale, y * scale, scale, scale); } }
  paint(ctx, g, 0, 0, scale);
  return c;
}
function download(g: Grid, name: string): void {
  canvasOf(g, 1).toBlob((b) => {
    if (!b) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = `${name}.png`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, 'image/png');
}

async function accept(file: File): Promise<void> {
  const url = await new Promise<string>((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.readAsDataURL(file); });
  const g = await gridFromUrl(url).catch(() => undefined);
  if (!g) { msg = '⚠ PNG를 읽지 못했어요.'; return render(); }
  if (g.w !== 24 || g.h !== 40) { msg = `⚠ 크기가 ${g.w}×${g.h}예요. 24×40 그대로 그려 주세요.`; return render(); }
  // 파일 이름이 부품 이름이면 그 부품으로, 아니면 지금 고른 부품으로
  const named = file.name.replace(/\.png$/i, '');
  const key = /^(front|side)-\d+-(boy|girl)-/.test(named) ? named : keyNow();
  PART_OVERRIDES.set(key, g); uploaded.set(key, url); persist();
  msg = `✓ ${key} 바꿔 끼웠어요.`;
  render();
}

// ───────── 화면 ─────────
function render(): void {
  const keys = Object.keys(layersNow());
  if (!keys.includes(layer)) layer = keys.includes('hair') ? 'hair' : keys[0];
  const key = keyNow();
  const part = PART_OVERRIDES.get(key) ?? layersNow()[layer];
  const seg = <T extends string | number>(name: string, opts: T[], cur: T, label: (v: T) => string) =>
    `<div class="seg">${opts.map((v) => `<button class="${v === cur ? 'on' : ''}" data-set="${name}" data-v="${v}">${label(v)}</button>`).join('')}</div>`;
  app.innerHTML = `
  <div class="lab">
    <header class="px-hud"><span class="px-title">도트 부품 작업대</span><span class="px-pill">바꾼 부품 <b>${uploaded.size}</b></span></header>
    <section class="px-panel">
      <div class="field"><span>성장 단계</span>${seg('age', PX_AGES, age, (v) => STAGE_NAME[v])}</div>
      <div class="lab-row">
        <div class="field"><span>성별</span>${seg('gender', ['girl', 'boy'] as Gender[], gender, (v) => (v === 'girl' ? '여자아이' : '남자아이'))}</div>
        <div class="field"><span>방향</span>${seg('view', ['front', 'side'] as View[], view, (v) => (v === 'front' ? '정면' : '옆 걷기'))}</div>
      </div>
      <div class="field"><span>부품</span><div class="lab-layers">${keys.map((k) => `<button class="${k === layer ? 'on' : ''} ${PART_OVERRIDES.has(partKey(view, look(), k)) ? 'mod' : ''}" data-set="layer" data-v="${k}">${k}</button>`).join('')}</div></div>
      <div class="lab-part">
        <div id="part"></div>
        <div class="lab-side">
          <code>${esc(key)}.png</code>
          <p class="px-sub">24×40 · 투명 배경 · 외곽선 없이</p>
          <button class="btn" data-act="get">원본 받기</button>
          <label class="btn primary lab-up">고친 PNG 올리기<input type="file" accept="image/png" id="file" multiple hidden></label>
          ${PART_OVERRIDES.has(key) ? '<button class="btn" data-act="reset">코드 그림으로 되돌리기</button>' : ''}
          ${msg ? `<p class="lab-msg">${esc(msg)}</p>` : ''}
        </div>
      </div>
      <h3>게임 속 모습</h3>
      <div class="lab-strip" id="faces"></div>
      <div class="lab-strip"><span id="walk"></span><span id="scene"></span></div>
      ${uploaded.size ? `<h3>이 기기에 올린 부품</h3><ul class="lab-list">${[...uploaded.keys()].map((k) => `<li><code>${esc(k)}.png</code> <button class="btn" data-act="dl" data-key="${esc(k)}">받기</button> <button class="btn" data-act="drop" data-key="${esc(k)}">지우기</button></li>`).join('')}</ul>
      <p class="px-sub">다 고쳤으면 이 파일들을 같은 이름으로 <code>src/assets/pixel/parts/</code>에 넣으면 게임에 들어가요.</p>` : ''}
      <p class="px-sub">PNG를 이 화면에 끌어다 놓아도 돼요. 파일 이름이 부품 이름(<code>front-7-girl-hair.png</code>)이면 그 부품으로, 아니면 지금 고른 부품으로 들어가요.</p>
    </section>
  </div>`;
  document.getElementById('part')!.append(canvasOf(part, 8, true));
  const faces = document.getElementById('faces')!;
  for (const e of EXPRS) faces.append(canvasOf(childFront(look(), e), 3));
  faces.append(canvasOf(childFront(look(), 'neutral', { blink: true }), 3));
  const sc = canvasOf(eventScene('school', look(), 'happy'), 2);
  document.getElementById('scene')!.append(sc);
  walkCanvas = canvasOf(childSide(look(), 0), 3);
  document.getElementById('walk')!.append(walkCanvas);
}

let walkCanvas: HTMLCanvasElement | undefined;
let frame = 0;
setInterval(() => {
  if (!walkCanvas?.isConnected) return;
  frame = (frame + 1) % WALK_FRAMES;
  const g = childSide(look(), frame);
  const ctx = walkCanvas.getContext('2d')!;
  ctx.clearRect(0, 0, walkCanvas.width, walkCanvas.height);
  paint(ctx, g, 0, 0, 3);
}, 110);

app.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-set],[data-act]');
  if (!el) return;
  const v = el.dataset.v!;
  if (el.dataset.set === 'age') age = Number(v) as PxAge;
  else if (el.dataset.set === 'gender') gender = v as Gender;
  else if (el.dataset.set === 'view') view = v as View;
  else if (el.dataset.set === 'layer') layer = v;
  else if (el.dataset.act === 'get') return download(layersNow()[layer], keyNow());
  else if (el.dataset.act === 'reset') { PART_OVERRIDES.delete(keyNow()); uploaded.delete(keyNow()); persist(); msg = '코드 그림으로 되돌렸어요.'; }
  else if (el.dataset.act === 'dl') { const g = PART_OVERRIDES.get(el.dataset.key!); if (g) download(g, el.dataset.key!); return; }
  else if (el.dataset.act === 'drop') { PART_OVERRIDES.delete(el.dataset.key!); uploaded.delete(el.dataset.key!); persist(); }
  else return;
  if (el.dataset.set) msg = '';
  render();
});
app.addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement;
  if (input.id === 'file' && input.files) for (const f of input.files) void accept(f);
});
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => { e.preventDefault(); for (const f of e.dataTransfer?.files ?? []) if (f.type === 'image/png') void accept(f); });

// 자동 테스트용
(window as unknown as { __lab: () => unknown }).__lab = () => ({ age, gender, view, layer, overrides: [...PART_OVERRIDES.keys()] });

void loadPartOverrides().catch(() => 0).then(restore).then(render);
