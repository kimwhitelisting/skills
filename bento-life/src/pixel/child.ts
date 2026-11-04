/**
 * 아이 도트 캐릭터 생성기 — 부품(머리·얼굴·옷·키)을 조립해서 그린다.
 * 같은 규칙으로 그리기 때문에 7살에서 15살로 자라도 같은 아이로 보인다.
 *  - 남자아이: 진갈색 머리 + 정수리 뻗친 머리
 *  - 여자아이: 밤색 단발 + 머스터드색 핀
 *  - 둘 다 왼쪽 눈 밑에 작은 점
 */
import { Grid } from './grid.ts';
import { P } from './palette.ts';

export type PxAge = 7 | 15;
export type Gender = 'boy' | 'girl';
export type Expr = 'neutral' | 'happy' | 'yuck' | 'sad' | 'surprise';
export interface Look { age: PxAge; gender: Gender }

export const CHILD_W = 24;
export const CHILD_H = 40;

/** 나이별 몸 비율 (7살: 머리가 크고 짧다 / 15살: 길쭉) */
function body(age: PxAge) {
  return age === 7
    ? { rx: 7.5, ry: 7, torsoTop: 25, torsoH: 8, legTop: 33, legH: 5, torsoW: 12 }
    : { rx: 6.5, ry: 7, torsoTop: 19, torsoH: 10, legTop: 29, legH: 9, torsoW: 12 };
}

function drawHead(g: Grid, look: Look, cx: number, cy: number, rx: number, ry: number, side: boolean) {
  const hair = look.gender === 'boy' ? P.hairBoy : P.hairGirl;
  const hairHi = look.gender === 'boy' ? P.hairBoyHi : P.hairGirlHi;
  const fy = Math.round(cy - 3); // 앞머리 줄
  g.ellipse(cx, cy, rx, ry, P.skin);
  if (look.gender === 'girl') {
    // 단발: 옆머리가 볼 아래까지 내려온다
    g.ellipse(cx, cy - 0.5, rx + 1.3, ry + 0.8, hair, (x, y) => y <= fy || (y <= cy + 3 && (side ? x < cx : x < cx - rx + 2 || x > cx + rx - 2)));
    for (let x = Math.round(cx - rx + 1); x <= Math.round(cx + rx - 1); x++) if (!side || x >= cx - 1) g.set(x, fy + 1, (x - Math.round(cx)) % 4 === 0 ? P.skin : hair);
    const pinX = side ? Math.round(cx + 1) : Math.round(cx - rx + 1);
    g.rect(pinX, fy - 1, 2, 1, P.clip);
    g.set(Math.round(cx - 1), Math.round(cy - ry), hairHi).set(Math.round(cx), Math.round(cy - ry), hairHi);
  } else {
    g.ellipse(cx, cy - 0.5, rx + 0.8, ry + 0.8, hair, (x, y) => y <= fy || (y <= cy && (side ? x < cx - 1 : x < cx - rx + 1 || x > cx + rx - 1)));
    for (let x = Math.round(cx - rx + 1); x <= Math.round(cx + rx - 1); x++) if ((!side || x >= cx - 1) && (x + 2) % 3 !== 0) g.set(x, fy + 1, hair);
    const top = Math.round(cy - ry - 1);
    g.set(cx + 1, top, hair).set(cx + 2, top - 1, hair).set(cx + 3, top - 1, hair); // 뻗친 머리
    g.set(Math.round(cx - 2), Math.round(cy - ry + 0.5), hairHi).set(Math.round(cx - 3), Math.round(cy - ry + 1), hairHi);
  }
  if (side) g.set(Math.round(cx - 1), Math.round(cy + 1), P.skinShade);
  else { g.set(Math.round(cx - rx - 0.7), Math.round(cy + 1), P.skin); g.set(Math.round(cx + rx + 0.7), Math.round(cy + 1), P.skin); }
}

