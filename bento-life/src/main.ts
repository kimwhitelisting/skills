/**
 * 도시락 육아 — 본 게임 (도트판)
 *
 *  한 해: 나이 이벤트 → 하루 (아침 도시락 → 배웅/따라가기 → 등굣길 → 저녁) → 랜덤 이벤트 → 키 재기 결산
 *  0살부터 19살까지 스무 해를 보내면 엔딩.
 *  모든 장면은 코드로 찍은 도트 그림(src/pixel)을 캔버스에 그린다. 글과 버튼은 DOM.
 */
import './style.css';
import './proto/proto.css';
import './proto/follow.css';
import './proto/pixel-ui.css';
import './proto/day-px.css';
import './game.css';
import { INGREDIENTS, ing } from './data/ingredients.ts';
import { voiceAge } from './data/requests.ts';
import { displayDelta } from './game/apply.ts';
import { ALL_MENUS, available, getMenu, ingredientCost, selectionCost } from './game/bento.ts';
import { DEFAULT_TUNING, tuningOf, yearlyIncome, type Tuning } from './game/config.ts';
import { FINAL_AGE, STAT_INFO, STAT_KEYS, TALENT_INFO, stageOf } from './game/constants.ts';
import {
  advanceYear, canCommute, chooseEventOption, chooseLeave, commuteParams, continueAfterEvent, endDay, finishCommute,
  hasLeave, leaveOptions, packToday, startGame, todayRequests,
} from './game/engine.ts';
import { ENDINGS, ENDING_BY_ID, decideEnding } from './game/endings.ts';
import { josa } from './game/korean.ts';
import { menuKey } from './game/menus.ts';
import { clearRun, loadDex, loadRun, saveDex, saveRun, type Dex } from './game/save.ts';
import { newGame } from './game/state.ts';
import { fmt } from './game/text.ts';
import type { Delta, GameState, LeaveChoice, Slot, StatKey } from './game/types.ts';
import { CHILD_H, childFront, headTop, parentSide, pxAgeOf, type Expr, type HatId, type Look } from './pixel/child.ts';
import { eventExpr, eventScene } from './pixel/event-scenes.ts';
import { entryFloor, entryWall, miniLunch } from './pixel/extras.ts';
import { loadPixelFont } from './pixel/font.ts';
import { food } from './pixel/foods.ts';
import { bubble, draw as drawFx, spawn, step as stepFx, type Fx } from './pixel/fx.ts';
import { Grid, toDataURL } from './pixel/grid.ts';
import { P } from './pixel/palette.ts';
import { loadPartOverrides } from './pixel/parts-loader.ts';
import { bentoBox, bentoLid, kitchenCounter, kitchenWall } from './pixel/scenes.ts';
import { blit, clearSprites, sprite } from './pixel/sprite-cache.ts';
import { isFull, menuLabel, placeOrToggle, SLOTS, SLOT_LABEL, type Draft } from './proto/bento-ui.ts';
import { mountFollow, unmountFollow } from './proto/follow-core.ts';
import { haptic, setFeedbackPrefs, sfx } from './ui/feedback.ts';
import { loadPrefs, savePrefs } from './ui/prefs.ts';

// ───────────────────────── 상태 ─────────────────────────
type Screen = 'title' | 'intro' | 'game';
type Overlay = 'stats' | 'menu' | 'notebook' | 'dex' | 'settings';
/** 방금 고른 이벤트 선택지의 결과 (엔진은 이미 다음으로 넘어가 있고, 화면만 한 번 더 보여 준다) */
interface EventResult { id: string; emoji: string; title: string; text: string; delta: Delta; money: number; kind: string }

const app = document.getElementById('app')!;
app.classList.add('pixel-ui');
loadPixelFont();
const prefs = loadPrefs();
setFeedbackPrefs(prefs);
let screen: Screen = 'title';
let overlay: Overlay | undefined;
let game: GameState | undefined = loadRun();
const dex: Dex = loadDex();
let eventResult: EventResult | undefined;
let draft: Draft = {};
let tab: Slot = 'base';
let lastPick: string | undefined;
let busy = false;
let introPage = 0;
let commuteOn = false;

const MORNING_TIME = 30;
let timer = MORNING_TIME;
let timerId = 0;

const STAT_DESC: Record<StatKey, string> = {
  health: '잘 먹고 안 아프기. 채소·균형 잡힌 도시락',
  smarts: '공부와 호기심. 생선·견과류, 든든한 아침',
  happy: '좋아하는 음식, 요청을 맞춘 점심',
  fitness: '고기·단백질, 뛰어놀기',
  social: '친구 관계. 인기 있는 반찬, 혼자 다니기',
  indep: '혼자 해내는 힘. 너무 따라다니면 떨어진다',
  bond: '부모와의 정. 같이 걷기, 싹 비운 도시락',
};

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const nl = (t: string) => esc(t).replace(/\n/g, '<br>');
const persist = () => { if (game) saveRun(game); saveDex(dex); savePrefs(prefs); };
const lookOf = (s: GameState, age = s.age): Look => ({ age: pxAgeOf(age), gender: s.child.gender });
const iconCache = new Map<string, string>();
const foodIcon = (id: string) => { let u = iconCache.get(id); if (!u) { u = toDataURL(food(id), 3); iconCache.set(id, u); } return u; };
const teen = (s: GameState) => s.age >= 13;

/** 얼굴만 잘라 낸 작은 그림 (HUD·수첩용) */
function faceIcon(s: GameState, expr: Expr = 'neutral'): string {
  const look = lookOf(s);
  const top = headTop(look).y;
  const g = new Grid(24, 20).draw(childFront(look, expr), 0, -(top - 3));
  return toDataURL(g, 2);
}

// ───────────────────────── 장면 (캔버스) ─────────────────────────
type SceneKind = 'kitchen' | 'entry' | 'event' | 'growth' | 'title' | 'ending' | 'intro';
const KW = 110, COUNTER_Y = 54, BX = 46, BY = 57, KID_X = 8;
const SCENE_H: Record<SceneKind, number> = { kitchen: 98, entry: 98, event: 72, growth: 98, title: 98, ending: 98, intro: 80 };
const bento = bentoBox();
const fx: Fx[] = [];
let sceneKind: SceneKind | undefined;
let sceneCanvas: HTMLCanvasElement | null = null;
let reactExpr: Expr = 'neutral';
let reactUntil = 0;
let shake = 0;
let lidT = -1;
let titleLook: Look = { age: 7, gender: Math.random() < 0.5 ? 'boy' : 'girl' };

