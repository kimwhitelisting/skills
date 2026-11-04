/**
 * 이벤트 장면 — 배경·소품·인물을 코드로 조립한다 (110×72 칸).
 * 아이는 지금 나이의 모습으로 들어가고, 고른 결과에 따라 표정만 바뀐다.
 * 새 이벤트를 추가하면 SCENES에 한 줄 (없으면 현관 기본 장면).
 */
import { childFront, headTop, parentSide, type Expr, type Look } from './child.ts';
import { dog, entryFloor, entryWall, miniLunch, neighbor, school } from './extras.ts';
import { food } from './foods.ts';
import { Grid } from './grid.ts';
import { P } from './palette.ts';
import { kitchenCounter, kitchenWall, pole, streetTile, tree } from './scenes.ts';

export const EV_W = 110;
export const EV_H = 72;
const FLOOR = 60; // 배경 바닥선 (발이 닿는 줄)
const FEET = 68;

// ───────── 작은 도구 ─────────
const g0 = () => new Grid(EV_W, EV_H);
/** 발끝(바닥) 기준으로 얹기 */
const put = (g: Grid, src: Grid, x: number, footY = FEET, flip = false) => g.draw(src, Math.round(x), Math.round(footY - src.h), flip);
const friendLook = (l: Look): Look => ({ age: l.age, gender: l.gender === 'girl' ? 'boy' : 'girl' });
const kid = (l: Look, e: Expr, hat?: 'crown' | 'gradcap' | 'cap' | 'raincap') => childFront(l, e, { hat });
const friend = (l: Look, e: Expr = 'neutral') => childFront(friendLook(l), e, { outfit: 'mint' });
/** 부모 (얼굴 없는 실루엣, 오른쪽을 봄 — flip이면 왼쪽) */
const parent = (frame = 0) => parentSide(frame);
/** 아이 얼굴만 (베개·보자기용) */
function headOnly(l: Look, e: Expr): Grid {
  const top = headTop(l).y;
  return new Grid(24, 19).draw(childFront(l, e), 0, -(top - 2));
}
const stamp = (g: Grid, rows: string[], x: number, y: number, pal: Record<string, string>) => g.stamp(rows, x, y, pal);
const HEART = ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'];
const ANGER = ['r.r', '.r.', 'r.r'];
const NOTE = ['.kk', '.k.', 'kk.', 'kk.'];
const SWEAT = ['.b', 'bb', 'bb'];
const heart = (g: Grid, x: number, y: number, c: string = P.red) => stamp(g, HEART, x, y, { r: c });
const anger = (g: Grid, x: number, y: number) => stamp(g, ['rr.rr', 'r...r', '.....', 'r...r', 'rr.rr'], x, y, { r: P.red });
const sweat = (g: Grid, x: number, y: number) => stamp(g, SWEAT, x, y, { b: P.sky });
const note = (g: Grid, x: number, y: number) => stamp(g, NOTE, x, y, { k: P.ink });
void ANGER;

// ───────── 배경 ─────────
function floorWood(g: Grid, y = FLOOR): Grid {
  g.rect(0, y, EV_W, EV_H - y, P.wood).hline(0, EV_W - 1, y, P.woodDark);
  for (let yy = y + 4; yy < EV_H; yy += 5) for (let x = (yy % 10) * 2; x < EV_W; x += 19) g.hline(x, x + 9, yy, P.woodLine);
  return g;
}