function drawFace(g: Grid, look: Look, cx: number, cy: number, expr: Expr, blink: boolean, side: boolean) {
  const ey = Math.round(cy);
  const L = Math.round(cx - 4), R = Math.round(cx + 2); // 두 눈의 왼쪽 칸 (각 2칸 폭)
  const eyes = side ? [Math.round(cx + 3)] : [L, R];
  const my = ey + 4;
  const mx = side ? Math.round(cx + 4) : Math.round(cx - 1);
  eyes.forEach((ex, n) => {
    if (blink && expr !== 'happy' && expr !== 'yuck') { g.hline(ex, ex + 1, ey + 1, P.eye); return; }
    switch (expr) {
      case 'happy': g.set(ex - 1, ey + 1, P.eye).set(ex, ey, P.eye).set(ex + 1, ey, P.eye).set(ex + 2, ey + 1, P.eye); break;
      case 'yuck': {
        const flip = !side && n === 1; // 왼눈 >  오른눈 <
        g.set(flip ? ex + 1 : ex, ey - 1, P.eye).set(flip ? ex : ex + 1, ey, P.eye).set(flip ? ex + 1 : ex, ey + 1, P.eye);
        break;
      }
      case 'surprise': g.rect(ex, ey - 1, 2, 3, P.eye).set(ex, ey - 1, P.white); break;
      default:
        g.rect(ex, ey, 2, 2, P.eye).set(ex, ey, look.age === 7 ? P.white : P.eye);
        if (expr === 'sad') g.set(n === 0 ? ex + 2 : ex - 1, ey - 2, P.eye); // 처진 눈썹
    }
  });
  if (expr === 'sad') g.set(side ? Math.round(cx + 3) : L, ey + 2, P.sky).set(side ? Math.round(cx + 3) : L, ey + 3, P.sky); // 눈물
  if (!side) g.set(R + 2, ey + 2, P.inkSoft); // 왼쪽 눈 밑 점
  if (look.age === 7 || expr === 'happy') {
    if (side) g.set(Math.round(cx + 2), ey + 2, P.blush);
    else g.hline(L - 1, L, ey + 2, P.blush).hline(R + 1, R + 1, ey + 3, P.blush);
  }
  switch (expr) {
    case 'happy': g.hline(mx - 1, mx + 2, my, P.mouth).set(mx - 1, my, P.mouth).hline(mx, mx + 1, my + 1, P.tongue); break;
    case 'yuck': g.set(mx - 1, my + 1, P.mouth).set(mx, my, P.mouth).set(mx + 1, my + 1, P.mouth).set(mx + 2, my, P.mouth).set(mx + 1, my + 2, P.tongue); break;
    case 'sad': g.set(mx - 1, my + 1, P.mouth).hline(mx, mx + 1, my, P.mouth).set(mx + 2, my + 1, P.mouth); break;
    case 'surprise': g.rect(mx, my, 2, 2, P.mouth); break;
    default: g.hline(mx, mx + 1, my, P.mouth);
  }
}