function fitScene(c: HTMLCanvasElement, h: number): void {
  const availW = Math.min(c.parentElement!.clientWidth || 360, 520);
  const s = Math.max(1, Math.floor(availW / KW));
  c.width = KW; c.height = h;
  c.style.width = `${KW * s}px`; c.style.height = `${h * s}px`;
}

/** 큰 아이 (2배) — 키 재기·엔딩 */
function blit2(g: CanvasRenderingContext2D, c: HTMLCanvasElement, x: number, y: number): void {
  g.imageSmoothingEnabled = false;
  g.drawImage(c, x, y, c.width * 2, c.height * 2);
}

/** 이벤트 결과에 따른 표정: 좋은 일이면 웃고, 나쁜 일이면 시무룩 */
function resultExpr(r: EventResult): Expr {
  const sum = Object.values(r.delta).reduce((a, b) => a + (b ?? 0), 0) + r.money / 5;
  return sum > 0.5 ? 'happy' : sum < -0.5 ? 'sad' : 'neutral';
}

function kidExprNow(s: GameState | undefined, now: number): Expr {
  const t = s?.today;
  if (sceneKind === 'event') {
    if (!eventResult) return eventExpr(s?.active?.id ?? '');
    return resultExpr(eventResult);
  }
  if (sceneKind === 'ending' || sceneKind === 'title') return 'happy';
  if (!s || !t) return 'neutral';
  if (t.phase === 'evening' && t.evening) return (['yuck', 'sad', 'neutral', 'happy'] as Expr[])[t.evening.lunch];
  if (t.phase === 'leave') return t.pack?.mood === 'happy' ? 'happy' : t.pack?.mood === 'grumpy' ? 'yuck' : 'neutral';
  return now < reactUntil ? reactExpr : 'neutral';
}

function eatenCell(s: GameState, slot: Slot): boolean {
  const t = s.today!;
  const id = t.pack!.sel[slot];
  const l = t.evening?.lunch ?? 0;
  return l >= 3 || (l === 2 && id !== t.pack!.disliked) || (l === 1 && id === t.pack!.liked);
}

function kidSprite(look: Look, expr: Expr, blink: boolean, bob: 0 | 1, hat: HatId = 'none') {
  return sprite(`kid-${look.age}${look.gender}-${expr}-${blink}-${bob}-${hat}`, () => childFront(look, expr, { blink, bob, hat }));
}

function drawScene(now: number, dt: number): void {
  const c = sceneCanvas;
  if (!c || !c.isConnected || !sceneKind) return;
  const g = c.getContext('2d')!;
  const H = c.height;
  g.clearRect(0, 0, KW, H);
  const s = game;
  const look = sceneKind === 'title' ? titleLook : s ? lookOf(s) : titleLook;
  const expr = kidExprNow(s, now);
  const blink = expr === 'neutral' && now % 3300 < 140;
  const bob = (Math.floor(now / 620) % 2) as 0 | 1;
  const sx = shake > 0 ? Math.round(Math.sin(now / 28) * 2) : 0;
  shake = Math.max(0, shake - dt);
  const wallH = H - 20;

  if (sceneKind === 'kitchen' || sceneKind === 'title') {
    g.drawImage(sprite(`kwall-${KW}`, () => kitchenWall(KW, COUNTER_Y + 4)), 0, 0);
    blit(g, kidSprite(look, expr, blink, bob), KID_X + sx, COUNTER_Y - 29);
    g.drawImage(sprite(`kcounter-${KW}`, () => kitchenCounter(KW, 98 - COUNTER_Y)), 0, COUNTER_Y);
    blit(g, sprite('bento', () => bento.g), BX, BY);
    const t = s?.today;
    const evening = sceneKind === 'kitchen' && t?.phase === 'evening' && !!t.pack;
    const shown: Draft = sceneKind === 'title' ? {} : evening ? t!.pack!.sel : draft;
    for (const slot of SLOTS) {
      const id = shown[slot];
      const cell = bento.cells[slot];
      if (evening && id && eatenCell(s!, slot)) {
        g.fillStyle = P.creamDark; for (const [px, py] of [[4, 5], [12, 9], [18, 4], [8, 13]]) g.fillRect(BX + cell.x + px, BY + cell.y + py, 1, 1);
        continue;
      }
      if (id) blit(g, sprite(`food-${id}`, () => food(id)), BX + cell.x + (cell.w - 16) / 2, BY + cell.y + (cell.h - 16) / 2);
      else if (sceneKind === 'kitchen' && t?.phase === 'morning' && tab === slot) { g.strokeStyle = P.mustard; g.lineWidth = 1; g.strokeRect(BX + cell.x + 0.5, BY + cell.y + 0.5, cell.w - 1, cell.h - 1); }
    }
    if (sceneKind === 'title') blit(g, sprite('lid', bentoLid), BX, BY);
    if (lidT >= 0) {
      lidT += dt;
      const k = Math.min(1, lidT / 0.3);
      blit(g, sprite('lid', bentoLid), BX, BY - 30 * (1 - k));
      if (lidT > 0.3 && lidT - dt <= 0.3) { spawn(fx, 'star', BX + 29, BY + 10, 8); spawn(fx, 'sparkle', BX + 29, BY + 20, 8); sfx('chime'); haptic(20); }
    }
  } else if (sceneKind === 'event') {
    const id = eventResult?.id ?? s?.active?.id ?? '';
    g.drawImage(sprite(`ev-${id}-${look.age}${look.gender}-${expr}`, () => eventScene(id, look, expr)), 0, 0);
  } else if (sceneKind === 'entry' || sceneKind === 'intro') {
    g.drawImage(sprite(`entry-wall-${wallH}`, () => entryWall(KW, wallH)), 0, 0);
    if (sceneKind === 'intro') {
      if (introPage === 0) blit(g, kidSprite({ age: 1, gender: titleLook.gender }, 'happy', false, bob), KW / 2 - 12, wallH - CHILD_H);
      else if (introPage === 1) { blit(g, sprite('bento', () => bento.g), KW / 2 - 29, wallH - 34); for (const slot of SLOTS) { const id = ({ base: 'gimbap', main: 'egg', side: 'broccoli' } as const)[slot]; const cell = bento.cells[slot]; blit(g, sprite(`food-${id}`, () => food(id)), KW / 2 - 29 + cell.x + (cell.w - 16) / 2, wallH - 34 + cell.y + (cell.h - 16) / 2); } }
      else { const f = Math.floor(now / 110) % 8; blit(g, sprite(`parent-${f}`, () => parentSide(f)), 20, wallH - 46); blit(g, kidSprite(titleLook, 'neutral', false, bob), 70, wallH - CHILD_H); bubble(g, 30, wallH - 50, 1, '…'); }
    } else {
      blit(g, kidSprite(look, expr, blink, bob), KW / 2 - 12, wallH - CHILD_H);
      const t = s?.today;
      if (sceneKind === 'entry' && t?.forgot) { blit(g, sprite('lunch-mini', miniLunch), 14, wallH + 4); bubble(g, 20, wallH - 12, 1, '!'); }
      else if (sceneKind === 'entry' && t?.pack?.mood === 'happy') bubble(g, KW / 2 + 6, wallH - 40, 1, '♪');
    }
    g.drawImage(sprite(`entry-floor-${H - wallH}`, () => entryFloor(KW, H - wallH)), 0, wallH);
  } else if (sceneKind === 'growth' || sceneKind === 'ending') {
    g.drawImage(sprite(`entry-wall-${wallH}`, () => entryWall(KW, wallH)), 0, 0);
    g.drawImage(sprite(`entry-floor-${H - wallH}`, () => entryFloor(KW, H - wallH)), 0, wallH);
    const feet = wallH + 4;
    const kidX = sceneKind === 'growth' ? 26 : KW / 2 - 24;
    if (sceneKind === 'growth' && s) {
      // 문기둥 키 재기: 지난 생일마다 그은 눈금
      const PX = 90;
      g.fillStyle = P.woodDark; g.fillRect(PX, 4, 8, feet - 4);
      g.fillStyle = P.wood; g.fillRect(PX + 1, 4, 6, feet - 4);
      for (let a = 0; a <= s.age; a++) {
        const top = feet - 2 * (CHILD_H - headTop(lookOf(s, a)).y);
        g.fillStyle = a === s.age ? P.tomato : P.inkSoft;
        g.fillRect(PX - 1, top, a === s.age ? 10 : 6, 1);
      }
      blit2(g, kidSprite(look, 'happy', false, bob, s.age >= FINAL_AGE ? 'gradcap' : 'crown'), kidX, feet - CHILD_H * 2);
    } else blit2(g, kidSprite(look, 'happy', false, bob, 'gradcap'), kidX, feet - CHILD_H * 2);
    if (sceneKind === 'ending' && Math.random() < dt * 3) spawn(fx, 'star', 10 + Math.random() * 90, 10 + Math.random() * 20, 1);
  }
  stepFx(fx, dt);
  drawFx(g, fx, 1);
}

