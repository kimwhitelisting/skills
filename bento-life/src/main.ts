import '@fontsource/gowun-dodum/400.css';
import '@fontsource/gaegu/700.css';
import './style.css';
import { art, characterArt, endingArt, eventArt, idleExpression, ingredientArt, type Expression } from './art.ts';
import { INGREDIENTS, ing } from './data/ingredients.ts';
import { displayDelta } from './game/apply.ts';
import { ALL_MENUS, available, getMenu, ingredientCost, isValidSelection, randomSelection, selectionCost, type MealResult, type Selection } from './game/bento.ts';
import { DEFAULT_TUNING, tuningOf, yearlyIncome, type Tuning } from './game/config.ts';
import { FINAL_AGE, FOLLOW_OPTIONS, MEAL_EMOJI, STAT_INFO, STAT_KEYS, TALENT_INFO, stageOf } from './game/constants.ts';
import { advanceYear, chooseEventOption, chooseFollow, continueAfterEvent, continueAfterMeal, eatMeal, isMealStep, mealsThisYear, startGame } from './game/engine.ts';
import { ENDINGS, ENDING_BY_ID, decideEnding } from './game/endings.ts';
import { josa } from './game/korean.ts';
import { menuKey } from './game/menus.ts';
import { clearRun, loadDex, loadRun, saveDex, saveRun, type Dex } from './game/save.ts';
import { newGame } from './game/state.ts';
import { fmt } from './game/text.ts';
import type { Delta, FollowLevel, GameState, Ingredient, MealTime, Slot, StatKey } from './game/types.ts';
import { haptic, setFeedbackPrefs, sfx } from './ui/feedback.ts';
import { loadPrefs, savePrefs } from './ui/prefs.ts';

// ───────────────────────── 화면 상태 ─────────────────────────
type Screen = 'title' | 'intro' | 'game';
type Overlay = 'stats' | 'menu' | 'notebook' | 'dex' | 'settings';
/** 직전 행동의 결과. "다음" 버튼 대신 다음 화면 맨 위에 붙어서 보인다 */
type Flash =
  | { kind: 'meal'; r: MealResult; title: string }
  | { kind: 'event'; title: string; emoji: string; text: string; delta: Delta; money: number }
  | { kind: 'follow'; title: string; emoji: string; delta: Delta };

const app = document.getElementById('app')!;
const prefs = loadPrefs();
setFeedbackPrefs(prefs);
let screen: Screen = 'title';
let overlay: Overlay | undefined;
let game: GameState | undefined = loadRun();
let dex: Dex = loadDex();
let flash: Flash | undefined;
let sel: Selection | undefined;
let tab: Slot = 'base';
let justPlaced: Slot | undefined;
/** 이번 도시락에서 마지막으로 고른 재료 (아이 말풍선 반응용) */
let lastPick: string | undefined;
let closing = false;
let introPage = 0;

const SLOTS: Slot[] = ['base', 'main', 'side'];
const SLOT_LABEL: Record<Slot, string> = { base: '주식', main: '메인', side: '반찬' };
const MOOD_EMOJI: Record<Expression, string> = { neutral: '🙂', happy: '😋', sad: '😢', yuck: '🤢' };
const STAT_DESC: Record<StatKey, string> = {
  health: '잘 먹고 안 아프기. 채소·균형 잡힌 도시락',
  smarts: '공부와 호기심. 생선·견과류, 든든한 아침',
  happy: '좋아하는 음식, 새로운 메뉴, 즐거운 추억',
  fitness: '고기·단백질, 저녁밥, 뛰어놀기',
  social: '친구 관계. 인기 있는 점심 도시락',
  indep: '혼자 해내는 힘. 너무 따라다니면 떨어진다',
  bond: '부모와의 정. 같이 먹는 저녁, 따뜻한 선택',
};

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const nl = (t: string) => esc(t).replace(/\n/g, '<br>');
const persist = () => { if (game) saveRun(game); saveDex(dex); savePrefs(prefs); };

// ───────────────────────── 작은 조각들 ─────────────────────────
const pic = (url: string | undefined, emoji: string, cls = '') =>
  url ? `<img class="pic ${cls}" src="${url}" alt="" draggable="false">` : `<span class="emo ${cls}">${emoji}</span>`;
const illust = (url: string | undefined, emoji: string) => `<figure class="illust">${pic(url, emoji)}</figure>`;

