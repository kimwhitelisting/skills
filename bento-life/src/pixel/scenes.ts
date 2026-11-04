/** 장면 배경 (160칸 폭). 앞뒤 층을 나눠서 그 사이에 캐릭터를 끼운다 */
import { Grid } from './grid.ts';
import { P } from './palette.ts';

export const SCENE_W = 160;

/** 부엌: 타일 벽 + 창문 (뒤층) */
export function kitchenWall(w = SCENE_W, h = 64): Grid {
  const g = new Grid(w, h).rect(0, 0, w, h, P.wall);
  for (let y = 9; y < h; y += 10) g.hline(0, w - 1, y, P.wallLine);
  for (let y = 0; y < h; y += 10) for (let x = ((y / 10) % 2) * 5 + 4; x < w; x += 10) g.vline(x, y, Math.min(y + 8, h - 1), P.wallLine);
  // 창문 (오른쪽 위)
  const wx = w - 44;
  g.rect(wx, 6, 34, 28, P.woodDark).rect(wx + 2, 8, 30, 24, P.sky).rect(wx + 2, 20, 30, 12, P.skyDark);
  g.vline(wx + 16, 8, 31, P.woodDark).vline(wx + 17, 8, 31, P.woodDark).hline(wx + 2, wx + 31, 19, P.woodDark);
  g.set(wx + 5, 10, P.white).set(wx + 6, 10, P.white).set(wx + 5, 11, P.white).set(wx + 20, 11, P.white).set(wx + 21, 10, P.white);
  g.rect(wx - 2, 34, 38, 2, P.woodDark); // 창턱
  g.rect(wx + 26, 28, 6, 6, P.tomato).hline(wx + 26, wx + 31, 28, P.tomatoDark).set(wx + 28, 25, P.green).set(wx + 29, 24, P.green).set(wx + 30, 25, P.green).set(wx + 29, 26, P.greenDark).set(wx + 29, 27, P.greenDark);
  // 벽시계
  g.ellipse(wx - 16, 16, 6, 6, P.ink).ellipse(wx - 16, 16, 5, 5, P.cream).vline(wx - 16, 12, 16, P.ink).hline(wx - 16, wx - 13, 16, P.ink);
  return g;
}

/** 부엌: 나무 조리대 (앞층) */
export function kitchenCounter(w = SCENE_W, h = 44): Grid {
  const g = new Grid(w, h).rect(0, 0, w, h, P.wood);
  g.rect(0, 0, w, 4, P.woodDark).hline(0, w - 1, 4, P.ink);
  for (let y = 10; y < h; y += 8) for (let x = (y % 16) * 2; x < w; x += 23) g.hline(x, x + 12, y, P.woodLine);
  return g;
}

/** 등굣길: 하늘·집·잔디·보도 (가로로 이어 붙일 수 있는 한 조각) */
export function streetTile(w: number, h = 96): Grid {
  const g = new Grid(w, h).rect(0, 0, w, h, P.sky);
  for (let x = 0; x < w; x++) for (let y = 24; y < 34; y++) if ((x + y) % 2 === 0 && y > 27 + (x % 3)) g.set(x, y, P.cream); // 하늘 아래쪽 밝게 (디더링)
  // 구름
  for (const [cx, cy] of [[30, 10], [110, 14], [200, 8], [290, 12]] as const) if (cx < w) g.ellipse(cx, cy, 9, 3, P.white).ellipse(cx + 6, cy - 2, 5, 3, P.white);
  // 집들
  const houses = [P.pink, P.egg, P.skyDark, P.creamDark, P.greenLight];
  for (let x = 0, n = 0; x < w; x += 46, n++) {
    const c = houses[n % houses.length], hh = 22 + (n % 3) * 5, top = 60 - hh;
    g.rect(x + 3, top, 38, hh, c);
    for (let i = 0; i < 22; i++) g.hline(x + 1 + Math.floor(i * 0.9), x + 43 - Math.floor(i * 0.9), top - 1 - Math.floor(i / 2.2), i < 2 ? P.ink : P.tomatoDark);
    g.rect(x + 9, top + 6, 7, 6, P.white).rect(x + 26, top + 6, 7, 6, P.white).rect(x + 10, top + 7, 5, 4, P.skyDark).rect(x + 27, top + 7, 5, 4, P.skyDark);
    g.rect(x + 18, 60 - 10, 6, 10, P.woodDark);
  }
  g.rect(0, 60, w, 6, P.grass).hline(0, w - 1, 60, P.grassDark);
  for (let x = 2; x < w; x += 7) g.set(x, 61, P.grassDark).set(x + 3, 62, P.grassDark);
  g.rect(0, 66, w, h - 66, P.road).hline(0, w - 1, 66, P.roadDark).hline(0, w - 1, 67, P.white);
  for (let x = 0; x < w; x += 16) g.vline(x, 68, h - 1, P.roadDark);
  g.hline(0, w - 1, 82, P.roadDark);
  return g;
}

/** 숨을 곳: 나무 (24×40) */
export function tree(): Grid {
  const g = new Grid(26, 44);
  g.rect(10, 26, 6, 18, P.woodDark).vline(11, 28, 42, P.brownDark);
  g.ellipse(13, 13, 12, 11, P.green).ellipse(8, 9, 5, 4, P.greenLight).ellipse(18, 18, 5, 4, P.greenDark);
  g.set(6, 14, P.greenDark).set(15, 6, P.greenLight).set(20, 10, P.greenLight);
  return g.outline(P.ink);
}

/** 숨을 곳: 전봇대 + 표지판 */
export function pole(): Grid {
  const g = new Grid(14, 48);
  g.rect(5, 2, 4, 46, P.greyDark).vline(6, 2, 46, P.grey);
  g.rect(0, 10, 14, 8, P.mustard).hline(0, 13, 10, P.mustardDark).hline(3, 10, 13, P.ink).hline(3, 8, 15, P.ink);
  return g.outline(P.ink);
}

/** 도시락통 (위에서 본 모습), 칸 좌표도 같이 돌려준다 */
export function bentoBox(): { g: Grid; cells: Record<'base' | 'main' | 'side', { x: number; y: number; w: number; h: number }> } {
  const g = new Grid(58, 40);
  g.rect(0, 0, 58, 40, P.tomato).hline(0, 57, 39, P.tomatoDark).hline(0, 57, 38, P.tomatoDark);
  const cells = { base: { x: 3, y: 3, w: 26, h: 33 }, main: { x: 31, y: 3, w: 24, h: 16 }, side: { x: 31, y: 21, w: 24, h: 15 } };
  for (const c of Object.values(cells)) g.rect(c.x, c.y, c.w, c.h, P.cream).hline(c.x, c.x + c.w - 1, c.y, P.creamDark);
  return { g: g.outline(P.ink), cells };
}

/** 뚜껑 + 보자기 매듭 */
export function bentoLid(): Grid {
  const g = new Grid(58, 40).rect(0, 0, 58, 40, P.tomato);
  for (let i = -40; i < 58; i += 6) for (let j = 0; j < 40; j++) g.set(i + j, j, P.tomatoDark);
  g.rect(22, 12, 14, 12, P.mustard).set(20, 10, P.mustard).set(19, 9, P.mustard).set(38, 10, P.mustard).set(39, 9, P.mustard).set(21, 11, P.mustard).set(37, 11, P.mustard);
  g.rect(26, 15, 6, 6, P.mustardDark);
  return g.outline(P.ink);
}