// ───────────────────────── 작은 조각 ─────────────────────────
function chips(d: Delta, money = 0): string {
  const r = displayDelta(d);
  const out = STAT_KEYS.filter((k) => r[k]).map((k) => `<span class="chip ${r[k]! > 0 ? 'up' : 'down'}">${STAT_INFO[k].label} ${r[k]! > 0 ? '+' : ''}${r[k]}</span>`);
  if (money) out.push(`<span class="chip ${money > 0 ? 'up' : 'down'}">반찬값 ${money > 0 ? '+' : ''}${money}</span>`);
  return out.length ? `<div class="chips">${out.join('')}</div>` : '';
}

function stage(kind: SceneKind, say: string, tag: string, extra = ''): string {
  sceneKind = kind;
  return `
  <div class="px-stage">
    <canvas id="scene" data-h="${SCENE_H[kind]}"></canvas>
    ${tag ? `<span class="px-tag">${tag}</span>` : ''}
    ${say ? `<div class="px-say">${say}</div>` : ''}
    ${extra}
  </div>`;
}

function hud(s: GameState): string {
  return `
  <header class="px-hud">
    <button class="px-who" data-act="stats" aria-label="상태 보기">
      <img src="${faceIcon(s)}" alt="">
      <span><b>${esc(s.child.name)}</b> ${s.age}살 <small>${stageOf(s.age).name}</small></span>
    </button>
    <span class="px-pill" title="반찬값">₩ <b>${s.money}</b></span>
    <span class="px-pill heart" title="등굣길 하트">♥ <b>${s.hearts}</b></span>
    <button class="px-icon" data-act="menu" aria-label="메뉴">≡</button>
  </header>
  <div class="px-life" aria-label="스무 살까지"><i style="width:${(s.age / FINAL_AGE) * 100}%"></i>${[0, 2, 6, 10, 13, 16, 19].map((a) => `<b class="${s.age >= a ? 'on' : ''}" style="left:${(a / FINAL_AGE) * 100}%"></b>`).join('')}</div>`;
}

// ───────────────────────── 화면: 타이틀 / 소개 ─────────────────────────
function renderTitle(): string {
  const canContinue = game && game.step !== 'ending';
  return `
  <div class="px-screen title">
    <div class="px-sign"><h1>도시락 육아</h1><p>도시락 싸들고 졸졸 따라다니면<br>아이를 얼마나 잘 키울 수 있을까?</p></div>
    ${stage('title', '', '')}
    <section class="px-panel">
      ${canContinue ? `<button class="btn primary wide" data-act="continue">이어하기<small>${esc(game!.child.name)} · ${game!.age}살</small></button>` : ''}
      <button class="btn ${canContinue ? '' : 'primary'} wide" data-act="new">새로 키우기</button>
      <div class="px-row">
        <button class="btn" data-act="dex">도감 <small>메뉴 ${dex.menus.length}/${ALL_MENUS.length} · 엔딩 ${dex.endings.length}/${ENDINGS.length}</small></button>
        <button class="btn" data-act="settings">설정</button>
      </div>
    </section>
  </div>`;
}

const INTRO = [
  { title: '아이가 태어났어요', text: '스무 살이 될 때까지\n1년에 하루씩, 아이의 아침을 함께해요.' },
  { title: '아침마다 도시락을 싸요', text: '아이의 오늘 사정(체육, 시험, 배탈…)을 듣고\n세 칸을 채워요. 취향은 먹여 봐야 알아요.' },
  { title: '몰래 따라가 볼까요?', text: '들키지 않게 따라가면 하트가 쌓여요.\n하지만 너무 따라다니면… 혼자 서는 법을 못 배워요.' },
];
function renderIntro(): string {
  const p = INTRO[introPage];
  const last = introPage === INTRO.length - 1;
  return `
  <div class="px-screen">
    ${stage('intro', '', `${introPage + 1} / ${INTRO.length}`)}
    <section class="px-panel">
      <h2 class="px-h">${p.title}</h2>
      <p class="px-story">${nl(p.text)}</p>
      <div class="px-row"><button class="btn" data-act="intro-skip">건너뛰기</button><button class="btn primary" data-act="intro-next">${last ? '시작하기' : '다음'}</button></div>
    </section>
  </div>`;
}