function avatarOf(s: GameState, expr: Expression): string {
  const stage = stageOf(s.age);
  return pic(characterArt(s, expr), stage.avatar[s.child.gender === 'boy' ? 0 : 1]);
}
const faceOf = (s: GameState, expr: Expression) => (characterArt(s, expr) ? avatarOf(s, expr) : `<span class="emo">${MOOD_EMOJI[expr]}</span>`);

function deltaChips(d: Delta, money = 0): string {
  const r = displayDelta(d);
  const chips = STAT_KEYS.filter((k) => r[k]).map((k) => {
    const v = r[k]!;
    return `<span class="chip ${v > 0 ? 'up' : 'down'}">${STAT_INFO[k].emoji} ${STAT_INFO[k].label} ${v > 0 ? '+' : ''}${v}</span>`;
  });
  if (money) chips.push(`<span class="chip ${money > 0 ? 'up' : 'down'}">💰 ${money > 0 ? '+' : ''}${money}</span>`);
  return chips.length ? `<div class="chips">${chips.join('')}</div>` : '';
}

/** 도시락통: 왼쪽 큰 칸 = 주식, 오른쪽 위/아래 = 메인/반찬. interactive면 칸을 눌러 탭 전환 */
function bentoBox(sel: Selection, opts: { small?: boolean; interactive?: boolean } = {}): string {
  const cell = (slot: Slot) => {
    const id = sel[slot];
    const attrs = opts.interactive ? `data-act="tab" data-slot="${slot}"` : '';
    const cls = [slot, opts.interactive && tab === slot ? 'active' : '', justPlaced === slot ? 'plop' : ''].join(' ');
    return `<div class="cell ${cls}" ${attrs}>${pic(ingredientArt(id), ing(id).emoji)}</div>`;
  };
  return `<div class="bento ${opts.small ? 'small' : ''} ${opts.interactive ? 'drop' : ''}">${SLOTS.map(cell).join('')}${opts.interactive ? '<div class="lid"><span>🎀</span></div>' : ''}</div>`;
}

const topEffects = (i: Ingredient) =>
  STAT_KEYS.filter((k) => i.stats[k]).sort((a, b) => Math.abs(i.stats[b]!) - Math.abs(i.stats[a]!)).slice(0, 2)
    .map((k) => `<span class="${i.stats[k]! > 0 ? 'up' : 'down'}">${STAT_INFO[k].emoji}${i.stats[k]! > 0 ? '+' : ''}${i.stats[k]}</span>`).join('');

// ───────────────────────── 화면: 타이틀 / 소개 ─────────────────────────
function renderTitle(): string {
  const canContinue = game && game.step !== 'ending';
  return `
  <main class="title">
    <div class="logo">${pic(art('ui/logo'), '🍱')}</div>
    <h1>도시락 육아</h1>
    <p class="sub">도시락 싸들고 졸졸 따라다니면<br>아이를 얼마나 잘 키울 수 있을까?</p>
    <div class="stack">
      ${canContinue ? `<button class="btn primary" data-act="continue">이어하기 · ${esc(game!.child.name)} ${game!.age}살</button>` : ''}
      <button class="btn ${canContinue ? '' : 'primary'}" data-act="new">새로 키우기</button>
      <button class="btn ghost" data-act="dex">📖 도감 ${dex.menus.length}/${ALL_MENUS.length} · 엔딩 ${dex.endings.length}/${ENDINGS.length}</button>
    </div>
    <button class="icon corner" data-act="settings" aria-label="설정">⚙️</button>
  </main>`;
}

const INTRO = [
  { emoji: '👶', title: '아이가 태어났어요', text: '스무 살이 될 때까지, 1년에 한 걸음씩 함께 키워 주세요.' },
  { emoji: '🍱', title: '매일 도시락을 싸요', text: '주식·메인·반찬을 골라 도시락통에 담아요.\n아이가 뭘 좋아하고 뭘 싫어하는지는 먹여 봐야 알 수 있어요.' },
  { emoji: '🔭', title: '얼마나 따라다닐까요?', text: '졸졸 따라다니면 든든하지만…\n너무 따라다니면 아이가 혼자 서지 못할지도 몰라요.' },
];
function renderIntro(): string {
  const p = INTRO[introPage];
  return `
  <main class="intro">
    <div class="dots">${INTRO.map((_, i) => `<i class="${i === introPage ? 'on' : ''}"></i>`).join('')}</div>
    ${illust(undefined, p.emoji)}
    <h2>${p.title}</h2>
    <p class="story center">${nl(p.text)}</p>
    <button class="link" data-act="intro-skip">건너뛰기</button>
  </main>`;
}

