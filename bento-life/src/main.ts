import '@fontsource/gowun-dodum/400.css';
import '@fontsource/gaegu/700.css';
import './style.css';
import { art, characterArt, endingArt, eventArt, idleExpression, ingredientArt, type Expression } from './art.ts';
import { INGREDIENTS, ing } from './data/ingredients.ts';
import { displayDelta } from './game/apply.ts';
import { ALL_MENUS, available, getMenu, isValidSelection, randomSelection, selectionCost, type MealResult, type Selection } from './game/bento.ts';
import { FINAL_AGE, FOLLOW_OPTIONS, MEAL_EMOJI, STAT_INFO, STAT_KEYS, TALENT_INFO, stageOf } from './game/constants.ts';
import { advanceYear, chooseEventOption, chooseFollow, continueAfterEvent, continueAfterMeal, eatMeal, isMealStep, startGame, type ChoiceResult } from './game/engine.ts';
import { ENDINGS, ENDING_BY_ID } from './game/endings.ts';
import { menuKey } from './game/menus.ts';
import { clearRun, loadDex, loadRun, saveDex, saveRun, type Dex } from './game/save.ts';
import { newGame } from './game/state.ts';
import type { Delta, FollowLevel, GameState, Ingredient, Slot } from './game/types.ts';

type Screen = 'title' | 'game' | 'dex' | 'notebook';
type Result =
  | { kind: 'meal'; r: MealResult; title: string }
  | { kind: 'event'; r: ChoiceResult; title: string; emoji: string }
  | { kind: 'follow'; delta: Delta; title: string; emoji: string };

const app = document.getElementById('app')!;
let screen: Screen = 'title';
let game: GameState | undefined = loadRun();
let dex: Dex = loadDex();
let result: Result | undefined;
let sel: Selection | undefined;

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const nl = (t: string) => esc(t).replace(/\n/g, '<br>');
const persist = () => { if (game) saveRun(game); saveDex(dex); };

function deltaChips(d: Delta, money = 0): string {
  const r = displayDelta(d);
  const chips = STAT_KEYS.filter((k) => r[k]).map((k) => {
    const v = r[k]!;
    return `<span class="chip ${v > 0 ? 'up' : 'down'}">${STAT_INFO[k].emoji} ${STAT_INFO[k].label} ${v > 0 ? '+' : ''}${v}</span>`;
  });
  if (money) chips.push(`<span class="chip ${money > 0 ? 'up' : 'down'}">💰 ${money > 0 ? '+' : ''}${money}</span>`);
  return chips.length ? `<div class="chips">${chips.join('')}</div>` : '';
}

/** 그림이 있으면 그림, 없으면 이모지 */
const pic = (url: string | undefined, emoji: string, cls = '') =>
  url ? `<img class="pic ${cls}" src="${url}" alt="" draggable="false">` : `<span class="emo ${cls}">${emoji}</span>`;

/** 이벤트/엔딩용 그림 액자 (그림책 한 장면) */
const illust = (url: string | undefined, emoji: string) =>
  `<figure class="illust ${url ? 'has-art' : ''}">${pic(url, emoji)}</figure>`;

const MOOD_EMOJI: Record<Expression, string> = { neutral: '🙂', happy: '😋', sad: '😢', yuck: '🤢' };

function avatarOf(s: GameState, expr: Expression): string {
  const stage = stageOf(s.age);
  return pic(characterArt(s, expr), stage.avatar[s.child.gender === 'boy' ? 0 : 1]);
}

/** 도시락통: 왼쪽 큰 칸 = 주식, 오른쪽 위/아래 = 메인/반찬 */
function bentoBox(sel: Selection, small = false): string {
  const cell = (id: string, slot: string) => `<div class="cell ${slot}">${pic(ingredientArt(id), ing(id).emoji)}</div>`;
  return `<div class="bento ${small ? 'small' : ''}">${cell(sel.base, 'base')}${cell(sel.main, 'main')}${cell(sel.side, 'side')}</div>`;
}

const effectIcons = (i: Ingredient) =>
  STAT_KEYS.filter((k) => i.stats[k]).map((k) => `${STAT_INFO[k].emoji}${i.stats[k]! > 0 ? '+' : ''}${i.stats[k]}`).join(' ');