// ───────────────────────── 화면: 이벤트 ─────────────────────────
function renderEvent(s: GameState): string {
  const a = s.active!;
  const kind = s.step === 'milestone' ? `${s.age}살` : '어느 날';
  return `
  ${stage('event', '', kind)}
  <section class="px-panel">
    <h2 class="px-h">${a.emoji} ${esc(a.title)}</h2>
    <p class="px-story">${nl(a.text)}</p>
    ${a.choices.map((c, i) => `<button class="btn wide choice" data-act="choice" data-i="${i}" ${c.enabled ? '' : 'disabled'}>${esc(c.label)}${!c.enabled && c.hint ? `<small>🔒 ${esc(c.hint)}</small>` : ''}</button>`).join('')}
  </section>`;
}

function renderEventResult(r: EventResult): string {
  return `
  ${stage('event', '', r.kind)}
  <section class="px-panel">
    <h2 class="px-h">${r.emoji} ${esc(r.title)}</h2>
    <p class="px-story">${nl(r.text)}</p>
    ${chips(r.delta, r.money)}
    <button class="btn primary wide" data-act="event-ok">계속</button>
  </section>`;
}

// ───────────────────────── 화면: 하루 ─────────────────────────
const DAY_LABEL = (s: GameState) => {
  const n = tuningOf(s).daysPerYear;
  return `${s.age}살${n > 1 ? ` · ${s.dayIndex + 1}/${n}일` : ''}`;
};

function hello(s: GameState): string {
  const a = s.age;
  if (a <= 1) return a === 0 ? '아부부… 맘마?' : '맘마! 맘마!';
  return a < 6 ? '오늘 도시락 뭐야?' : a < 13 ? '친구들이 부러워할 걸로 싸 줘!' : a < 16 ? '…아무거나.' : a < 19 ? '야자 버틸 수 있게 든든하게…' : '이게 마지막 도시락이야?';
}

/** 고르는 동안의 아이 반응 — 이미 알아낸 취향에만 반응 */
function kidReact(s: GameState): { text: string; mood: 'happy' | 'grumpy' | 'neutral' } | undefined {
  if (!lastPick) return undefined;
  const it = ing(lastPick);
  const baby = s.age <= 1;
  if (s.child.known.dislikes.includes(it.id)) return { text: baby ? '으앙…' : teen(s) ? `${josa(it.name, '은/는')} 빼라니까…` : `으… ${josa(it.name, '은/는')} 싫어!`, mood: 'grumpy' };
  if (it.tags.some((t) => s.child.known.likes.includes(t))) return { text: baby ? '꺄르르!' : teen(s) ? `오, ${it.name}.` : `${it.name}! 좋아!`, mood: 'happy' };
  if (isFull(draft)) {
    const m = getMenu(menuKey(draft.base, draft.main, draft.side));
    if (m?.signature && dex.menus.includes(m.key)) return { text: baby ? '꺄아!' : `이거 「${m.name}」 맞지?!`, mood: 'happy' };
  }
  const idle = baby ? ['옹알옹알', '아부!'] : teen(s) ? ['…', '음.', '그래, 뭐.'] : ['음~', '그거 넣어?', '뭐 싸는 거야?'];
  return { text: idle[(it.id.length + s.age) % idle.length], mood: 'neutral' };
}

function morningView(s: GameState): string {
  const reqs = todayRequests(s);
  const v = voiceAge(s.age);
  const react = performance.now() < reactUntil ? kidReact(s) : undefined;
  const say = react ? react.text : reqs.length ? reqs.map((r) => r.say[v]).join(v === 15 ? ' …그리고 ' : ' 아 그리고! ') : hello(s);
  const tag = reqs.length ? reqs.map((r) => `${r.emoji} ${r.day}`).join(' + ') : s.age <= 1 ? '🍼 이유식 시간' : DAY_LABEL(s);
  const sel = isFull(draft) ? draft : undefined;
  const full = !!sel;
  const cost = sel ? selectionCost(s, sel) : 0;
  const short = full && cost > s.money;
  const menu = sel ? getMenu(menuKey(sel.base, sel.main, sel.side)) : undefined;
  const isNew = menu && !dex.menus.includes(menu.key);
  return `
  ${stage('kitchen', say, tag)}
  <section class="px-panel">
    ${hasLeave(s.age) ? `<div class="px-clock"><span>${canCommute(s.age) ? '등교까지' : '등원까지'}</span><div class="bar"><i id="clock" class="${timer < 10 ? 'low' : ''}" style="width:${(timer / MORNING_TIME) * 100}%"></i></div></div>` : ''}
    <div class="px-menu ${full ? '' : 'pending'}">${menu?.signature && !isNew ? '✨ ' : ''}${esc(menuLabel(draft))}${isNew ? ' <span class="new">NEW</span>' : ''}</div>
    <nav class="px-tabs">${SLOTS.map((sl) => `<button class="px-tab ${tab === sl ? 'on' : ''}" data-tab="${sl}">${SLOT_LABEL[sl]}${draft[sl] ? ' ✓' : ''}</button>`).join('')}</nav>
    <div class="px-foods">${available(s, tab).map((i) => `
      <button class="px-food ${draft[tab] === i.id ? 'on' : ''}" data-ing="${i.id}">
        <img src="${foodIcon(i.id)}" alt="">
        <span>${esc(i.name)}</span>
        <em class="price">${ingredientCost(s, i.id)}</em>
        ${s.child.known.dislikes.includes(i.id) ? '<i class="mark no">싫어</i>' : i.tags.some((t) => s.child.known.likes.includes(t)) ? '<i class="mark yes">좋아</i>' : ''}
      </button>`).join('')}</div>
    <div class="px-row tight">
      <button class="btn dice" data-act="random" aria-label="아무거나" ${busy ? 'disabled' : ''}>🎲</button>
      <button class="btn primary grow" data-act="pack" ${full && !short && !busy ? '' : 'disabled'}>${busy ? '뚜껑 닫는 중…' : short ? `반찬값이 모자라요 · ₩${cost}` : full ? `뚜껑 닫기 · ₩${cost}` : '세 칸을 다 채워 주세요'}</button>
    </div>
  </section>`;
}

function leaveSay(s: GameState): string {
  const a = s.age;
  if (a < 6) return '같이 가?';
  if (a < 10) return '다녀오겠습니다!';
  if (a < 13) return '다녀올게~';
  if (a < 16) return s.vigilance > 0.1 ? '…오늘은 따라오지 마.' : '다녀올게.';
  return a < 19 ? '늦을 거야. 기다리지 마.' : '이제 혼자 갈게.';
}