// ───────────────────────── 화면: 게임 ─────────────────────────
function renderHUD(s: GameState): string {
  const stage = stageOf(s.age);
  return `
  <header class="hud">
    <button class="who" data-act="stats" aria-label="스탯 보기">
      <span class="avatar">${avatarOf(s, idleExpression(s))}</span>
      <span class="who-text">
        <span class="name">${esc(s.child.name)} <small>${s.age}살 · ${stage.name}</small></span>
        <span class="life"><i style="width:${(s.age / FINAL_AGE) * 100}%"></i></span>
      </span>
    </button>
    <span class="money">💰${s.money}</span>
    <button class="icon" data-act="menu" aria-label="메뉴">☰</button>
  </header>`;
}

function renderFlash(f: Flash, s: GameState): string {
  const close = `<button class="x" data-act="flash-close" aria-label="닫기">✕</button>`;
  if (f.kind === 'meal') {
    const m = f.r.menu;
    return `
    <section class="flash meal-flash">${close}
      <div class="flash-row">
        ${bentoBox(m, { small: true })}
        <div class="face mood-${f.r.mood}">${faceOf(s, f.r.mood)}</div>
      </div>
      <div class="flash-title">${esc(f.title)} · ${m.signature ? '✨ ' : ''}${esc(m.name)}${f.r.firstEver ? ' <span class="new">도감 등록</span>' : ''}</div>
      <ul class="lines">${f.r.lines.map((l) => `<li>${nl(l)}</li>`).join('')}</ul>
      ${deltaChips(f.r.delta)}
    </section>`;
  }
  return `
  <section class="flash">${close}
    <div class="flash-title">${f.emoji} ${esc(f.title)}</div>
    ${f.kind === 'event' ? `<p class="story">${nl(f.text)}</p>` : ''}
    ${deltaChips(f.delta, f.kind === 'event' ? f.money : 0)}
  </section>`;
}

function renderEvent(s: GameState): string {
  const a = s.active!;
  return `
  <section class="card event">
    ${illust(eventArt(a.id, s), a.emoji)}
    <h2>${esc(a.title)}</h2>
    <p class="story">${nl(a.text)}</p>
    <div class="stack">
      ${a.choices.map((c, i) => `<button class="btn choice" data-act="choice" data-i="${i}" ${c.enabled ? '' : 'disabled'}>${esc(c.label)}${!c.enabled && c.hint ? `<small>🔒 ${esc(c.hint)}</small>` : ''}</button>`).join('')}
    </div>
  </section>`;
}

function renderFollow(s: GameState): string {
  return `
  <section class="card">
    <div class="kicker">${s.age}살의 한 해</div>
    <h2>올해는 얼마나 따라다닐까?</h2>
    <div class="stack">
      ${FOLLOW_OPTIONS.map((o) => `
        <button class="btn option ${s.follow === o.level ? 'prev' : ''}" data-act="follow" data-level="${o.level}">
          <span class="opt-emoji">${o.emoji}</span>
          <span><b>${o.title}</b>${s.follow === o.level ? ' <span class="tag">작년</span>' : ''}<small>${esc(o.desc(s.age))}</small></span>
        </button>`).join('')}
    </div>
  </section>`;
}

function ensureSelection(s: GameState, time: MealTime): Selection {
  if (!sel || !isValidSelection(s, sel)) {
    const last = s.lastMeals[time] && getMenu(s.lastMeals[time]!);
    sel = last && isValidSelection(s, last) ? { base: last.base, main: last.main, side: last.side } : randomSelection(s);
    tab = 'base';
  }
  return sel;
}