// ───────────────────────── 화면 ─────────────────────────
function renderTitle(): string {
  const canContinue = game && game.step !== 'ending';
  return `
  <main class="title">
    <div class="logo">${pic(art('ui/logo'), '🍱')}</div>
    <h1>도시락 육아</h1>
    <p class="sub">도시락 싸들고 졸졸 따라다니면<br>아이를 얼마나 잘 키울 수 있을까?</p>
    <div class="stack">
      ${canContinue ? `<button class="btn primary" data-act="continue">이어하기 · ${esc(game!.child.name)} ${game!.age}살</button>` : ''}
      <button class="btn ${canContinue ? '' : 'primary'}" data-act="new">새로 시작</button>
      <button class="btn ghost" data-act="dex">📖 도감 (${dex.menus.length}/${ALL_MENUS.length} · 엔딩 ${dex.endings.length}/${ENDINGS.length})</button>
    </div>
  </main>`;
}

function renderHeader(s: GameState): string {
  const stage = stageOf(s.age);
  const bars = STAT_KEYS.map((k) => {
    const v = Math.round(s.stats[k]);
    return `<div class="stat"><span>${STAT_INFO[k].emoji}</span><div class="bar"><i style="width:${v}%" class="${v < 25 ? 'low' : v >= 75 ? 'high' : ''}"></i></div><b>${v}</b></div>`;
  }).join('');
  return `
  <header class="hud">
    <div class="who">
      <div class="avatar">${avatarOf(s, idleExpression(s))}</div>
      <div><div class="name">${esc(s.child.name)} <small>${s.age}살 · ${stage.name}</small></div>
      <div class="money">💰 ${s.money} · ${s.age}/${FINAL_AGE}년</div></div>
      <button class="icon" data-act="notebook" aria-label="육아 수첩">📒</button>
      <button class="icon" data-act="home" aria-label="홈">🏠</button>
    </div>
    <div class="stats">${bars}</div>
  </header>`;
}