const LEAVE_BTN: Record<LeaveChoice, (s: GameState) => [string, string]> = {
  follow: (s) => (s.today?.forgot ? ['몰래 따라가서 전해 주기', '들키지 말고 사물함에 쏙'] : ['몰래 따라가 보기', '♥를 모을 수 있지만 들키면…']),
  trust: (s) => (s.age < 6 ? ['어린이집 차 태워 보내기', '자립심이 자란다'] : ['믿고 보내기', `자립심이 자란다${teen(s) && s.vigilance > 0.05 ? ' · 경계가 조금 풀린다' : ''}`]),
  escort: () => ['손잡고 같이 가기', '유대감이 자란다'],
};

function leaveView(s: GameState): string {
  const t = s.today!;
  const p = t.pack!;
  const mood = p.mood === 'happy' ? '도시락을 보더니 콧노래를 흥얼거린다.' : p.mood === 'grumpy' ? '도시락을 열어 보더니 인상을 쓴다.' : '도시락을 가방에 넣었다.';
  const warn = teen(s) && s.vigilance > 0.05 ? `<p class="px-warn">요즘 뒤를 자주 돌아본다… 경계 ${Math.round(s.vigilance * 100)}%</p>` : '';
  const opts = leaveOptions(s);
  return `
  ${stage('entry', t.forgot ? (teen(s) ? '다녀올게.' : '다녀오겠습니다!') : leaveSay(s), `${DAY_LABEL(s)} · 아침 8시`)}
  <section class="px-panel">
    <p class="px-line">${t.forgot ? '도시락을 가방에 넣는 걸 깜빡했다.' : mood}</p>
    ${t.forgot ? '<div class="px-alert">어? 신발장 앞에 도시락이…<br><b>두고 갔다!</b></div>' : ''}
    ${warn}
    ${opts.map((o, i) => { const [a, b] = LEAVE_BTN[o](s); return `<button class="btn wide ${i === 0 ? 'primary' : ''}" data-act="leave" data-v="${o}">${a}<small>${b}</small></button>`; }).join('')}
  </section>`;
}