/** 아이 방: 벽지 + 창문 + 침대 (+ 책상) */
function room(o: { desk?: boolean; bed?: boolean; rain?: boolean; night?: boolean } = {}): Grid {
  const g = g0().rect(0, 0, EV_W, EV_H, o.night ? '#d9cfe6' : '#f3e2d2');
  for (let x = 3; x < EV_W; x += 8) for (let y = 4 + (x % 16 === 3 ? 0 : 4); y < FLOOR; y += 8) g.set(x, y, o.night ? '#c6b9d8' : '#e8cdb7');
  // 창문
  const sky = o.night ? '#3a4470' : o.rain ? '#9aa8b4' : P.sky;
  g.rect(8, 8, 26, 20, P.woodDark).rect(10, 10, 22, 16, sky).vline(21, 10, 25, P.woodDark).hline(10, 31, 17, P.woodDark);
  if (o.night) g.set(14, 12, P.white).set(27, 20, P.white).ellipse(26, 13, 2, 2, P.egg);
  else if (o.rain) for (let i = 0; i < 9; i++) g.set(11 + ((i * 7) % 20), 11 + ((i * 5) % 14), P.white).set(11 + ((i * 7) % 20), 12 + ((i * 5) % 14), P.white);
  else g.ellipse(15, 13, 3, 1.5, P.white);
  g.rect(6, 28, 30, 2, P.woodDark);
  // 포스터
  g.rect(44, 8, 14, 18, P.white).rect(45, 9, 12, 10, P.sage).ellipse(51, 13, 3, 3, P.mustard).hline(46, 55, 22, P.inkSoft).hline(46, 52, 24, P.inkSoft);
  floorWood(g);
  if (o.bed !== false) {
    g.rect(72, 40, 36, 20, P.woodDark).rect(72, 34, 4, 26, P.woodDark).rect(74, 42, 34, 8, P.white).rect(80, 46, 28, 10, P.sky).hline(80, 107, 46, P.skyDark);
    g.rect(75, 38, 10, 6, P.white).hline(75, 84, 43, P.creamDark);
  }
  if (o.desk) desk(g, 4, FLOOR);
  return g;
}
function desk(g: Grid, x: number, y: number): void {
  g.rect(x, y - 18, 30, 3, P.woodDark).rect(x + 1, y - 15, 2, 15, P.woodDark).rect(x + 27, y - 15, 2, 15, P.woodDark).rect(x + 18, y - 15, 9, 9, '#b9855a');
  // 스탠드 + 책
  g.vline(x + 4, y - 26, y - 19, P.greyDark).rect(x + 2, y - 28, 7, 3, P.mustard).set(x + 3, y - 25, P.egg).set(x + 5, y - 25, P.egg);
  g.rect(x + 12, y - 22, 10, 2, P.tomato).rect(x + 13, y - 24, 8, 2, P.skyDark).rect(x + 12, y - 26, 9, 2, P.sage);
}

/** 교실: 칠판 + 게시판 + 책상 */
function classroom(): Grid {
  const g = g0().rect(0, 0, EV_W, EV_H, '#eaf0dc');
  g.rect(0, 40, EV_W, FLOOR - 40, '#dfe6cc').hline(0, EV_W - 1, 40, '#c9d3b0');
  g.rect(14, 5, 82, 28, '#b9855a').rect(16, 7, 78, 24, '#3f6b4f');
  g.hline(22, 40, 12, '#e8efe2').hline(22, 34, 16, '#e8efe2').hline(50, 70, 13, '#e8efe2').hline(50, 62, 18, '#e8efe2').set(80, 22, '#e8efe2').set(81, 21, '#e8efe2').set(82, 22, '#e8efe2');
  g.rect(16, 31, 78, 2, '#94653f').rect(24, 30, 4, 1, P.white).rect(70, 30, 3, 1, P.egg);
  g.rect(2, 8, 9, 12, P.cream).rect(3, 9, 3, 3, P.pink).rect(6, 13, 4, 3, P.sky).rect(99, 8, 9, 12, P.cream).rect(100, 10, 6, 3, P.egg);
  return floorWood(g);
}
function schoolDesk(g: Grid, x: number, y = FEET + 2): void {
  g.rect(x, y - 16, 22, 3, '#c98d4f').hline(x, x + 21, y - 16, '#e0a865').rect(x + 2, y - 13, 2, 13, P.greyDark).rect(x + 18, y - 13, 2, 13, P.greyDark);
}

/** 공원 (운동장·소풍) */
function park(o: { track?: boolean; bunting?: boolean } = {}): Grid {
  const g = g0().rect(0, 0, EV_W, EV_H, P.sky);
  g.ellipse(22, 10, 8, 2.5, P.white).ellipse(27, 8, 4, 2.5, P.white).ellipse(84, 14, 7, 2, P.white);
  g.ellipse(30, 48, 40, 10, P.greenLight).ellipse(90, 50, 34, 9, '#9fc97a');
  g.rect(0, 46, EV_W, EV_H - 46, P.grass).hline(0, EV_W - 1, 46, P.grassDark);
  for (let x = 3; x < EV_W; x += 9) g.set(x, 50 + (x % 4), P.grassDark).set(x + 4, 56 + (x % 3), P.grassDark);
  if (o.track) { g.rect(0, 58, EV_W, 12, '#d98a5f'); for (const y of [61, 65]) g.hline(0, EV_W - 1, y, P.white); }
  if (o.bunting) {
    for (let x = 0; x < EV_W; x++) g.set(x, 4 + Math.round(Math.sin(x / 9) * 1.5), P.inkSoft);
    for (let x = 4, i = 0; x < EV_W; x += 9, i++) { const c = [P.tomato, P.mustard, P.sky, P.sage][i % 4]; const y = 5 + Math.round(Math.sin(x / 9) * 1.5); for (let j = 0; j < 4; j++) g.hline(x + j, x + 6 - j, y + j, c); }
  }
  return g;
}