/** 아이가 조리대 너머에서 하는 말 — 이미 알아낸 취향에만 반응한다 (모르는 건 먹여 봐야 앎) */
function kidSays(s: GameState, cur: Selection): { text: string; expr: Expression } {
  const stage = stageOf(s.age).id;
  const baby = stage === 'infant';
  const teen = stage === 'teen' || stage === 'high';
  if (!lastPick) {
    if (!prefs.seenDragHint && !baby) return { text: '재료를 도시락통에 끌어다 넣어 줘!', expr: 'neutral' };
    const hello: Record<string, string> = {
      infant: '아부부… 맘마?', toddler: '오늘 도시락 뭐야?', child: '친구들이 부러워할 걸로 싸 줘!',
      teen: '…아무거나.', high: '야자 버틸 수 있게 든든하게…', adult: '이게 마지막 도시락이야?',
    };
    return { text: hello[stage], expr: 'neutral' };
  }
  const it = ing(lastPick);
  const menu = getMenu(menuKey(cur.base, cur.main, cur.side))!;
  if (s.child.known.dislikes.includes(it.id))
    return { text: baby ? '으앙…' : teen ? `${josa(it.name, '은/는')} 넣지 말라니까…` : `으… ${josa(it.name, '은/는')} 싫어!`, expr: 'yuck' };
  if (it.tags.some((t) => s.child.known.likes.includes(t)))
    return { text: baby ? '꺄르르!' : teen ? `오, ${it.name}. 나쁘지 않네.` : `${it.name}! 최고야!`, expr: 'happy' };
  if (menu.signature && dex.menus.includes(menu.key)) return { text: baby ? '꺄아!' : `이거 「${menu.name}」 맞지?!`, expr: 'happy' };
  if (!dex.menus.includes(menu.key)) return { text: baby ? '옹알옹알?' : '처음 보는 조합인데?', expr: 'neutral' };
  const idle = baby ? ['옹알옹알', '아부!'] : teen ? ['음.', '그래, 뭐.', '배고파…'] : ['음~ 뭐가 될까?', '오늘은 그걸로?', '배고파!'];
  return { text: idle[(it.id.length + s.age) % idle.length], expr: 'neutral' };
}

/** 도시락 싸기 = 부엌 장면: 조리대 너머 아이 · 도시락통 · 조리대 위 재료 */
function renderMeal(s: GameState): string {
  const time = s.step as MealTime;
  const cur = ensureSelection(s, time);
  const menu = getMenu(menuKey(cur.base, cur.main, cur.side))!;
  const known = dex.menus.includes(menu.key);
  const meals = mealsThisYear(s);
  const say = kidSays(s, cur);
  const items = available(s, tab).map((i, n) => {
    const disliked = s.child.known.dislikes.includes(i.id);
    const liked = i.tags.some((t) => s.child.known.likes.includes(t));
    return `<button class="ing ${cur[tab] === i.id ? 'on' : ''}" data-act="ing" data-slot="${tab}" data-id="${i.id}" style="--tilt:${((n * 37) % 7) - 3}deg">
      <span class="e">${pic(ingredientArt(i.id), i.emoji)}<span class="price">${ingredientCost(s, i.id)}</span>${disliked ? '<span class="mark">🙅</span>' : liked ? '<span class="mark">💗</span>' : ''}</span>
      <span class="n">${esc(i.name)}</span>
    </button>`;
  }).join('');
  return `
  <div class="kitchen">
    <div class="kid-zone">
      <span class="meal-tag">${MEAL_EMOJI[time]} ${esc(stageOf(s.age).meals[time])}${meals.length > 1 ? ` · ${meals.indexOf(time) + 1}/${meals.length}` : ''}</span>
      <div class="bubble mood-${say.expr}" ${lastPick ? 'data-pop' : ''}>${esc(say.text)}</div>
      <div class="kid mood-${say.expr}">${faceOf(s, say.expr === 'neutral' ? idleExpression(s) : say.expr)}</div>
    </div>
    <div class="counter">
      <div class="board">
        ${bentoBox(cur, { interactive: true })}
        <div class="menu-label">${known ? (menu.signature ? '✨ ' : '') + esc(menu.name) : `${esc(menu.name)} <span class="new">NEW</span>`}</div>
        <div class="sel-info">${esc(ing(cur[tab]).name)} <span class="fx">${topEffects(ing(cur[tab]))}</span></div>
      </div>
      <nav class="labels" role="tablist">
        ${SLOTS.map((sl) => `<button class="label ${sl} ${tab === sl ? 'on' : ''}" data-act="tab" data-slot="${sl}" role="tab">${SLOT_LABEL[sl]}</button>`).join('')}
      </nav>
      <div class="spread">${items}</div>
    </div>
  </div>`;
}

function renderSummary(s: GameState): string {
  const d: Delta = {};
  for (const k of STAT_KEYS) d[k] = s.stats[k] - s.yearStart[k];
  const lines = s.log.filter((l) => l.age === s.age).slice(-5);
  const hint = s.age >= 6 ? fmt(decideEnding(s).hint, s) : '';
  return `
  <section class="card summary">
    <div class="kicker">한 해 결산</div>
    <div class="summary-face"><div class="face big">${faceOf(s, idleExpression(s))}</div></div>
    <h2>${esc(s.child.name)}, ${s.age}살의 기록</h2>
    ${deltaChips(d)}
    ${hint ? `<p class="omen">🔮 이대로라면… ${esc(hint)}</p>` : ''}
    <ul class="lines">${lines.map((l) => `<li>${esc(l.text)}</li>`).join('')}</ul>
  </section>`;
}