function renderResult(r: Result, s: GameState): string {
  if (r.kind === 'meal') {
    const m = r.r.menu;
    return `
    <section class="card result">
      <div class="kicker">${esc(r.title)}</div>
      <div class="reaction">
        ${bentoBox(m, true)}
        <div class="face mood-${r.r.mood}">${characterArt(s, r.r.mood) ? avatarOf(s, r.r.mood) : `<span class="emo">${MOOD_EMOJI[r.r.mood]}</span>`}</div>
      </div>
      <h2>${m.signature ? '✨ ' : ''}${esc(m.name)}</h2>
      ${r.r.firstEver ? '<div class="badge">📖 도감 신규 등록!</div>' : ''}
      <ul class="lines">${r.r.lines.map((l) => `<li>${nl(l)}</li>`).join('')}</ul>
      ${deltaChips(r.r.delta)}
      <button class="btn primary" data-act="next">다음</button>
    </section>`;
  }
  if (r.kind === 'follow') {
    return `
    <section class="card result">
      ${illust(undefined, r.emoji)}
      <h2>${esc(r.title)}</h2>
      ${deltaChips(r.delta)}
      <button class="btn primary" data-act="next">도시락 싸러 가기</button>
    </section>`;
  }
  return `
  <section class="card result">
    <div class="kicker">${esc(r.title)}</div>
    <p class="story">${nl(r.r.text)}</p>
    ${deltaChips(r.r.delta, r.r.money)}
    <button class="btn primary" data-act="next">다음</button>
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
          <span><b>${o.title}</b><small>${esc(o.desc(s.age))}</small></span>
        </button>`).join('')}
    </div>
  </section>`;
}

const SLOT_LABEL: Record<Slot, string> = { base: '주식', main: '메인', side: '반찬' };

function renderMeal(s: GameState): string {
  const time = s.step as 'breakfast' | 'lunch' | 'dinner';
  if (!sel || !isValidSelection(s, sel)) {
    const last = s.lastMeals[time] && getMenu(s.lastMeals[time]!);
    sel = last && isValidSelection(s, last) ? { base: last.base, main: last.main, side: last.side } : randomSelection(s);
  }
  const cost = selectionCost(sel);
  const key = menuKey(sel.base, sel.main, sel.side);
  const menu = getMenu(key)!;
  const known = dex.menus.includes(key);
  const rows = (['base', 'main', 'side'] as Slot[]).map((slot) => `
    <div class="slot">
      <div class="slot-label">${SLOT_LABEL[slot]}</div>
      <div class="ings">
        ${available(s, slot).map((i) => {
          const disliked = s.child.known.dislikes.includes(i.id);
          const liked = i.tags.some((t) => s.child.known.likes.includes(t));
          return `<button class="ing ${sel![slot] === i.id ? 'on' : ''}" data-act="ing" data-slot="${slot}" data-id="${i.id}">
            <span class="e">${pic(ingredientArt(i.id), i.emoji)}</span><span class="n">${esc(i.name)}${disliked ? ' 🙅' : liked ? ' 💗' : ''}</span>
            <span class="fx">${effectIcons(i)}</span><span class="c">💰${i.cost}</span></button>`;
        }).join('')}
      </div>
    </div>`).join('');
  return `
  <section class="card meal">
    <div class="kicker">${MEAL_EMOJI[time]} ${esc(stageOf(s.age).meals[time])}</div>
    <div class="preview">
      ${bentoBox(sel)}
      <div class="pname">${known ? (menu.signature ? '✨ ' : '') + esc(menu.name) : `<span class="q">${esc(menu.name)}</span> <span class="new">NEW</span>`}</div>
    </div>
    ${rows}
    <div class="row">
      <button class="btn small ghost" data-act="random">🎲 아무거나</button>
      <button class="btn primary grow" data-act="pack" ${cost > s.money ? 'disabled' : ''}>도시락 싸기 · 💰${cost}${cost > s.money ? ' (부족)' : ''}</button>
    </div>
  </section>`;
}

function renderSummary(s: GameState): string {
  const d: Delta = {};
  for (const k of STAT_KEYS) d[k] = s.stats[k] - s.yearStart[k];
  const lines = s.log.filter((l) => l.age === s.age).slice(-6);
  const last = s.age >= FINAL_AGE;
  return `
  <section class="card">
    <div class="kicker">한 해 결산</div>
    <h2>${esc(s.child.name)}, ${s.age}살의 기록</h2>
    ${deltaChips(d)}
    <ul class="lines">${lines.map((l) => `<li>${esc(l.text)}</li>`).join('')}</ul>
    <button class="btn primary" data-act="year">${last ? '🎓 스무 살이 되다' : `🎂 ${s.age + 1}살 생일`}</button>
  </section>`;
}

function renderEnding(s: GameState): string {
  const e = ENDING_BY_ID[s.endingId!];
  return `
  <section class="card ending">
    <div class="kicker">${esc(s.child.name)}의 스무 살</div>
    ${illust(endingArt(e.id, s), e.emoji)}
    <h2>${esc(e.title)}</h2>
    <p class="story">${esc(e.text)}</p>
    <div class="final">
      ${STAT_KEYS.map((k) => `<div>${STAT_INFO[k].emoji} ${STAT_INFO[k].label} <b>${Math.round(s.stats[k])}</b></div>`).join('')}
      <div>🍱 이번 생 메뉴 <b>${s.runMenus.length}</b></div>
      <div>✨ 재능 <b>${TALENT_INFO[s.child.talent].label}</b></div>
    </div>
    <div class="stack">
      <button class="btn primary" data-act="new">다시 키우기</button>
      <button class="btn ghost" data-act="dex">📖 도감 보기</button>
    </div>
  </section>`;
}

function renderNotebook(s: GameState): string {
  const k = s.child.known;
  const tagList = (arr: string[]) => (arr.length ? arr.join(', ') : '아직 몰라요');
  return `
  <section class="card">
    <h2>📒 육아 수첩</h2>
    <dl class="note">
      <dt>💗 좋아하는 맛</dt><dd>${esc(tagList(k.likes))}</dd>
      <dt>🙅 싫어하는 음식</dt><dd>${esc(tagList(k.dislikes.map((id) => ing(id).name)))}</dd>
      <dt>✨ 재능</dt><dd>${k.talent ? TALENT_INFO[s.child.talent].label : '11살 즈음 알 수 있을 것 같다'}</dd>
      <dt>🍱 올해까지 먹인 메뉴</dt><dd>${s.runMenus.length}가지</dd>
    </dl>
    <h3>최근 기록</h3>
    <ul class="lines">${s.log.slice(-12).reverse().map((l) => `<li><small>${l.age}살</small> ${esc(l.text)}</li>`).join('')}</ul>
    <button class="btn primary" data-act="back">돌아가기</button>
  </section>`;
}

function renderDex(): string {
  const groups = INGREDIENTS.filter((i) => i.slot === 'base').map((b) => {
    const list = ALL_MENUS.filter((m) => m.base === b.id);
    const found = list.filter((m) => dex.menus.includes(m.key));
    return `<details><summary>${b.emoji} ${esc(b.name)} <small>${found.length}/${list.length}</small></summary>
      <ul class="dex">${list.map((m) => dex.menus.includes(m.key)
        ? `<li class="${m.signature ? 'sig' : ''}">${m.signature ? '✨ ' : ''}${esc(m.name)}</li>`
        : `<li class="unk">${m.signature ? '✨ ' : ''}??? </li>`).join('')}</ul></details>`;
  }).join('');
  return `
  <main class="page">
    <section class="card">
      <h2>📖 도감</h2>
      <p class="sub">메뉴 ${dex.menus.length}/${ALL_MENUS.length} · 특별 메뉴 ${ALL_MENUS.filter((m) => m.signature && dex.menus.includes(m.key)).length}/${ALL_MENUS.filter((m) => m.signature).length} · 플레이 ${dex.plays}회</p>
      <h3>엔딩</h3>
      <div class="endings">${ENDINGS.map((e) => dex.endings.includes(e.id) ? `<div class="end">${e.emoji}<small>${esc(e.title)}</small></div>` : '<div class="end unk">❔<small>???</small></div>').join('')}</div>
      <h3>메뉴</h3>
      ${groups}
      <button class="btn primary" data-act="home">돌아가기</button>
    </section>
  </main>`;
}

function renderGame(s: GameState): string {
  let body: string;
  if (screen === 'notebook') body = renderNotebook(s);
  else if (result) body = renderResult(result, s);
  else if (s.step === 'ending') body = renderEnding(s);
  else if (s.active) body = renderEvent(s);
  else if (s.step === 'follow') body = renderFollow(s);
  else if (isMealStep(s.step)) body = renderMeal(s);
  else body = renderSummary(s);
  return `${renderHeader(s)}<main class="page">${body}</main>`;
}

function render(keepRowScroll = false) {
  const prevScroll = [...app.querySelectorAll<HTMLElement>('.ings')].map((r) => r.scrollLeft);
  app.innerHTML = screen === 'title' ? renderTitle() : screen === 'dex' ? renderDex() : game ? renderGame(game) : renderTitle();
  app.querySelectorAll<HTMLElement>('.ings').forEach((row, i) => {
    if (keepRowScroll && prevScroll[i] !== undefined) { row.scrollLeft = prevScroll[i]; return; }
    const on = row.querySelector<HTMLElement>('.ing.on'); // 선택된 재료가 보이도록
    if (on) row.scrollLeft = Math.max(0, on.offsetLeft - row.offsetLeft - 8);
  });
}

// ───────────────────────── 입력 ─────────────────────────
function onAct(act: string, el: HTMLElement) {
  const s = game;
  switch (act) {
    case 'new':
      clearRun();
      game = startGame(newGame());
      dex.plays += 1;
      result = undefined; sel = undefined; screen = 'game';
      break;
    case 'continue': screen = 'game'; break;
    case 'dex': screen = 'dex'; break;
    case 'home': screen = 'title'; break;
    case 'notebook': screen = 'notebook'; break;
    case 'back': screen = 'game'; break;
    case 'choice': {
      if (!s?.active) return;
      const a = s.active;
      const r = chooseEventOption(s, Number(el.dataset.i));
      continueAfterEvent(s);
      result = { kind: 'event', r, title: a.title, emoji: a.emoji };
      break;
    }
    case 'follow': {
      if (!s) return;
      const level = Number(el.dataset.level) as FollowLevel;
      const o = FOLLOW_OPTIONS[level];
      result = { kind: 'follow', delta: chooseFollow(s, level), title: o.title, emoji: o.emoji };
      break;
    }
    case 'ing':
      if (!sel) return;
      sel = { ...sel, [el.dataset.slot as Slot]: el.dataset.id! };
      break;
    case 'random': if (s) sel = randomSelection(s); break;
    case 'pack': {
      if (!s || !sel) return;
      const time = s.step as 'breakfast' | 'lunch' | 'dinner';
      const r = eatMeal(s, sel, new Set(dex.menus));
      if (!dex.menus.includes(r.menu.key)) dex.menus.push(r.menu.key);
      continueAfterMeal(s);
      result = { kind: 'meal', r, title: `${MEAL_EMOJI[time]} ${stageOf(s.age).meals[time]}` };
      sel = undefined;
      break;
    }
    case 'next': result = undefined; break;
    case 'year':
      if (!s) return;
      advanceYear(s);
      if (s.step === 'ending' && !dex.endings.includes(s.endingId!)) dex.endings.push(s.endingId!);
      break;
    default: return;
  }
  persist();
  const isSelection = act === 'ing';
  render(isSelection);
  if (!isSelection) window.scrollTo({ top: 0 });
}

app.addEventListener('click', (ev) => {
  const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
  if (el && !(el as HTMLButtonElement).disabled) onAct(el.dataset.act!, el);
});

render();