/** 무대 (재롱잔치) */
function stage(): Grid {
  const g = g0().rect(0, 0, EV_W, EV_H, '#3b2a44');
  g.ellipse(55, 46, 26, 22, '#5a4466');
  for (const [x0, dir] of [[0, 1], [EV_W - 22, -1]] as const) {
    g.rect(x0, 0, 22, FLOOR, P.redDark);
    for (let i = 0; i < 22; i += 4) g.vline(x0 + i + (dir > 0 ? 1 : 2), 0, FLOOR - 1, P.red);
  }
  g.rect(0, 0, EV_W, 7, P.red).hline(0, EV_W - 1, 7, P.redDark);
  for (let x = 2; x < EV_W; x += 6) g.set(x, 8, P.mustard);
  g.rect(0, FLOOR, EV_W, EV_H - FLOOR, '#b9855a').hline(0, EV_W - 1, FLOOR, '#e0a865');
  for (let x = 6; x < EV_W; x += 14) g.vline(x, FLOOR + 1, EV_H - 1, '#94653f');
  return g;
}

/** 마트 진열대 */
function mart(): Grid {
  const g = g0().rect(0, 0, EV_W, EV_H, '#f4f1ea');
  const colors = [P.tomato, P.egg, P.sky, P.sage, P.pink, P.mustard, P.plum];
  for (const x0 of [0, 70]) {
    g.rect(x0, 6, 40, FLOOR - 6, P.greyDark);
    for (let r = 0; r < 4; r++) {
      const y = 9 + r * 13;
      g.rect(x0 + 2, y + 9, 36, 2, P.grey);
      for (let i = 0; i < 6; i++) g.rect(x0 + 3 + i * 6, y + 1 + (i % 2), 5, 8 - (i % 2), colors[(r * 3 + i + x0) % colors.length]);
    }
  }
  g.rect(42, 4, 26, 6, P.tomato).hline(45, 64, 7, P.white);
  for (let y = FLOOR; y < EV_H; y += 4) for (let x = (y / 4) % 2 ? 0 : 4; x < EV_W; x += 8) g.rect(x, y, 4, 4, '#e3ddd2');
  g.rect(0, FLOOR, EV_W, 1, P.grey);
  return g;
}

/** 밤의 학교 (야자) */
function nightSchool(): Grid {
  const g = g0().rect(0, 0, EV_W, EV_H, '#2c3557');
  for (const [x, y] of [[8, 6], [20, 14], [96, 8], [104, 20], [60, 4], [40, 9]] as const) g.set(x, y, P.white);
  g.ellipse(88, 12, 5, 5, P.egg).ellipse(90, 11, 4, 4, '#2c3557');
  const s = school();
  // 창문에 불
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const c = s.get(x, y); if (c === P.skyDark) s.set(x, y, P.egg); else if (c === P.sky) s.set(x, y, '#fff4c2'); else if (c === P.cream) s.set(x, y, '#9a93b8'); }
  put(g, s, 20, FLOOR + 2);
  g.rect(0, FLOOR, EV_W, EV_H - FLOOR, '#4a4f6a').hline(0, EV_W - 1, FLOOR, '#6b7090');
  return g;
}

/** 병원 (출생) */
function hospital(): Grid {
  const g = g0().rect(0, 0, EV_W, EV_H, '#e3f1ec');
  g.rect(0, 44, EV_W, FLOOR - 44, '#d4e8e0').hline(0, EV_W - 1, 44, '#b9d8cc');
  g.rect(70, 8, 30, 22, P.white).rect(72, 10, 26, 18, P.sky).vline(85, 10, 27, P.white).ellipse(78, 14, 3, 1.5, P.white);
  g.rect(12, 10, 10, 10, P.white).rect(16, 11, 2, 8, P.tomato).rect(13, 14, 8, 2, P.tomato);
  for (let y = FLOOR; y < EV_H; y++) for (let x = 0; x < EV_W; x++) g.set(x, y, ((x >> 2) + (y >> 2)) % 2 ? '#f2f7f4' : '#dceae3');
  return g;
}

function kitchen(): Grid {
  const g = g0().draw(kitchenWall(EV_W, 52), 0, 0);
  return g;
}
const counterFront = (g: Grid) => g.draw(kitchenCounter(EV_W, EV_H - 50), 0, 50);
/** 조리대 너머 아이: 어느 나이든 머리와 어깨가 조리대 위로 보이게 */
function kidBehind(g: Grid, l: Look, e: Expr, x: number): Grid {
  const k = kid(l, e);
  return g.draw(k, x, 30 - headTop(l).y);
}

function entry(): Grid {
  return g0().draw(entryWall(EV_W, FLOOR + 2), 0, 0).draw(entryFloor(EV_W, EV_H - FLOOR - 2), 0, FLOOR + 2);
}