function renderEnding(s: GameState): string {
  const e = ENDING_BY_ID[s.endingId!];
  return `
  <section class="card ending">
    <div class="kicker center">${esc(s.child.name)}의 스무 살</div>
    ${illust(endingArt(e.id, s), e.emoji)}
    <h2>${esc(e.title)}</h2>
    <p class="story">${esc(e.text)}</p>
    <div class="final">
      ${STAT_KEYS.map((k) => `<div>${STAT_INFO[k].emoji} ${STAT_INFO[k].label} <b>${Math.round(s.stats[k])}</b></div>`).join('')}
      <div>🍱 이번 생 메뉴 <b>${s.runMenus.length}</b></div>
      <div>✨ 재능 <b>${TALENT_INFO[s.child.talent].label}</b></div>
    </div>
    <button class="btn ghost wide" data-act="dex">📖 도감 보기</button>
  </section>`;
}

function renderGameBody(s: GameState): string {
  if (s.step === 'ending') return renderEnding(s);
  if (s.active) return renderEvent(s);
  if (s.step === 'follow') return renderFollow(s);
  if (isMealStep(s.step)) return renderMeal(s);
  return renderSummary(s);
}

// ───────────────────────── 하단 고정 버튼 (엄지 영역) ─────────────────────────
function renderBottomBar(): string {
  if (screen === 'intro') {
    const last = introPage === INTRO.length - 1;
    return `<footer class="bottombar"><button class="btn primary grow" data-act="intro-next">${last ? '시작하기' : '다음'}</button></footer>`;
  }
  if (screen !== 'game' || !game || overlay) return '';
  const s = game;
  if (isMealStep(s.step) && !s.active && sel) {
    const cost = selectionCost(s, sel);
    const short = cost > s.money;
    return `<footer class="bottombar">
      <button class="btn square round" data-act="random" aria-label="아무거나">🎲</button>
      <button class="btn primary grow lid-btn" data-act="pack" ${short ? 'disabled' : ''}>${short ? `반찬값이 모자라요 · 💰${cost}` : `🍱 뚜껑 닫기 · 💰${cost}`}</button>
    </footer>`;
  }
  if (s.step === 'summary' && !s.active)
    return `<footer class="bottombar"><button class="btn primary grow" data-act="year">${s.age >= FINAL_AGE ? '🎓 스무 살이 되다' : `🎂 ${s.age + 1}살 생일`}</button></footer>`;
  if (s.step === 'ending') return `<footer class="bottombar"><button class="btn primary grow" data-act="new">다시 키우기</button></footer>`;
  return '';
}

// ───────────────────────── 겹쳐 뜨는 창 ─────────────────────────
function sheet(title: string, body: string): string {
  return `<div class="scrim" data-act="close"></div>
  <section class="sheet" role="dialog" aria-label="${esc(title)}">
    <div class="sheet-head"><h2>${title}</h2><button class="x" data-act="close" aria-label="닫기">✕</button></div>
    ${body}
  </section>`;
}

function renderStats(s: GameState): string {
  const rows = STAT_KEYS.map((k) => {
    const v = Math.round(s.stats[k]);
    const d = Math.round(s.stats[k] - s.yearStart[k]);
    return `<div class="statrow">
      <div class="statrow-top"><span>${STAT_INFO[k].emoji} ${STAT_INFO[k].label}</span><b>${v}${d ? ` <small class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${d}</small>` : ''}</b></div>
      <div class="bar"><i style="width:${v}%" class="${v < 25 ? 'low' : v >= 75 ? 'high' : ''}"></i></div>
      <small>${STAT_DESC[k]}</small>
    </div>`;
  }).join('');
  return sheet(`${esc(s.child.name)}의 상태`, `<p class="sub">괄호 안 숫자는 올해 변화량</p>${rows}`);
}

