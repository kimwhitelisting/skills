/** 등굣길·현관에 필요한 추가 도트 그림: 강아지, 이웃 할머니, 학교, 현관 */
import { Grid } from './grid.ts';
import { P } from './palette.ts';

/** 강아지 (오른쪽을 봄), frame 0~1 */
export function dog(frame: number): Grid {
  const g = new Grid(20, 14);
  const c = '#e9c48f', d = '#c99a5e';
  g.rect(4, 5, 11, 5, c).ellipse(15.5, 4.5, 3.5, 3.2, c).rect(16, 0, 2, 3, d).set(18, 6, P.ink).set(17, 3, P.eye);
  g.rect(1, 3, 3, 2, c); // 꼬리
  const lg = frame % 2 === 0 ? [5, 8, 11, 13] : [6, 7, 12, 14];
  for (const x of lg) g.rect(x, 10, 2, 3, d);
  g.set(9, 7, d).set(10, 6, d);
  return g.outline(P.ink);
}

/** 이웃 할머니 (정면) */
export function neighbor(): Grid {
  const g = new Grid(22, 40);
  g.ellipse(11, 9, 6, 6.5, P.skin);
  g.ellipse(11, 6, 7, 5, '#d8d2cc', (_x, y) => y <= 6).ellipse(11, 1.5, 3, 2.5, '#d8d2cc');
  g.rect(8, 9, 2, 1, P.eye).rect(13, 9, 2, 1, P.eye).hline(10, 12, 12, P.mouth).set(7, 11, P.blush).set(15, 11, P.blush);
  g.rect(5, 16, 12, 16, '#a77bb3').rect(3, 17, 2, 10, '#a77bb3').rect(17, 17, 2, 10, '#a77bb3').rect(3, 27, 2, 2, P.skin).rect(17, 27, 2, 2, P.skin);
  g.rect(6, 32, 4, 6, '#6d5a78').rect(12, 32, 4, 6, '#6d5a78').rect(5, 38, 5, 2, P.shoe).rect(12, 38, 5, 2, P.shoe);
  g.rect(18, 22, 3, 8, '#7a9a5a').hline(17, 21, 22, '#5e7a42'); // 장바구니 대파
  return g.outline(P.ink);
}

/** 학교 건물 */
export function school(): Grid {
  const g = new Grid(70, 60);
  g.rect(4, 18, 62, 42, P.cream).rect(28, 4, 14, 16, P.cream);
  for (let i = 0; i < 10; i++) g.hline(2 + i, 67 - i, 17 - Math.floor(i / 2), P.tomatoDark);
  g.ellipse(35, 11, 4, 4, P.white).vline(35, 8, 11, P.ink).hline(35, 37, 11, P.ink);
  for (const x of [9, 21, 45, 57]) for (const y of [24, 38]) g.rect(x, y, 8, 8, P.skyDark).rect(x + 1, y + 1, 3, 3, P.sky);
  g.rect(30, 42, 10, 18, P.woodDark).vline(35, 42, 59, P.brownDark);
  g.rect(24, 21, 22, 5, P.sage).hline(26, 43, 23, P.white);
  return g.outline(P.ink);
}

/** 현관: 벽지 + 문(열림) + 신발장 + 매트. 아이는 문 안쪽에 선다 */
export function entryWall(w: number, h: number): Grid {
  const g = new Grid(w, h).rect(0, 0, w, h, '#eef0e2');
  for (let x = 0; x < w; x += 6) g.vline(x, 0, h - 1, '#e2e6cf');
  const dx = Math.round(w / 2) - 18;
  g.rect(dx - 3, 6, 42, h - 6, P.woodDark).rect(dx, 9, 36, h - 9, P.sky).rect(dx, Math.round(h * 0.62), 36, h, P.grass);
  g.ellipse(dx + 10, 20, 6, 2.5, P.white).ellipse(dx + 26, 15, 5, 2, P.white);
  g.rect(dx + 36, 6, 8, h - 6, '#b9855a').vline(dx + 42, 6, h - 1, '#94653f').set(dx + 38, Math.round(h * 0.55), P.mustard);
  // 신발장
  g.rect(4, h - 30, 16, 30, '#b9855a').hline(4, 19, h - 20, '#94653f').hline(4, 19, h - 10, '#94653f');
  g.rect(6, h - 14, 5, 3, P.tomato).rect(12, h - 14, 5, 3, P.skyDark).rect(6, h - 24, 6, 3, P.ink);
  return g;
}
export function entryFloor(w: number, h: number): Grid {
  const g = new Grid(w, h).rect(0, 0, w, h, P.wood).hline(0, w - 1, 0, P.woodDark);
  for (let y = 4; y < h; y += 5) for (let x = (y % 10) * 2; x < w; x += 19) g.hline(x, x + 9, y, P.woodLine);
  const mx = Math.round(w / 2) - 16;
  for (let x = 0; x < 32; x++) for (let y = 1; y < 5; y++) g.set(mx + x, y, (x >> 2) % 2 === 0 ? P.tomato : P.mustard);
  return g;
}