function street(): Grid {
  const s = streetTile(EV_W + 20, 96);
  return g0().draw(s, -8, -26);
}

// ───────── 소품 ─────────
function cake(candles: number): Grid {
  const g = new Grid(22, 20);
  g.rect(2, 10, 18, 9, P.cream).rect(2, 10, 18, 3, P.white).hline(2, 19, 15, P.pink);
  for (let x = 3; x < 20; x += 4) g.set(x, 13, P.red);
  for (let i = 0; i < candles; i++) { const x = 11 - candles + i * 2 + 1; g.vline(x, 5, 9, P.sky).set(x, 3, P.egg).set(x, 4, P.mustard); }
  g.rect(0, 18, 22, 2, P.white);
  return g.outline(P.ink);
}
function balloons(): Grid {
  const g = new Grid(26, 40);
  for (const [x, y, c] of [[6, 8, P.tomato], [16, 5, P.sky], [21, 13, P.egg]] as const) {
    g.ellipse(x, y, 4, 5, c).set(x - 1, y - 2, P.white);
    for (let j = 0; j < 26; j++) g.set(x + Math.round(Math.sin(j / 4)) - (x - 13) * (j / 40), y + 6 + j, P.inkSoft);
  }
  return g;
}
function dolTable(): Grid {
  const g = new Grid(56, 18);
  g.rect(0, 6, 56, 6, P.red).hline(0, 55, 6, P.mustard).rect(3, 12, 4, 6, P.redDark).rect(49, 12, 4, 6, P.redDark);
  g.rect(4, 2, 2, 5, P.egg).set(4, 1, P.inkSoft); // 연필
  g.ellipse(14, 3.5, 3, 3, P.white).set(13, 2, P.ink).set(15, 4, P.ink); // 공
  g.rect(22, 1, 2, 4, P.grey).ellipse(23, 1, 2, 1.5, P.greyDark).vline(23, 4, 5, P.inkSoft); // 마이크
  g.vline(32, 0, 4, P.brown).rect(31, 4, 3, 2, P.ink); // 붓
  g.vline(42, 2, 5, P.grey).ellipse(42, 1.5, 1.6, 1.6, P.grey); // 숟가락
  g.rect(48, 3, 5, 3, P.mustardDark).hline(48, 52, 3, P.mustard); // 쌀
  return g.outline(P.ink);
}
function swaddle(l: Look, e: Expr): Grid {
  const g = new Grid(30, 22);
  g.ellipse(15, 13, 14, 8, P.pink).ellipse(15, 14, 11, 6, '#f8c3cb');
  g.draw(headOnly({ ...l, age: 1 }, e), 3, -3);
  return g;
}
function plateOf(id: string): Grid {
  const g = new Grid(22, 14);
  g.ellipse(11, 9, 10, 4, P.white).ellipse(11, 9, 7, 2.5, P.cream);
  g.draw(food(id), 3, -4);
  return g.outline(P.ink);
}
function pan(): Grid {
  const g = new Grid(22, 8);
  g.ellipse(7, 4, 7, 3, P.ink).ellipse(7, 3.5, 5.5, 2, P.greyDark).rect(13, 3, 9, 2, P.brownDark).ellipse(7, 3, 2.5, 1.2, P.egg).set(7, 3, P.eggDark);
  return g;
}
function letter(): Grid {
  const g = new Grid(14, 10).rect(0, 0, 14, 10, P.pink);
  for (let i = 0; i < 7; i++) g.set(i, i, '#e48896').set(13 - i, i, '#e48896');
  g.stamp(HEART.map((r) => r.replace(/r/g, 'r')), 5, 3, { r: P.red });
  return g.outline(P.ink);
}
function phone(): Grid {
  const g = new Grid(12, 20).rect(0, 0, 12, 20, P.ink).rect(1, 2, 10, 15, P.white).rect(5, 18, 2, 1, P.grey);
  g.rect(2, 3, 8, 7, P.tomato).rect(3, 4, 6, 5, P.cream).set(5, 6, P.egg).set(6, 6, P.sage);
  g.stamp(HEART, 3, 11, { r: P.red });
  return g.outline(P.ink);
}
function tv(): Grid {
  const g = new Grid(30, 26);
  g.rect(0, 0, 30, 19, P.ink).rect(2, 2, 26, 15, '#5d7fd1').rect(4, 10, 6, 5, P.tomato).rect(18, 6, 5, 9, P.egg).hline(2, 27, 15, P.sage);
  g.rect(12, 19, 6, 3, P.greyDark).rect(6, 22, 18, 4, '#b9855a');
  return g.outline(P.ink);
}
function gamepad(): Grid {
  const g = new Grid(12, 6).rect(1, 1, 10, 4, P.greyDark).set(0, 2, P.greyDark).set(11, 2, P.greyDark);
  g.set(3, 2, P.ink).set(2, 3, P.ink).set(4, 3, P.ink).set(8, 2, P.tomato).set(9, 3, P.sky);
  return g.outline(P.ink);
}
function signpost(): Grid {
  const g = new Grid(28, 34).rect(13, 6, 3, 28, P.woodDark);
  g.rect(2, 4, 18, 6, P.mustard).set(1, 6, P.mustard).set(0, 7, P.mustard).set(1, 8, P.mustard);
  g.rect(10, 13, 18, 6, P.sky).set(28, 15, P.sky).set(27, 16, P.sky);
  g.rect(3, 22, 16, 6, P.sage).set(2, 24, P.sage);
  g.hline(5, 15, 7, P.inkSoft).hline(13, 24, 16, P.inkSoft).hline(6, 15, 25, P.inkSoft);
  return g.outline(P.ink);
}
function calendar(): Grid {
  const g = new Grid(20, 22).rect(0, 0, 20, 22, P.white).rect(0, 0, 20, 6, P.tomato);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) g.rect(2 + c * 4, 8 + r * 4, 2, 2, P.grey);
  g.ellipse(14, 17, 3.5, 3, P.red).ellipse(14, 17, 2, 1.6, P.white);
  g.set(3, 2, P.white).set(4, 2, P.white).set(3, 3, P.white).set(5, 3, P.white).set(3, 4, P.white).set(4, 4, P.white);
  return g.outline(P.ink);
}
function suitcase(): Grid {
  const g = new Grid(20, 18).rect(0, 4, 20, 14, P.brown).rect(6, 0, 8, 2, P.brownDark).vline(6, 0, 4, P.brownDark).vline(13, 0, 4, P.brownDark);
  g.vline(5, 4, 17, P.mustard).vline(14, 4, 17, P.mustard).rect(8, 8, 4, 3, P.sky);
  return g.outline(P.ink);
}
function cat(): Grid {
  const g = new Grid(16, 14);
  const c = '#f0b56b', d = '#c98d4f';
  g.ellipse(8, 9, 5, 4, c).ellipse(6, 5, 4, 3.5, c).set(3, 1, c).set(4, 2, c).set(8, 1, c).set(7, 2, c);
  g.set(5, 5, P.eye).set(8, 5, P.eye).set(6, 6, P.pink).vline(12, 4, 8, c).set(13, 3, c);
  g.hline(6, 10, 9, d).hline(5, 11, 11, d);
  return g.outline(P.ink);
}
function envelope(red = true): Grid {
  const g = new Grid(14, 10).rect(0, 0, 14, 10, red ? P.red : P.sage);
  g.rect(3, 3, 8, 4, P.mustard).set(6, 4, P.redDark).set(7, 5, P.redDark);
  return g.outline(P.ink);
}
function bills(): Grid {
  const g = new Grid(16, 10);
  for (const [x, y] of [[0, 2], [3, 0]] as const) g.rect(x, y, 13, 8, '#a8d39b').rect(x + 1, y + 1, 11, 6, '#c9e8bf').ellipse(x + 6, y + 4, 2, 2, '#7fb26e');
  return g.outline(P.ink);
}
function easel(): Grid {
  const g = new Grid(26, 40);
  g.vline(4, 10, 39, P.woodDark).vline(21, 10, 39, P.woodDark).vline(13, 2, 39, P.woodDark);
  g.rect(2, 6, 22, 18, P.white).ellipse(9, 14, 4, 4, P.mustard).rect(14, 16, 8, 6, P.sky).set(16, 10, P.tomato).set(17, 11, P.tomato).set(18, 10, P.tomato).hline(3, 22, 21, P.sage);
  return g.outline(P.ink);
}
function thermometer(): Grid {
  const g = new Grid(5, 14).rect(1, 0, 3, 11, P.white).vline(2, 4, 10, P.red).ellipse(2, 11.5, 2, 2, P.red);
  return g.outline(P.ink);
}
function door(): Grid {
  const g = new Grid(40, 58).rect(0, 0, 40, 58, P.woodDark).rect(3, 3, 34, 55, '#c49061');
  g.rect(7, 7, 26, 18, '#b27a45').rect(7, 30, 26, 24, '#b27a45').set(31, 30, P.mustard).set(31, 31, P.mustard);
  // 출입금지 종이
  g.rect(10, 9, 20, 13, P.white).ellipse(20, 15.5, 4.5, 4.5, P.red).ellipse(20, 15.5, 3, 3, P.white);
  for (let i = -2; i <= 2; i++) g.set(20 + i, 15 + i, P.red).set(21 + i, 15 + i, P.red);
  return g.outline(P.ink);
}
function rainCloud(g: Grid, x: number, y: number): void {
  g.ellipse(x, y, 9, 3, P.greyDark).ellipse(x - 4, y - 2, 4, 3, P.greyDark).ellipse(x + 4, y - 2, 5, 3, P.greyDark);
  for (let i = 0; i < 6; i++) g.vline(x - 7 + i * 3, y + 4 + (i % 2) * 2, y + 5 + (i % 2) * 2, P.sky);
}
function gate(): Grid {
  const g = new Grid(110, 50);
  g.rect(8, 6, 8, 44, P.grey).rect(94, 6, 8, 44, P.grey).rect(4, 0, 102, 8, P.greyDark).hline(20, 90, 3, P.white);
  for (let x = 16; x < 94; x += 6) g.vline(x, 30, 49, P.greyDark);
  g.hline(16, 93, 30, P.greyDark).hline(16, 93, 40, P.greyDark);
  return g.outline(P.ink);
}
function blossoms(g: Grid): void {
  for (let i = 0; i < 26; i++) g.set((i * 37) % EV_W, (i * 23) % 50, i % 3 ? P.pink : P.white);
}
function bench(): Grid {
  const g = new Grid(40, 16).rect(0, 4, 40, 3, P.wood).rect(0, 0, 40, 2, P.wood).rect(3, 7, 2, 9, P.woodDark).rect(35, 7, 2, 9, P.woodDark);
  return g.outline(P.ink);
}
function mat(): Grid {
  const g = new Grid(60, 8);
  for (let x = 0; x < 60; x++) for (let y = 0; y < 8; y++) g.set(x, y, ((x >> 2) + (y >> 2)) % 2 ? P.tomato : P.white);
  return g;
}
function teacher(): Grid {
  const g = new Grid(24, 46);
  g.ellipse(12, 9, 6, 6.5, P.skin).ellipse(12, 6, 7, 5, P.hairBoy, (_x, y) => y <= 6).ellipse(12, 1, 3, 2.2, P.hairBoy);
  g.rect(8, 9, 3, 2, P.ink).rect(13, 9, 3, 2, P.ink).hline(11, 12, 9, P.ink).set(9, 9, P.white).set(14, 9, P.white).hline(11, 13, 13, P.mouth);
  g.rect(5, 16, 14, 16, P.sage).rect(3, 17, 2, 11, P.sage).rect(19, 17, 2, 11, P.sage).vline(12, 16, 31, P.sageDark).rect(3, 28, 2, 2, P.skin).rect(19, 28, 2, 2, P.skin);
  g.rect(6, 32, 12, 7, P.navy).rect(8, 39, 3, 5, P.skin).rect(13, 39, 3, 5, P.skin).rect(7, 44, 4, 2, P.shoe).rect(13, 44, 4, 2, P.shoe);
  return g.outline(P.ink);
}
const grandma = () => neighbor();
function rulerMarks(g: Grid, x: number): void {
  g.rect(x, 4, 6, FLOOR - 4, P.cream).vline(x, 4, FLOOR - 1, P.creamDark);
  for (let y = 8; y < FLOOR; y += 4) g.hline(x, x + (y % 8 ? 2 : 4), y, P.inkSoft);
  for (const y of [40, 32, 24]) g.hline(x - 2, x + 7, y, P.tomato);
}