function renderMenu(): string {
  return sheet('메뉴', `<div class="stack">
    <button class="btn option" data-act="notebook"><span class="opt-emoji">📒</span><span><b>육아 수첩</b><small>알아낸 취향과 지난 기록</small></span></button>
    <button class="btn option" data-act="dex"><span class="opt-emoji">📖</span><span><b>도감</b><small>메뉴 ${dex.menus.length}/${ALL_MENUS.length} · 엔딩 ${dex.endings.length}/${ENDINGS.length}</small></span></button>
    <button class="btn option" data-act="settings"><span class="opt-emoji">⚙️</span><span><b>설정</b><small>소리, 진동, 실험 설정</small></span></button>
    <button class="btn option" data-act="home"><span class="opt-emoji">🏠</span><span><b>타이틀로</b><small>진행 상황은 자동 저장돼요</small></span></button>
  </div>`);
}

function renderNotebook(s: GameState): string {
  const k = s.child.known;
  const list = (arr: string[]) => (arr.length ? arr.join(', ') : '아직 몰라요');
  return sheet('📒 육아 수첩', `
    <dl class="note">
      <dt>💗 좋아하는 맛</dt><dd>${esc(list(k.likes))}</dd>
      <dt>🙅 싫어하는 음식</dt><dd>${esc(list(k.dislikes.map((id) => ing(id).name)))}</dd>
      <dt>✨ 재능</dt><dd>${k.talent ? TALENT_INFO[s.child.talent].label : '11살 즈음 알 수 있을 것 같다'}</dd>
      <dt>🍱 이번 생에 먹인 메뉴</dt><dd>${s.runMenus.length}가지</dd>
    </dl>
    <h3>최근 기록</h3>
    <ul class="lines">${s.log.slice(-12).reverse().map((l) => `<li><small>${l.age}살</small> ${esc(l.text)}</li>`).join('')}</ul>`);
}

function renderDex(): string {
  const groups = INGREDIENTS.filter((i) => i.slot === 'base').map((b) => {
    const list = ALL_MENUS.filter((m) => m.base === b.id);
    const found = list.filter((m) => dex.menus.includes(m.key));
    return `<details><summary>${b.emoji} ${esc(b.name)} <small>${found.length}/${list.length}</small></summary>
      <ul class="dex">${list.map((m) => (dex.menus.includes(m.key)
        ? `<li class="${m.signature ? 'sig' : ''}">${m.signature ? '✨ ' : ''}${esc(m.name)}</li>`
        : `<li class="unk">${m.signature ? '✨ ' : ''}???</li>`)).join('')}</ul></details>`;
  }).join('');
  const sig = ALL_MENUS.filter((m) => m.signature);
  return sheet('📖 도감', `
    <p class="sub">메뉴 ${dex.menus.length}/${ALL_MENUS.length} · 특별 메뉴 ${sig.filter((m) => dex.menus.includes(m.key)).length}/${sig.length} · 플레이 ${dex.plays}회</p>
    <h3>엔딩</h3>
    <div class="endings">${ENDINGS.map((e) => (dex.endings.includes(e.id) ? `<div class="end">${e.emoji}<small>${esc(e.title)}</small></div>` : '<div class="end unk">❔<small>???</small></div>')).join('')}</div>
    <h3>메뉴</h3>${groups}`);
}