function eveningView(s: GameState): string {
  const t = s.today!;
  const e = t.evening!;
  const p = t.pack!;
  const c = t.commute;
  const menu = p.meal.menu;
  const commuteLine = c ? `${c.over === 'caught' ? '등굣길에 들켰다' : c.over === 'lost' ? '등굣길에 놓쳤다' : c.delivered ? '몰래 배달 성공' : '교문까지 지켜봤다'} · ♥ ${Math.round(c.score)}` : '';
  const leaveLine = t.leave === 'escort' ? '오늘은 손잡고 같이 갔다.' : t.leave === 'trust' ? '오늘은 믿고 보냈다.' : '';
  const lines = [...e.extra, ...p.meal.lines].slice(0, 3);
  return `
  ${stage('kitchen', e.says.map(esc).join(' '), `${DAY_LABEL(s)} · 저녁`)}
  <section class="px-panel">
    <div class="px-menu">${menu.signature ? '✨ ' : ''}${esc(menu.name)}${p.meal.firstEver ? ' <span class="new">도감 등록</span>' : ''}</div>
    <div class="px-verdict">${s.age <= 1 ? ['다 뱉어 냈다…', '조금 먹었다', '잘 먹었다', '한 그릇 뚝딱!'][e.lunch] : ['그대로 돌아왔다…', '조금 먹고 남겼다', '거의 다 먹었다', '싹 비웠다!'][e.lunch]} <span class="px-stars">${'★'.repeat(e.lunch)}<span>${'★'.repeat(3 - e.lunch)}</span></span></div>
    ${commuteLine ? `<p class="px-line">${commuteLine}</p>${c?.moment ? `<p class="px-sub">「${esc(c.moment)}」</p>` : ''}` : leaveLine ? `<p class="px-line">${leaveLine}</p>` : ''}
    ${lines.length ? `<ul class="px-lines">${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
    ${chips(e.delta)}
    <button class="btn primary wide" data-act="next-day">${s.dayIndex + 1 < tuningOf(s).daysPerYear ? '다음 날' : '잘 자'}</button>
  </section>`;
}

// ───────────────────────── 화면: 결산 / 엔딩 ─────────────────────────
function renderSummary(s: GameState): string {
  const d: Delta = {};
  for (const k of STAT_KEYS) d[k] = s.stats[k] - s.yearStart[k];
  const lines = s.log.filter((l) => l.age === s.age).slice(-4);
  const hint = s.age >= 6 ? fmt(decideEnding(s).hint, s) : '';
  const days = s.album.filter((a) => a.age === s.age);
  return `
  ${stage('growth', '', `${s.age}살 · ${stageOf(s.age).name}`)}
  <section class="px-panel">
    <h2 class="px-h">${esc(s.child.name)}, 올 한 해</h2>
    ${days.length ? `<p class="px-line">점심 ${days.map((a) => '★'.repeat(a.lunch) || '☆').join(' · ')}</p>` : ''}
    ${chips(d)}
    ${hint ? `<p class="px-omen">이대로라면… ${esc(hint)}</p>` : ''}
    <ul class="px-lines">${lines.map((l) => `<li>${esc(l.text)}</li>`).join('')}</ul>
    <button class="btn primary wide" data-act="year">${s.age >= FINAL_AGE ? '🎓 스무 살이 되다' : `🎂 ${s.age + 1}살 생일`}</button>
  </section>`;
}

function renderEnding(s: GameState): string {
  const e = ENDING_BY_ID[s.endingId!];
  const stars = s.album.reduce((a, d) => a + d.lunch, 0);
  const follows = s.album.filter((d) => d.leave === 'follow').length;
  const caught = s.album.filter((d) => d.over === 'caught').length;
  return `
  ${stage('ending', '', `${esc(s.child.name)}의 스무 살`)}
  <section class="px-panel">
    <div class="px-sub">엔딩 ${ENDINGS.indexOf(e) + 1}/${ENDINGS.length}</div>
    <h2 class="px-h">${e.emoji} ${esc(e.title)}</h2>
    <p class="px-story">${esc(e.text)}</p>
    <div class="px-report">
      ${STAT_KEYS.map((k) => `<div>${STAT_INFO[k].label} <b>${Math.round(s.stats[k])}</b></div>`).join('')}
      <div>재능 <b>${TALENT_INFO[s.child.talent].label}</b></div>
      <div>점심 별 <b>${stars}</b></div>
      <div>메뉴 <b>${s.runMenus.length}</b>가지</div>
      <div>♥ <b>${s.hearts}</b></div>
      <div>따라간 날 <b>${follows}</b>${caught ? ` (들킴 ${caught})` : ''}</div>
    </div>
    <div class="px-row"><button class="btn" data-act="dex">도감</button><button class="btn primary" data-act="new">다시 키우기</button></div>
  </section>`;
}

// ───────────────────────── 겹쳐 뜨는 창 ─────────────────────────
function sheet(title: string, body: string): string {
  return `<div class="scrim" data-act="close"></div>
  <section class="sheet px-sheet" role="dialog" aria-label="${esc(title)}">
    <div class="sheet-head"><h2>${title}</h2><button class="x" data-act="close" aria-label="닫기">✕</button></div>
    ${body}
  </section>`;
}

function renderStats(s: GameState): string {
  const rows = STAT_KEYS.map((k) => {
    const v = Math.round(s.stats[k]);
    const d = Math.round(s.stats[k] - s.yearStart[k]);
    return `<div class="statrow">
      <div class="statrow-top"><span>${STAT_INFO[k].label}</span><b>${v}${d ? ` <small class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${d}</small>` : ''}</b></div>
      <div class="bar"><i style="width:${v}%" class="${v < 25 ? 'low' : v >= 75 ? 'high' : ''}"></i></div>
      <small>${STAT_DESC[k]}</small>
    </div>`;
  }).join('');
  return sheet(`${esc(s.child.name)}의 상태`, `<p class="sub">작은 숫자는 올해 변화량</p>${rows}`);
}

function renderMenu(): string {
  return sheet('메뉴', `<div class="stack">
    <button class="btn option" data-act="notebook"><span><b>육아 수첩</b><small>알아낸 취향과 지난 기록</small></span></button>
    <button class="btn option" data-act="dex"><span><b>도감</b><small>메뉴 ${dex.menus.length}/${ALL_MENUS.length} · 엔딩 ${dex.endings.length}/${ENDINGS.length}</small></span></button>
    <button class="btn option" data-act="settings"><span><b>설정</b><small>소리, 진동, 실험 설정</small></span></button>
    <button class="btn option" data-act="home"><span><b>타이틀로</b><small>진행 상황은 자동 저장돼요</small></span></button>
  </div>`);
}

function renderNotebook(s: GameState): string {
  const k = s.child.known;
  const list = (arr: string[]) => (arr.length ? arr.join(', ') : '아직 몰라요');
  const stars = s.album.slice(-10);
  return sheet('육아 수첩', `
    <div class="px-note-head"><img src="${faceIcon(s, 'happy')}" alt=""><span><b>${esc(s.child.name)}</b> · ${s.age}살</span></div>
    <dl class="note">
      <dt>좋아하는 맛</dt><dd>${esc(list(k.likes))}</dd>
      <dt>싫어하는 음식</dt><dd>${esc(list(k.dislikes.map((id) => ing(id).name)))}</dd>
      <dt>재능</dt><dd>${k.talent ? TALENT_INFO[s.child.talent].label : '11살 즈음 알 수 있을 것 같다'}</dd>
      <dt>이번 생에 먹인 메뉴</dt><dd>${s.runMenus.length}가지</dd>
      ${s.vigilance > 0.05 ? `<dt>경계심</dt><dd>${Math.round(s.vigilance * 100)}% — 믿고 보내면 풀린다</dd>` : ''}
    </dl>
    ${stars.length ? `<h3>최근 도시락</h3><ul class="lines">${stars.reverse().map((a) => `<li><small>${a.age}살</small> ${esc(getMenu(a.menu)?.name ?? '')} ${'★'.repeat(a.lunch) || '☆'}${a.over === 'caught' ? ' · 들킴' : a.leave === 'follow' ? ' · 따라감' : ''}</li>`).join('')}</ul>` : ''}
    <h3>최근 기록</h3>
    <ul class="lines">${s.log.slice(-12).reverse().map((l) => `<li><small>${l.age}살</small> ${esc(l.text)}</li>`).join('')}</ul>`);
}

function renderDex(): string {
  const groups = INGREDIENTS.filter((i) => i.slot === 'base').map((b) => {
    const list = ALL_MENUS.filter((m) => m.base === b.id);
    const found = list.filter((m) => dex.menus.includes(m.key));
    return `<details><summary><img src="${foodIcon(b.id)}" alt=""> ${esc(b.name)} <small>${found.length}/${list.length}</small></summary>
      <ul class="dex">${list.map((m) => (dex.menus.includes(m.key)
        ? `<li class="${m.signature ? 'sig' : ''}">${m.signature ? '✨ ' : ''}${esc(m.name)}</li>`
        : `<li class="unk">${m.signature ? '✨ ' : ''}???</li>`)).join('')}</ul></details>`;
  }).join('');
  const sig = ALL_MENUS.filter((m) => m.signature);
  return sheet('도감', `
    <p class="sub">메뉴 ${dex.menus.length}/${ALL_MENUS.length} · 특별 메뉴 ${sig.filter((m) => dex.menus.includes(m.key)).length}/${sig.length} · 플레이 ${dex.plays}회</p>
    <h3>엔딩</h3>
    <div class="endings">${ENDINGS.map((e) => (dex.endings.includes(e.id) ? `<div class="end">${e.emoji}<small>${esc(e.title)}</small></div>` : '<div class="end unk">?<small>???</small></div>')).join('')}</div>
    <h3>메뉴</h3>${groups}`);
}

function renderSettings(): string {
  const t: Tuning = { ...DEFAULT_TUNING, ...prefs.tuning };
  const seg = (key: keyof Tuning, values: number[], label: (v: number) => string) =>
    `<div class="seg">${values.map((v) => `<button class="${t[key] === v ? 'on' : ''}" data-act="tune" data-key="${key}" data-v="${v}">${label(v)}</button>`).join('')}</div>`;
  const income = t.incomeBase + t.incomePerDay * t.daysPerYear;
  const running = game && game.step !== 'ending' ? tuningOf(game) : undefined;
  return sheet('설정', `
    <div class="toggle-row"><span>효과음</span><button class="switch ${prefs.sound ? 'on' : ''}" data-act="pref" data-key="sound" aria-pressed="${prefs.sound}"><i></i></button></div>
    <div class="toggle-row"><span>진동</span><button class="switch ${prefs.haptics ? 'on' : ''}" data-act="pref" data-key="haptics" aria-pressed="${prefs.haptics}"><i></i></button></div>
    <h3>실험 설정 <small>새 게임부터 적용</small></h3>
    <div class="field"><span>1년에 보내는 하루</span>${seg('daysPerYear', [1, 2, 3], (v) => `${v}일`)}</div>
    <div class="field"><span>하루당 반찬값 수입</span>${seg('incomePerDay', [4, 5, 6, 7, 8], (v) => `${v}`)}</div>
    <div class="field"><span>재료 가격</span>${seg('priceMult', [0.8, 1, 1.2, 1.5], (v) => `×${v}`)}</div>
    <p class="sub">→ 1년 수입 ₩${income} · 한 판 ${t.daysPerYear * 20}일</p>
    ${running ? `<p class="sub">지금 판: 1년 ${running.daysPerYear}일 · 수입 ₩${yearlyIncome(game!)} · 가격 ×${running.priceMult}</p>` : ''}
    <button class="btn wide" data-act="tune-reset">기본값으로</button>`);
}

function renderOverlay(): string {
  if (!overlay) return '';
  if (overlay === 'dex') return renderDex();
  if (overlay === 'settings') return renderSettings();
  if (!game) return '';
  if (overlay === 'stats') return renderStats(game);
  if (overlay === 'menu') return renderMenu();
  return renderNotebook(game);
}

// ───────────────────────── 렌더 ─────────────────────────
function gameBody(s: GameState): string {
  if (eventResult) return renderEventResult(eventResult);
  if (s.step === 'ending') return renderEnding(s);
  if (s.active) return renderEvent(s);
  if (s.step === 'day' && s.today) {
    const ph = s.today.phase;
    return ph === 'morning' ? morningView(s) : ph === 'leave' ? leaveView(s) : eveningView(s);
  }
  return renderSummary(s);
}

function render(): void {
  const s = game;
  if (screen === 'game' && s?.step === 'day' && s.today?.phase === 'commute' && !s.active && !eventResult) return startCommute(s);
  sceneKind = undefined;
  let body: string;
  if (screen === 'intro') body = renderIntro();
  else if (screen === 'game' && s) body = `<div class="day-px">${hud(s)}${gameBody(s)}</div>`;
  else body = renderTitle();
  app.innerHTML = body + renderOverlay();
  sceneCanvas = document.getElementById('scene') as HTMLCanvasElement | null;
  if (sceneCanvas) fitScene(sceneCanvas, Number(sceneCanvas.dataset.h));
  syncTimer();
}

// ───────────────────────── 아침 시계 ─────────────────────────
function inMorning(): boolean {
  return screen === 'game' && !!game && game.step === 'day' && game.today?.phase === 'morning' && !game.active && !eventResult;
}
function syncTimer(): void {
  const run = inMorning() && hasLeave(game!.age) && !overlay && !busy;
  if (!run) { clearInterval(timerId); timerId = 0; return; }
  if (timerId) return;
  timerId = window.setInterval(() => {
    if (!inMorning() || overlay || busy || document.hidden) return;
    timer -= 0.25;
    const bar = document.getElementById('clock');
    if (bar) { bar.style.width = `${Math.max(0, (timer / MORNING_TIME) * 100)}%`; bar.classList.toggle('low', timer < 10); }
    if (timer <= 5 && Math.abs(timer % 1) < 0.01 && timer > 0) { sfx('tap'); haptic(12); }
    if (timer <= 0) closeLid(true);
  }, 250);
}
function resetMorning(): void { draft = {}; tab = 'base'; lastPick = undefined; timer = MORNING_TIME; lidT = -1; busy = false; }

/** 시간이 다 되면 빈 칸을 싼 재료로 허둥지둥 채운다 (반찬값 안에서) */
function hurryFill(s: GameState): Draft {
  const cheap = (slot: Slot) => [...available(s, slot)].sort((a, b) => ingredientCost(s, a.id) - ingredientCost(s, b.id))[0].id;
  const out: Draft = { ...draft };
  for (const sl of SLOTS) if (!out[sl]) out[sl] = cheap(sl);
  if (selectionCost(s, out as Required<Draft>) > s.money) for (const sl of SLOTS) out[sl] = cheap(sl);
  return out;
}

function closeLid(late = false): void {
  const s = game;
  if (!s || busy || !inMorning()) return;
  if (!late && (!isFull(draft) || selectionCost(s, draft) > s.money)) return;
  if (late) draft = hurryFill(s);
  busy = true;
  clearInterval(timerId); timerId = 0;
  lidT = 0;
  sfx('pack'); haptic(15);
  render();
  setTimeout(() => {
    if (!game || game !== s || !inMorning()) { busy = false; return; }
    const r = packToday(s, draft as Required<Draft>, new Set(dex.menus), late);
    if (!dex.menus.includes(r.meal.menu.key)) dex.menus.push(r.meal.menu.key);
    resetMorning();
    persist();
    render();
    if (s.today?.phase === 'evening') afterEvening(s);
  }, 900);
}

function afterEvening(s: GameState): void {
  const l = s.today?.evening?.lunch ?? 0;
  sfx(l >= 3 ? 'chime' : l >= 2 ? 'ding' : 'tap');
  if (l >= 3) spawn(fx, 'star', 77, 70, 10);
}

// ───────────────────────── 등굣길 ─────────────────────────
function startCommute(s: GameState): void {
  if (commuteOn) return;
  commuteOn = true;
  clearInterval(timerId); timerId = 0;
  sceneKind = undefined;
  const p = commuteParams(s);
  mountFollow(app, {
    age: p.level, standalone: false, label: `${s.age}살`, title: `${s.age}살 등굣길`, look: lookOf(s),
    mood: p.mood, lookMult: p.lookMult, forgot: p.forgot,
    onEnd: (r) => {
      unmountFollow();
      commuteOn = false;
      if (!game || game !== s || s.today?.phase !== 'commute') return;
      finishCommute(s, { over: r.over, delivered: r.delivered, score: r.score, bond: r.bond, indep: r.indep, happy: r.happy, moment: r.moment, log: r.log });
      persist();
      render();
      window.scrollTo({ top: 0 });
      afterEvening(s);
    },
  });
}

// ───────────────────────── 뒤로가기 (안드로이드 뒤로 = 브라우저 뒤로) ─────────────────────────
function openOverlay(o: Overlay): void {
  if (overlay) history.replaceState({ o }, '');
  else history.pushState({ o }, '');
  overlay = o;
  sfx('tap');
}
window.addEventListener('popstate', () => {
  if (overlay) overlay = undefined;
  else if (commuteOn) return void history.pushState({ g: 1 }, ''); // 등굣길 도중엔 나가지 않는다
  else if (screen !== 'title') screen = 'title';
  render();
});
function enterGame(): void { screen = 'game'; history.pushState({ g: 1 }, ''); }

// ───────────────────────── 행동 ─────────────────────────
function startNewGame(): void {
  clearRun();
  game = startGame(newGame(undefined, prefs.tuning));
  dex.plays += 1;
  eventResult = undefined; overlay = undefined;
  resetMorning();
}

function pickIngredient(s: GameState, id: string): void {
  const placedSlot = tab;
  const res = placeOrToggle(draft, tab, id);
  draft = res.draft; tab = res.tab;
  lastPick = res.placed ? id : undefined;
  if (res.placed) {
    const r = kidReact(s);
    const cell = bento.cells[placedSlot];
    spawn(fx, 'sparkle', BX + cell.x + cell.w / 2, BY + cell.y + cell.h / 2, 6);
    reactExpr = r?.mood === 'happy' ? 'happy' : r?.mood === 'grumpy' ? 'yuck' : 'surprise';
    reactUntil = performance.now() + 1500;
    if (r?.mood === 'happy') spawn(fx, 'heart', KID_X + 12, COUNTER_Y - 30, 4);
    if (r?.mood === 'grumpy') shake = 0.4;
    setTimeout(() => { if (inMorning() && !busy && !overlay) render(); }, 1550);
    sfx(r?.mood === 'happy' ? 'ding' : 'pop'); haptic(r?.mood === 'grumpy' ? 25 : 8);
  } else sfx('tap');
}

function onAct(el: HTMLElement): void {
  const act = el.dataset.act!;
  const s = game;
  let top = true;
  switch (act) {
    case 'new':
      if (overlay) history.replaceState(null, '');
      overlay = undefined;
      if (!prefs.seenIntro) { screen = 'intro'; introPage = 0; history.pushState({ g: 1 }, ''); break; }
      startNewGame(); enterGame(); break;
    case 'intro-next':
      if (introPage < INTRO.length - 1) { introPage++; sfx('tap'); break; }
      prefs.seenIntro = true; startNewGame(); screen = 'game'; break;
    case 'intro-skip': prefs.seenIntro = true; startNewGame(); screen = 'game'; break;
    case 'continue': enterGame(); break;
    case 'dex': openOverlay('dex'); break;
    case 'settings': openOverlay('settings'); break;
    case 'menu': openOverlay('menu'); break;
    case 'stats': openOverlay('stats'); break;
    case 'notebook': openOverlay('notebook'); break;
    case 'close': history.back(); return;
    case 'home': overlay = undefined; screen = 'title'; history.replaceState(null, ''); break;
    case 'event-ok': eventResult = undefined; sfx('tap'); break;
    case 'pref': {
      const key = el.dataset.key as 'sound' | 'haptics';
      prefs[key] = !prefs[key];
      setFeedbackPrefs(prefs); sfx('tap'); top = false; break;
    }
    case 'tune': prefs.tuning = { ...prefs.tuning, [el.dataset.key as keyof Tuning]: Number(el.dataset.v) }; sfx('tap'); top = false; break;
    case 'tune-reset': prefs.tuning = {}; top = false; break;
    case 'choice': {
      if (!s?.active) return;
      const a = s.active;
      const kind = s.step === 'milestone' ? `${s.age}살` : '어느 날';
      const r = chooseEventOption(s, Number(el.dataset.i));
      continueAfterEvent(s);
      eventResult = { id: a.id, emoji: a.emoji, title: a.title, text: r.text, delta: r.delta, money: r.money, kind };
      const ex = resultExpr(eventResult);
      if (ex === 'happy') spawn(fx, 'heart', 55, 28, 5); else if (ex === 'sad') spawn(fx, 'dust', 55, 50, 4);
      if (s.step === 'day') resetMorning();
      sfx('tap'); haptic(10);
      break;
    }
    case 'random': {
      if (!s || busy) return;
      const pick = (slot: Slot) => { const l = available(s, slot).filter((i) => !s.child.known.dislikes.includes(i.id)); return l[Math.floor(Math.random() * l.length)].id; };
      for (let i = 0; i < 20; i++) { draft = { base: pick('base'), main: pick('main'), side: pick('side') }; if (selectionCost(s, draft as Required<Draft>) <= s.money) break; }
      lastPick = draft.main; tab = 'side';
      sfx('pop'); haptic(8); top = false; break;
    }
    case 'pack': closeLid(); return;
    case 'leave': {
      if (!s) return;
      const v = el.dataset.v as LeaveChoice;
      chooseLeave(s, v);
      sfx('tap'); haptic(10);
      persist(); render();
      if (s.today?.phase === 'evening') afterEvening(s);
      window.scrollTo({ top: 0 });
      return;
    }
    case 'next-day':
      if (!s) return;
      endDay(s);
      resetMorning();
      sfx('tap');
      break;
    case 'year':
      if (!s) return;
      advanceYear(s);
      resetMorning();
      if (s.step === 'ending') { if (!dex.endings.includes(s.endingId!)) dex.endings.push(s.endingId!); sfx('chime'); }
      else sfx('ding');
      haptic(20);
      break;
    default: return;
  }
  persist();
  render();
  if (top) window.scrollTo({ top: 0 });
}

app.addEventListener('click', (e) => {
  if (commuteOn) return; // 등굣길은 follow-core가 처리
  const target = e.target as HTMLElement;
  const s = game;
  // 캔버스의 도시락 칸을 누르면 그 칸으로
  if (target.id === 'scene' && s && inMorning() && !busy) {
    const r = target.getBoundingClientRect();
    const x = ((e as MouseEvent).clientX - r.left) / (r.width / KW), y = ((e as MouseEvent).clientY - r.top) / (r.height / Number(target.dataset.h));
    for (const sl of SLOTS) { const c = bento.cells[sl]; if (x >= BX + c.x && x < BX + c.x + c.w && y >= BY + c.y && y < BY + c.y + c.h) { tab = sl; sfx('tap'); render(); return; } }
    return;
  }
  const el = target.closest<HTMLElement>('[data-act],[data-tab],[data-ing]');
  if (!el || (el as HTMLButtonElement).disabled) return;
  if (el.dataset.tab && !el.dataset.act) { tab = el.dataset.tab as Slot; sfx('tap'); render(); return; }
  if (el.dataset.ing) { if (!s || busy) return; pickIngredient(s, el.dataset.ing); render(); return; }
  onAct(el);
});

// ───────────────────────── 루프 ─────────────────────────
let last = performance.now();
function loop(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!commuteOn) drawScene(now, dt);
  requestAnimationFrame(loop);
}
window.addEventListener('resize', () => { if (sceneCanvas) fitScene(sceneCanvas, Number(sceneCanvas.dataset.h)); });

// 자동 테스트용 (게임 진행에는 영향 없음)
(window as unknown as { __game: () => unknown }).__game = () => game && { result: !!eventResult, step: game.step, age: game.age, phase: game.today?.phase, active: !!game.active, money: game.money, ending: game.endingId, opts: game.today ? leaveOptions(game) : [] };

void loadPartOverrides().catch(() => 0).then(() => { clearSprites(); render(); requestAnimationFrame(loop); });