// ───────── 장면 ─────────
type Build = (l: Look, e: Expr) => Grid;
const SCENES: Record<string, { expr: Expr; build: Build }> = {
  birth: { expr: 'neutral', build: (l, e) => { const g = hospital(); put(g, parent(0), 32); put(g, swaddle(l, e === 'surprise' ? 'neutral' : e), 52, 46); heart(g, 62, 18); heart(g, 70, 24, P.pink); return g; } },
  doljabi: { expr: 'surprise', build: (l, e) => { const g = room({ bed: false }); g.rect(36, 6, 40, 10, P.white).hline(38, 73, 11, P.pink); put(g, kid(l, e), 43, 54); put(g, dolTable(), 27, FEET); return g; } },
  firstword: { expr: 'happy', build: (l, e) => { const g = room(); put(g, parent(0), 30); put(g, kid(l, e), 54); g.rect(60, 12, 22, 12, P.white).outline(P.ink); heart(g, 68, 15); g.set(62, 25, P.ink).set(63, 24, P.ink); return g; } },
  daycare: { expr: 'sad', build: (l, e) => { const g = park(); const s = school(); put(g, s, 52, FLOOR); for (let i = 0; i < 6; i++) g.hline(54, 116, 6 + i, [P.red, P.mustard, P.egg, P.sage, P.sky, P.plum][i]); put(g, parent(0), 14); put(g, kid(l, e), 32); sweat(g, 52, 32); return g; } },
  picky: { expr: 'yuck', build: (l, e) => { const g = kitchen(); kidBehind(g, l, e, 18); counterFront(g); put(g, plateOf('broccoli'), 56, 60); g.rect(80, 48, 2, 10, P.grey).ellipse(81, 47, 2, 2, P.grey); return g; } },
  recital: { expr: 'happy', build: (l, e) => { const g = stage(); put(g, kid(l, e, 'crown'), 43); note(g, 30, 22); note(g, 74, 18); heart(g, 70, 30); return g; } },
  hagwon: { expr: 'surprise', build: (l, e) => { const g = classroom(); put(g, kid(l, e), 30); for (let i = 0; i < 6; i++) g.rect(62, FEET - 6 - i * 5, 18 - (i % 2) * 2, 5, [P.tomato, P.sky, P.sage, P.mustard, P.plum, P.pink][i]).hline(62, 79 - (i % 2) * 2, FEET - 6 - i * 5, P.ink); sweat(g, 50, 28); return g; } },
  school: { expr: 'happy', build: (l, e) => { const g = park(); put(g, school(), 34, FLOOR); blossoms(g); put(g, parent(0), 6); put(g, kid(l, e), 74); return g; } },
  picnic: { expr: 'happy', build: (l, e) => { const g = park(); put(g, tree(), 2, FLOOR); put(g, mat(), 26, FEET); put(g, kid(l, e), 30, FEET - 2); put(g, friend(l, 'happy'), 60, FEET - 2); put(g, miniLunch(), 47, FEET); return g; } },
  fight: { expr: 'yuck', build: (l, e) => { const g = park(); put(g, tree(), 82, FLOOR); put(g, kid(l, e), 24); put(g, childFront(friendLook(l), 'yuck', { outfit: 'mint' }), 58, FEET, true); anger(g, 42, 18); anger(g, 76, 20); return g; } },
  sportsday: { expr: 'happy', build: (l, e) => { const g = park({ track: true, bunting: true }); put(g, kid(l, e), 30); put(g, friend(l, 'surprise'), 60); g.vline(90, 34, 66, P.white).vline(91, 34, 66, P.greyDark).rect(92, 34, 10, 7, P.tomato); return g; } },
  dream: { expr: 'happy', build: (l, e) => { const g = classroom(); put(g, kid(l, e), 43); g.rect(66, 12, 26, 18, P.white).outline(P.ink); g.stamp(['..y..', '.yyy.', 'yyyyy', '.yyy.', '.y.y.'], 76, 18, { y: P.mustard }); g.set(64, 32, P.white).set(62, 35, P.white); return g; } },
  puberty: { expr: 'yuck', build: () => { const g = room({ bed: false }); put(g, door(), 50, FEET); put(g, parent(0), 20); g.set(44, 26, P.ink).set(46, 26, P.ink).set(48, 26, P.ink); return g; } },
  middle: { expr: 'neutral', build: (l, e) => { const g = park(); put(g, gate(), 0, FLOOR + 4); blossoms(g); put(g, kid(l, e), 43); return g; } },
  crush: { expr: 'surprise', build: (l, e) => { const g = park(); put(g, bench(), 12, FEET - 2); put(g, kid(l, e), 40); put(g, letter(), 64, 46); heart(g, 66, 22); heart(g, 74, 30, P.pink); heart(g, 58, 16, P.pink); return g; } },
  career: { expr: 'neutral', build: (l, e) => { const g = classroom(); put(g, teacher(), 12); put(g, kid(l, e), 46); put(g, signpost(), 76); return g; } },
  highschool: { expr: 'sad', build: (l, e) => { const g = nightSchool(); put(g, kid(l, e), 72); put(g, miniLunch(), 94); return g; } },
  slump: { expr: 'sad', build: (l, e) => { const g = room({ desk: true, rain: true }); put(g, kid(l, e), 40); rainCloud(g, 52, 10); return g; } },
  exam: { expr: 'surprise', build: (l, e) => { const g = park(); put(g, gate(), 0, FLOOR + 4); put(g, kid(l, e), 40); put(g, parent(0), 16); put(g, calendar(), 74, 40); heart(g, 30, 14); return g; } },
  leaving: { expr: 'neutral', build: (l, e) => { const g = entry(); put(g, kid(l, e), 43, FLOOR + 6); put(g, suitcase(), 68, FLOOR + 8); put(g, parent(0), 14, FLOOR + 8); return g; } },
  cold: { expr: 'sad', build: (l, e) => { const g = room(); g.draw(headOnly(l, e), 72, 26); g.rect(80, 46, 28, 10, P.sky); put(g, thermometer(), 86, 40); put(g, parent(0), 46); sweat(g, 92, 28); return g; } },
  fall: { expr: 'sad', build: (l, e) => { const g = park(); put(g, tree(), 4, FLOOR); const k = kid(l, e); k.rect(9, 36, 3, 2, P.cream).set(10, 36, P.pink); put(g, k, 44); g.set(66, 62, P.grey).set(68, 60, P.grey).set(70, 63, P.grey); return g; } },
  lost: { expr: 'sad', build: (l, e) => { const g = mart(); put(g, kid(l, e), 43); sweat(g, 64, 26); g.stamp(['.kk.', 'k..k', '..k.', '.k..', '....', '.k..'], 70, 14, { k: P.ink }); return g; } },
  swap: { expr: 'happy', build: (l, e) => { const g = classroom(); put(g, kid(l, e), 20); put(g, friend(l, 'happy'), 66); schoolDesk(g, 44); put(g, miniLunch(), 40, 55); put(g, miniLunch(), 52, 55); heart(g, 52, 36); return g; } },
  cat: { expr: 'happy', build: (l, e) => { const g = street(); put(g, pole(), 80, FEET); put(g, kid(l, e), 36); put(g, cat(), 62); heart(g, 66, 40); return g; } },
  party: { expr: 'happy', build: (l, e) => { const g = room(); put(g, balloons(), 4, 48); put(g, kid(l, e), 30); put(g, friend(l, 'happy'), 76); put(g, cake(3), 52, FEET); return g; } },
  game: { expr: 'happy', build: (l, e) => { const g = room({ night: true }); put(g, tv(), 8, FLOOR + 4); const k = kid(l, e); put(g, k, 48); put(g, gamepad(), 54, FEET - 14); return g; } },
  teacher: { expr: 'neutral', build: (l, e) => { const g = classroom(); put(g, teacher(), 20); put(g, parent(2), 70, FEET, true); schoolDesk(g, 42); void l; void e; return g; } },
  caught: { expr: 'yuck', build: (l, e) => { const g = street(); put(g, pole(), 28, FEET); put(g, parent(0), 12); put(g, kid(l, e), 64); g.stamp(['k.k', 'k.k', 'k.k', '...', 'k.k'], 74, 18, { k: P.red }); return g; } },
  helpcook: { expr: 'happy', build: (l, e) => { const g = kitchen(); kidBehind(g, l, e, 30); counterFront(g); put(g, pan(), 50, 58); for (let i = 0; i < 3; i++) g.set(46 + i * 2, 46 - i, P.grey); return g; } },
  contest: { expr: 'happy', build: (l, e) => { const g = classroom(); put(g, easel(), 64); put(g, kid(l, e), 32); g.stamp(['..y..', '.yyy.', 'yyyyy', '.yyy.', '.y.y.'], 86, 26, { y: P.mustard }); return g; } },
  growth: { expr: 'surprise', build: (l, e) => { const g = room({ bed: false }); rulerMarks(g, 66); put(g, kid(l, e), 40); return g; } },
  sns: { expr: 'surprise', build: (l, e) => { const g = kitchen(); kidBehind(g, l, e, 16); counterFront(g); put(g, phone(), 52, 60); heart(g, 68, 30); heart(g, 76, 22, P.pink); heart(g, 84, 34); return g; } },
  returnlunch: { expr: 'happy', build: (l, e) => { const g = kitchen(); put(g, parent(0), 12, 74); kidBehind(g, l, e, 58); counterFront(g); put(g, miniLunch(), 40, 60); heart(g, 44, 30); return g; } },
  allowance: { expr: 'happy', build: (l, e) => { const g = room(); put(g, kid(l, e), 32); put(g, parent(0), 66, FEET, true); g.rect(26, 8, 22, 14, P.white).outline(P.ink); g.draw(bills(), 29, 10); return g; } },
  bonus: { expr: 'happy', build: (l, e) => { const g = entry(); put(g, grandma(), 26, FLOOR + 8); put(g, kid(l, e), 56, FLOOR + 6); put(g, envelope(), 46, 50); heart(g, 52, 22); return g; } },
};

/** 이 이벤트의 기본 표정 (선택 전) */
export const eventExpr = (id: string): Expr => SCENES[id]?.expr ?? 'surprise';
export const hasEventScene = (id: string) => id in SCENES;
export const EVENT_SCENE_IDS = Object.keys(SCENES);

/** 이벤트 장면 한 장 (110×72) */
export function eventScene(id: string, look: Look, expr: Expr = eventExpr(id)): Grid {
  const s = SCENES[id];
  if (s) return s.build(look, expr);
  const g = entry();
  return put(g, kid(look, expr), 43, FLOOR + 6);
}
void dog;