function renderSettings(): string {
  const t: Tuning = { ...DEFAULT_TUNING, ...prefs.tuning };
  const seg = (key: keyof Tuning, values: number[], label: (v: number) => string) =>
    `<div class="seg">${values.map((v) => `<button class="${t[key] === v ? 'on' : ''}" data-act="tune" data-key="${key}" data-v="${v}">${label(v)}</button>`).join('')}</div>`;
  const income = t.incomeBase + t.incomePerMeal * t.mealsPerYear;
  const running = game && game.step !== 'ending' ? tuningOf(game) : undefined;
  return sheet('⚙️ 설정', `
    <div class="toggle-row"><span>🔊 효과음</span><button class="switch ${prefs.sound ? 'on' : ''}" data-act="pref" data-key="sound" aria-pressed="${prefs.sound}"><i></i></button></div>
    <div class="toggle-row"><span>📳 진동</span><button class="switch ${prefs.haptics ? 'on' : ''}" data-act="pref" data-key="haptics" aria-pressed="${prefs.haptics}"><i></i></button></div>
    <h3>🧪 실험 설정 <small>새 게임부터 적용</small></h3>
    <div class="field"><span>1년에 싸는 도시락</span>${seg('mealsPerYear', [1, 2, 3], (v) => `${v}번`)}</div>
    <div class="field"><span>끼니당 반찬값 수입</span>${seg('incomePerMeal', [4, 5, 6, 7, 8], (v) => `${v}`)}</div>
    <div class="field"><span>재료 가격</span>${seg('priceMult', [0.8, 1, 1.2, 1.5], (v) => `×${v}`)}</div>
    <p class="sub">→ 1년 수입 💰${income} · 한 판 도시락 ${t.mealsPerYear * 20}번</p>
    ${running ? `<p class="sub">지금 판: 1년 ${running.mealsPerYear}번 · 수입 💰${yearlyIncome(game!)} · 가격 ×${running.priceMult}</p>` : ''}
    <button class="btn ghost wide" data-act="tune-reset">기본값으로</button>`);
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
let toastFor: Flash | undefined;
function scheduleToastHide(f: Flash): void {
  if (toastFor === f) return;
  toastFor = f;
  const ms = f.kind === 'meal' ? 2600 + f.r.lines.length * 900 : 2600;
  setTimeout(() => {
    if (flash !== f) return;
    app.querySelector('.toast')?.classList.add('out');
    setTimeout(() => { if (flash === f) { flash = undefined; app.querySelector('.toast')?.remove(); } }, 280);
  }, ms);
}
function render(): void {
  let main: string;
  if (screen === 'intro') main = renderIntro();
  else if (screen === 'game' && game) {
    // 도시락 화면에서는 직전 결과를 잠깐 떠 있는 알림으로 (재료 칸을 밀어내지 않게)
    const asToast = !!flash && isMealStep(game.step) && !game.active && !overlay;
    const flashHtml = flash ? renderFlash(flash, game) : '';
    main = `${renderHUD(game)}<main class="page">${flash && !asToast ? flashHtml : ''}${renderGameBody(game)}</main>${asToast ? `<div class="toast" data-act="flash-close">${flashHtml}</div>` : ''}`;
    if (asToast) scheduleToastHide(flash!);
  }
  else main = renderTitle();
  const bar = renderBottomBar();
  const kitchen = screen === 'game' && !!game && isMealStep(game.step) && !game.active;
  app.className = [bar ? 'has-bar' : '', kitchen ? 'in-kitchen' : ''].join(' ');
  app.innerHTML = main + bar + renderOverlay();
  justPlaced = undefined;
}

// ───────────────────────── 뒤로가기 (안드로이드 뒤로 버튼 = 브라우저 뒤로) ─────────────────────────
function openOverlay(o: Overlay): void {
  if (overlay) history.replaceState({ o }, '');
  else history.pushState({ o }, '');
  overlay = o;
  sfx('tap');
}
const closeOverlay = () => history.back();

window.addEventListener('popstate', () => {
  if (overlay) overlay = undefined;
  else if (screen !== 'title') screen = 'title';
  render();
});

function enterGame(): void {
  screen = 'game';
  history.pushState({ g: 1 }, '');
}

// ───────────────────────── 행동 ─────────────────────────
function startNewGame(): void {
  clearRun();
  game = startGame(newGame(undefined, prefs.tuning));
  dex.plays += 1;
  flash = undefined; sel = undefined; tab = 'base'; overlay = undefined;
}

function place(slot: Slot, id: string): void {
  if (!sel) return;
  sel = { ...sel, [slot]: id };
  justPlaced = slot;
  lastPick = id;
  flash = undefined;
  const i = SLOTS.indexOf(slot);
  if (i < SLOTS.length - 1) tab = SLOTS[i + 1]; // 다음 칸으로 자동 이동
  sfx('pop');
  haptic(8);
}

function onAct(act: string, el: HTMLElement): void {
  const s = game;
  let scrollTop = true;
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
    case 'close': closeOverlay(); return;
    case 'home': overlay = undefined; screen = 'title'; history.replaceState(null, ''); break;
    case 'flash-close': flash = undefined; scrollTop = false; break;
    case 'pref': {
      const key = el.dataset.key as 'sound' | 'haptics';
      prefs[key] = !prefs[key];
      setFeedbackPrefs(prefs); sfx('tap'); scrollTop = false; break;
    }
    case 'tune': {
      const key = el.dataset.key as keyof Tuning;
      prefs.tuning = { ...prefs.tuning, [key]: Number(el.dataset.v) };
      sfx('tap'); scrollTop = false; break;
    }
    case 'tune-reset': prefs.tuning = {}; scrollTop = false; break;
    case 'choice': {
      if (!s?.active) return;
      const a = s.active;
      const r = chooseEventOption(s, Number(el.dataset.i));
      continueAfterEvent(s);
      flash = { kind: 'event', title: a.title, emoji: a.emoji, text: r.text, delta: r.delta, money: r.money };
      sfx('tap'); haptic(10);
      break;
    }
    case 'follow': {
      if (!s) return;
      const level = Number(el.dataset.level) as FollowLevel;
      const o = FOLLOW_OPTIONS[level];
      flash = { kind: 'follow', delta: chooseFollow(s, level), title: o.title, emoji: o.emoji };
      sfx('tap'); haptic(10);
      break;
    }
    case 'tab': tab = el.dataset.slot as Slot; scrollTop = false; sfx('tap'); break;
    case 'ing': place(el.dataset.slot as Slot, el.dataset.id!); scrollTop = false; break;
    case 'random': if (s) { sel = randomSelection(s); lastPick = sel.main; flash = undefined; sfx('pop'); haptic(8); } scrollTop = false; break;
    case 'pack': {
      if (!s || !sel || closing) return;
      // 뚜껑이 닫히는 연출 뒤에 실제로 싼다
      closing = true;
      app.classList.add('busy');
      app.querySelector('.bento.drop')?.classList.add('closing');
      sfx('tap');
      setTimeout(() => { closing = false; app.classList.remove('busy'); onAct('pack-now', el); }, 620);
      return;
    }
    case 'pack-now': {
      if (!s || !sel) return;
      const time = s.step as MealTime;
      const r = eatMeal(s, sel, new Set(dex.menus));
      if (!dex.menus.includes(r.menu.key)) dex.menus.push(r.menu.key);
      continueAfterMeal(s);
      flash = { kind: 'meal', r, title: `${MEAL_EMOJI[time]} ${stageOf(s.age).meals[time]}` };
      prefs.seenDragHint = true;
      sel = undefined;
      lastPick = undefined;
      sfx(r.firstEver && r.menu.signature ? 'chime' : r.lines.some((l) => l.includes('발견')) ? 'ding' : 'pack');
      haptic(r.mood === 'yuck' || r.mood === 'sad' ? 30 : 15);
      break;
    }
    case 'year':
      if (!s) return;
      advanceYear(s);
      flash = undefined;
      if (s.step === 'ending') {
        if (!dex.endings.includes(s.endingId!)) dex.endings.push(s.endingId!);
        sfx('chime');
      } else sfx('ding');
      haptic(20);
      break;
    default: return;
  }
  persist();
  render();
  if (scrollTop) window.scrollTo({ top: 0 });
}