function drawOutfitFront(g: Grid, look: Look, cx: number, b: ReturnType<typeof body>, bob: number) {
  const left = Math.round(cx - b.torsoW / 2), top = b.torsoTop + bob;
  const teen = look.age === 15;
  const top1 = teen ? P.navy : look.gender === 'girl' ? P.smock : P.shirt;
  const top2 = teen ? P.navyDark : look.gender === 'girl' ? P.smockShade : P.shirtShade;
  // 팔
  g.rect(left - 2, top + 1, 2, b.torsoH - 2, top1).rect(left + b.torsoW, top + 1, 2, b.torsoH - 2, top1);
  g.rect(left - 2, top + b.torsoH - 2, 2, 2, P.skin).rect(left + b.torsoW, top + b.torsoH - 2, 2, 2, P.skin);
  // 몸통
  g.rect(left, top, b.torsoW, b.torsoH, top1);
  g.vline(left, top + 1, top + b.torsoH - 1, top2).vline(left + b.torsoW - 1, top + 1, top + b.torsoH - 1, top2);
  if (teen) {
    // 교복: 흰 칼라 + 넥타이(남) / 리본(여)
    g.set(cx - 2, top, P.collar).set(cx - 1, top + 1, P.collar).set(cx + 1, top, P.collar).set(cx, top + 1, P.collar);
    if (look.gender === 'boy') g.vline(cx - 1, top + 2, top + 5, P.tie).vline(cx, top + 2, top + 5, P.tie);
    else g.hline(cx - 2, cx + 1, top + 2, P.tie).set(cx - 1, top + 3, P.tie).set(cx, top + 3, P.tie);
    g.set(cx - 3, top + 6, P.collar); // 단추
  } else {
    // 책가방 끈
    g.vline(left + 2, top, top + b.torsoH - 2, P.pack).vline(left + b.torsoW - 3, top, top + b.torsoH - 2, P.pack);
  }
}

function drawLegsFront(g: Grid, look: Look, cx: number, b: ReturnType<typeof body>, bob: number) {
  const teen = look.age === 15;
  const lt = b.legTop + bob, lh = b.legH - bob;
  const lx = cx - 4, rx = cx + 1;
  if (teen && look.gender === 'boy') { g.rect(lx, lt, 3, lh, P.navy).rect(rx, lt, 3, lh, P.navy); }
  else if (teen) {
    g.rect(cx - 6, lt, 12, 4, P.navy); // 치마
    g.rect(lx, lt + 4, 3, lh - 4, P.skin).rect(rx, lt + 4, 3, lh - 4, P.skin);
    g.rect(lx, lt + lh - 3, 3, 3, P.sock).rect(rx, lt + lh - 3, 3, 3, P.sock);
  } else if (look.gender === 'girl') {
    g.rect(cx - 6, lt, 12, 2, P.smock); // 원피스 자락
    g.rect(lx, lt + 2, 3, lh - 2, P.skin).rect(rx, lt + 2, 3, lh - 2, P.skin);
    g.rect(lx, lt + lh - 1, 3, 1, P.sock).rect(rx, lt + lh - 1, 3, 1, P.sock);
  } else {
    g.rect(cx - 5, lt, 10, 2, P.shorts);
    g.rect(lx, lt + 2, 3, lh - 2, P.skin).rect(rx, lt + 2, 3, lh - 2, P.skin);
    g.rect(lx, lt + lh - 1, 3, 1, P.sock).rect(rx, lt + lh - 1, 3, 1, P.sock);
  }
  g.rect(lx - 1, CHILD_H - 2, 4, 2, P.shoe).rect(rx, CHILD_H - 2, 4, 2, P.shoe);
}

/** 정면 (부엌·현관·결산) */
export function childFront(look: Look, expr: Expr = 'neutral', o: { blink?: boolean; bob?: 0 | 1 } = {}): Grid {
  const g = new Grid(CHILD_W, CHILD_H);
  const b = body(look.age);
  const cx = 12, bob = o.bob ?? 0;
  const cy = b.torsoTop - b.ry + 0.5 + bob;
  drawLegsFront(g, look, cx, b, bob);
  drawOutfitFront(g, look, cx, b, bob);
  if (look.age === 15) g.rect(cx - 1, Math.round(cy + b.ry) - 1, 2, 2, P.skinShade); // 목
  drawHead(g, look, cx, cy, b.rx, b.ry, false);
  drawFace(g, look, cx, cy, expr, !!o.blink, false);
  return g.outline(P.ink);
}