// ───────────────────────── 끌어다 담기 (포인터 이벤트) ─────────────────────────
let drag: { id: string; slot: Slot; x: number; y: number; ghost?: HTMLElement } | undefined;
let suppressClick = false;

const overBento = (x: number, y: number) => {
  const b = app.querySelector('.bento.drop')?.getBoundingClientRect();
  return !!b && x >= b.left - 12 && x <= b.right + 12 && y >= b.top - 12 && y <= b.bottom + 12;
};

app.addEventListener('pointerdown', (e) => {
  const chip = (e.target as HTMLElement).closest<HTMLElement>('.ing');
  if (!chip) return;
  drag = { id: chip.dataset.id!, slot: chip.dataset.slot as Slot, x: e.clientX, y: e.clientY };
});

window.addEventListener('pointermove', (e) => {
  if (!drag) return;
  if (!drag.ghost) {
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) return;
    const g = document.createElement('div');
    g.className = 'drag-ghost';
    g.innerHTML = pic(ingredientArt(drag.id), ing(drag.id).emoji);
    document.body.append(g);
    drag.ghost = g;
    app.classList.add('dragging');
  }
  drag.ghost.style.transform = `translate(${e.clientX - 32}px, ${e.clientY - 32}px)`;
  app.querySelector('.bento.drop')?.classList.toggle('over', overBento(e.clientX, e.clientY));
});

function endDrag(e: PointerEvent, cancelled: boolean): void {
  if (!drag) return;
  const d = drag;
  drag = undefined;
  if (!d.ghost) return;
  d.ghost.remove();
  app.classList.remove('dragging');
  suppressClick = true;
  setTimeout(() => { suppressClick = false; }, 0);
  if (!cancelled && overBento(e.clientX, e.clientY)) {
    place(d.slot, d.id);
    persist();
    render();
  } else app.querySelector('.bento.drop')?.classList.remove('over');
}
window.addEventListener('pointerup', (e) => endDrag(e, false));
window.addEventListener('pointercancel', (e) => endDrag(e, true));

app.addEventListener('click', (ev) => {
  if (suppressClick) return;
  const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
  if (el && !(el as HTMLButtonElement).disabled) onAct(el.dataset.act!, el);
});

render();