/** 옆모습 걷기 (오른쪽을 본다), frame 0~3 */
export function childSide(look: Look, frame: number, expr: Expr = 'neutral'): Grid {
  const g = new Grid(CHILD_W, CHILD_H);
  const b = body(look.age);
  const teen = look.age === 15;
  const cx = 11, f = frame % 4;
  const bob = f % 2 === 1 ? -1 : 0;
  const cy = b.torsoTop - b.ry + 0.5 + bob;
  const top = b.torsoTop + bob, tw = 8, left = cx - 4;
  const legColor = teen && look.gender === 'boy' ? P.navy : P.skin;
  // 다리: 앞뒤로 엇갈림
  const swing = f === 0 ? 2 : f === 2 ? -2 : 0;
  const legY = b.legTop + bob;
  const legH = CHILD_H - 2 - legY;
  const back = { x: cx - 2 - swing, c: legColor }, front = { x: cx - 1 + swing, c: legColor };
  for (const [i, leg] of [back, front].entries()) {
    g.rect(leg.x, legY, 3, legH, i === 0 && legColor === P.skin ? P.skinShade : leg.c);
    if (!(teen && look.gender === 'boy')) g.rect(leg.x, CHILD_H - 3, 3, 1, P.sock);
    g.rect(leg.x, CHILD_H - 2, 4, 2, P.shoe);
  }
  if (teen && look.gender === 'girl') g.rect(cx - 5, legY, 10, 4, P.navy);
  else if (!teen && look.gender === 'girl') g.rect(cx - 5, legY, 10, 2, P.smock);
  else if (!teen) g.rect(cx - 4, legY, 8, 2, P.shorts);
  // 몸통
  const top1 = teen ? P.navy : look.gender === 'girl' ? P.smock : P.shirt;
  g.rect(left, top, tw, b.torsoH, top1);
  if (teen) g.set(cx + 2, top, P.collar).set(cx + 3, top + 1, look.gender === 'boy' ? P.tie : P.collar);
  // 책가방 (등 쪽)
  g.rect(left - 4, top + 1, 5, Math.min(9, b.torsoH), P.pack).hline(left - 4, left, top + 1, P.packShade).vline(left - 4, top + 1, top + Math.min(9, b.torsoH) - 1, P.packShade);
  // 팔: 걸을 때 흔들림
  const armX = cx - 1 - Math.round(swing / 2);
  g.rect(armX, top + 1, 2, b.torsoH - 3, teen ? P.navyDark : look.gender === 'girl' ? P.smockShade : P.shirtShade);
  g.rect(armX, top + b.torsoH - 2, 2, 2, P.skin);
  drawHead(g, look, cx + 1, cy, b.rx - 0.5, b.ry, true);
  drawFace(g, look, cx + 1, cy, expr, false, true);
  return g.outline(P.ink);
}

/** 부모 실루엣 (얼굴 없음) — 빨간 도시락 보자기를 들고 있다 */
export function parentSide(frame: number, opts: { dash?: boolean } = {}): Grid {
  const g = new Grid(20, 46);
  const f = frame % 4;
  const bob = f % 2 === 1 ? -1 : 0;
  const swing = (f === 0 ? 3 : f === 2 ? -3 : 0) * (opts.dash ? 1.5 : 1);
  const body = P.inkSoft;
  g.ellipse(9, 5 + bob, 4.5, 4.5, body);
  g.rect(5, 10 + bob, 9, 18, body).rect(4, 14 + bob, 11, 12, body);
  g.rect(Math.round(7 - swing), 28 + bob, 3, 16 - bob, body).rect(Math.round(9 + swing), 28 + bob, 3, 16 - bob, body);
  g.rect(Math.round(7 - swing), 44, 4, 2, P.ink).rect(Math.round(9 + swing), 44, 4, 2, P.ink);
  // 앞으로 내민 팔 + 도시락
  g.rect(12, 16 + bob, 4, 3, body);
  g.rect(14, 18 + bob, 6, 5, P.tomato).hline(14, 19, 18 + bob, P.tomatoDark).set(16, 17 + bob, P.mustard).set(17, 17 + bob, P.mustard);
  return g.outline(P.ink);
}
