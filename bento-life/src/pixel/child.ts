/**
 * 아이 도트 캐릭터 생성기 — 층(레이어)을 따로 그려서 겹친다.
 *   다리 → 옷 → 머리(피부) → 머리카락 → 얼굴 → 소품  → 마지막에 외곽선
 * 각 층은 코드로 그리지만, 사람이 고친 PNG가 있으면 그걸로 바꿔 끼운다 (PART_OVERRIDES).
 * 같은 규칙으로 그리기 때문에 아기에서 스무 살까지 7단계로 자라도 같은 아이로 보인다.
 *   1 아기(우주복) · 4 유치원(노란 원복) · 7 초등 저학년 · 11 초등 고학년 · 15 중학생 교복 · 18 고등학생 교복 · 19 스무 살 사복
 *  - 남자아이: 진갈색 머리 + 정수리 뻗친 머리 / 여자아이: 밤색 단발 + 머스터드색 핀 / 둘 다 왼쪽 눈 밑 점
 */
import { Grid, recolor, rotsprite, type Color } from './grid.ts';
import { P } from './palette.ts';

export type PxAge = 1 | 4 | 7 | 11 | 15 | 18 | 19;
export const PX_AGES: PxAge[] = [1, 4, 7, 11, 15, 18, 19];
/** 실제 나이 → 도트 성장 단계 */
export const pxAgeOf = (age: number): PxAge => (age <= 1 ? 1 : age <= 5 ? 4 : age <= 9 ? 7 : age <= 12 ? 11 : age <= 15 ? 15 : age <= 18 ? 18 : 19);
export type Gender = 'boy' | 'girl';
export type Expr = 'neutral' | 'happy' | 'yuck' | 'sad' | 'surprise';
export type View = 'front' | 'side';
export interface Look { age: PxAge; gender: Gender }
export interface Dress { outfit?: OutfitId; hat?: HatId; tilt?: number }

export const CHILD_W = 24;
export const CHILD_H = 40;
export const WALK_FRAMES = 8;
export const EXPRS: Expr[] = ['neutral', 'happy', 'yuck', 'sad', 'surprise'];

// ───────── 사람이 고친 부품 (PNG → Grid) ─────────
/** 키 예: front-7-girl-hair, side-15-boy-legs-f3, front-7-boy-face-happy-blink */
export const PART_OVERRIDES = new Map<string, Grid>();
export const partKey = (view: View, look: Look, layer: string) => `${view}-${look.age}-${look.gender}-${layer}`;
const part = (view: View, look: Look, layer: string, make: () => Grid): Grid => PART_OVERRIDES.get(partKey(view, look, layer)) ?? make();

// ───────── 체형 ─────────
// 발끝은 늘 같은 줄(38)에 닿는다: legTop + legH = 38. 클수록 머리는 작아지고 몸과 다리가 길어진다.
const BODY: Record<PxAge, { rx: number; ry: number; torsoTop: number; torsoH: number; legTop: number; legH: number; torsoW: number }> = {
  1: { rx: 8, ry: 7.5, torsoTop: 29, torsoH: 6, legTop: 35, legH: 3, torsoW: 12 },
  4: { rx: 7.8, ry: 7.2, torsoTop: 27, torsoH: 7, legTop: 34, legH: 4, torsoW: 12 },
  7: { rx: 7.5, ry: 7, torsoTop: 25, torsoH: 8, legTop: 33, legH: 5, torsoW: 12 },
  11: { rx: 7, ry: 7, torsoTop: 22, torsoH: 9, legTop: 31, legH: 7, torsoW: 12 },
  15: { rx: 6.5, ry: 7, torsoTop: 19, torsoH: 10, legTop: 29, legH: 9, torsoW: 12 },
  18: { rx: 6.3, ry: 7, torsoTop: 17, torsoH: 11, legTop: 28, legH: 10, torsoW: 12 },
  19: { rx: 6.3, ry: 7, torsoTop: 17, torsoH: 11, legTop: 28, legH: 10, torsoW: 12 },
};
const body = (age: PxAge) => BODY[age];
type Style = 'baby' | 'kinder' | 'kid' | 'tween' | 'uniform' | 'senior' | 'casual';
const STYLE: Record<PxAge, Style> = { 1: 'baby', 4: 'kinder', 7: 'kid', 11: 'tween', 15: 'uniform', 18: 'senior', 19: 'casual' };
const BABY_PINK = '#f6b7c0', BABY_PINK_D = '#e48896', TWEEN_PLUM = '#a77bb3', TWEEN_PLUM_D = '#86609a';
const SENIOR = '#575b70', SENIOR_D = '#40435a', CASUAL_BOY = '#7fa7c9', CASUAL_BOY_D = '#5f88ab', CASUAL_GIRL = '#e9a3b0', CASUAL_GIRL_D = '#cf8191', LONG_SKIRT = '#c9b28f', SENIOR_SKIRT = '#7a4e5a';
const blank = () => new Grid(CHILD_W, CHILD_H);
const headCenter = (look: Look, view: View) => {
  const b = body(look.age);
  return { cx: view === 'front' ? 12 : 12, cy: b.torsoTop - b.ry + 0.5, rx: view === 'front' ? b.rx : b.rx - 0.5, ry: b.ry };
};
/** 소품을 얹을 머리 꼭대기 (흔들림 0 기준) */
export function headTop(look: Look, view: View = 'front'): { x: number; y: number } {
  const h = headCenter(look, view);
  return { x: Math.round(h.cx), y: Math.round(h.cy - h.ry) };
}

// ───────── 머리 (피부 + 머리카락을 그린 뒤 둘로 나눈다) ─────────
function headFull(look: Look, view: View): Grid {
  const g = blank();
  const side = view === 'side';
  const { cx, cy, rx, ry } = headCenter(look, view);
  const hair = look.gender === 'boy' ? P.hairBoy : P.hairGirl;
  const hairHi = look.gender === 'boy' ? P.hairBoyHi : P.hairGirlHi;
  const fy = Math.round(cy - 3);
  const baby = look.age === 1;
  const long = look.age >= 18 ? 3 : 0;
  if (look.age >= 15) g.rect(cx - 1, Math.round(cy + ry) - 1, 2, 2, P.skinShade); // 목
  g.ellipse(cx, cy, rx, ry, P.skin);
  if (baby) {
    // 아기: 정수리에 몇 가닥 (여자아이는 핀, 남자아이는 뻗친 머리 — 크면서 이어진다)
    const top = Math.round(cy - ry);
    g.ellipse(cx, cy - 0.5, rx + 0.3, ry + 0.3, hair, (_x, y) => y <= top + 1);
    if (look.gender === 'girl') g.set(cx, top - 1, hair).set(cx - 1, top - 2, hair).rect(side ? Math.round(cx + 1) : Math.round(cx - 4), top + 1, 2, 1, P.clip);
    else g.set(cx + 1, top - 1, hair).set(cx + 2, top - 2, hair).set(cx + 3, top - 2, hair);
  } else if (look.gender === 'girl') {
    g.ellipse(cx, cy - 0.5, rx + 1.3, ry + 0.8 + long * 0.4, hair, (x, y) => y <= fy || (y <= cy + 3 + long && (side ? x < cx : x < cx - rx + 2 || x > cx + rx - 2)));
    for (let x = Math.round(cx - rx + 1); x <= Math.round(cx + rx - 1); x++) if (!side || x >= cx - 1) g.set(x, fy + 1, (x - Math.round(cx)) % 4 === 0 ? P.skin : hair);
    g.rect(side ? Math.round(cx + 1) : Math.round(cx - rx + 1), fy - 1, 2, 1, P.clip);
    g.set(Math.round(cx - 1), Math.round(cy - ry), hairHi).set(Math.round(cx), Math.round(cy - ry), hairHi);
  } else {
    g.ellipse(cx, cy - 0.5, rx + 0.8, ry + 0.8, hair, (x, y) => y <= fy || (y <= cy + (long ? 1 : 0) && (side ? x < cx - 1 : x < cx - rx + 1 || x > cx + rx - 1)));
    for (let x = Math.round(cx - rx + 1); x <= Math.round(cx + rx - 1); x++) if ((!side || x >= cx - 1) && (x + 2) % 3 !== 0) g.set(x, fy + 1, hair);
    const top = Math.round(cy - ry - 1);
    g.set(cx + 1, top, hair).set(cx + 2, top - 1, hair).set(cx + 3, top - 1, hair);
    g.set(Math.round(cx - 2), Math.round(cy - ry + 0.5), hairHi).set(Math.round(cx - 3), Math.round(cy - ry + 1), hairHi);
  }
  if (side) g.set(Math.round(cx - 1), Math.round(cy + 1), P.skinShade);
  else { g.set(Math.round(cx - rx - 0.7), Math.round(cy + 1), P.skin); g.set(Math.round(cx + rx + 0.7), Math.round(cy + 1), P.skin); }
  return g;
}
const HAIR_COLORS = new Set<Color>([P.hairBoy, P.hairBoyHi, P.hairGirl, P.hairGirlHi, P.clip]);
function splitHead(g: Grid, wantHair: boolean): Grid {
  const o = blank();
  g.px.forEach((c, i) => { if (c && HAIR_COLORS.has(c) === wantHair) o.px[i] = c; });
  return o;
}

// ───────── 얼굴 ─────────
function face(look: Look, view: View, expr: Expr, blink: boolean): Grid {
  const g = blank();
  const side = view === 'side';
  const { cx, cy } = headCenter(look, view);
  const ey = Math.round(cy);
  const L = Math.round(cx - 4), R = Math.round(cx + 2);
  const eyes = side ? [Math.round(cx + 3)] : [L, R];
  const my = ey + 4;
  const mx = side ? Math.round(cx + 3) : Math.round(cx - 1);
  eyes.forEach((ex, n) => {
    if (blink && expr !== 'happy' && expr !== 'yuck') { g.hline(ex, ex + 1, ey + 1, P.eye); return; }
    switch (expr) {
      case 'happy': g.set(ex - 1, ey + 1, P.eye).set(ex, ey, P.eye).set(ex + 1, ey, P.eye).set(ex + 2, ey + 1, P.eye); break;
      case 'yuck': {
        const flip = !side && n === 1;
        g.set(flip ? ex + 1 : ex, ey - 1, P.eye).set(flip ? ex : ex + 1, ey, P.eye).set(flip ? ex + 1 : ex, ey + 1, P.eye);
        break;
      }
      case 'surprise': g.rect(ex, ey - 1, 2, 3, P.eye).set(ex, ey - 1, P.white); break;
      default:
        g.rect(ex, ey, 2, 2, P.eye).set(ex, ey, look.age <= 11 ? P.white : P.eye);
        if (expr === 'sad') g.set(n === 0 ? ex + 2 : ex - 1, ey - 2, P.eye);
    }
  });
  if (expr === 'sad') g.set(side ? Math.round(cx + 3) : L, ey + 2, P.sky).set(side ? Math.round(cx + 3) : L, ey + 3, P.sky);
  if (!side) g.set(R + 2, ey + 2, P.inkSoft); // 왼쪽 눈 밑 점
  if (look.age <= 7 || expr === 'happy') {
    if (side) g.set(Math.round(cx + 2), ey + 2, P.blush);
    else g.hline(L - 1, L, ey + 2, P.blush).hline(R + 1, R + 1, ey + 3, P.blush);
  }
  switch (expr) {
    case 'happy': g.hline(mx - 1, mx + 2, my, P.mouth).hline(mx, mx + 1, my + 1, P.tongue); break;
    case 'yuck': g.set(mx - 1, my + 1, P.mouth).set(mx, my, P.mouth).set(mx + 1, my + 1, P.mouth).set(mx + 2, my, P.mouth).set(mx + 1, my + 2, P.tongue); break;
    case 'sad': g.set(mx - 1, my + 1, P.mouth).hline(mx, mx + 1, my, P.mouth).set(mx + 2, my + 1, P.mouth); break;
    case 'surprise': g.rect(mx, my, 2, 2, P.mouth); break;
    default: g.hline(mx, mx + (side ? 0 : 1), my, P.mouth);
  }
  return g;
}

// ───────── 옷 · 다리 (정면) ─────────
function outfitColors(look: Look) {
  const st = STYLE[look.age], girl = look.gender === 'girl';
  const uni = st === 'uniform' || st === 'senior';
  const c: Record<Style, [Color, Color]> = {
    baby: girl ? [BABY_PINK, BABY_PINK_D] : [P.sky, P.skyDark],
    kinder: [P.smock, P.smockShade],
    kid: girl ? [P.smock, P.smockShade] : [P.shirt, P.shirtShade],
    tween: girl ? [TWEEN_PLUM, TWEEN_PLUM_D] : [P.sage, P.sageDark],
    uniform: [P.navy, P.navyDark],
    senior: [SENIOR, SENIOR_D],
    casual: girl ? [CASUAL_GIRL, CASUAL_GIRL_D] : [CASUAL_BOY, CASUAL_BOY_D],
  };
  const [top1, top2] = c[st];
  /** 바지(다리 전체를 덮는 색) — 없으면 맨다리+양말 */
  const pants: Color | undefined = st === 'baby' ? top1 : girl ? undefined : uni ? P.navy : st === 'tween' || st === 'casual' ? P.shorts : undefined;
  /** 치마/반바지 (색, 길이) */
  const skirt: [Color, number] | undefined = girl
    ? (st === 'kinder' || st === 'kid' ? [P.smock, 2] : st === 'tween' ? [TWEEN_PLUM, 3] : uni ? [st === 'senior' ? SENIOR_SKIRT : P.navy, 4] : st === 'casual' ? [LONG_SKIRT, 6] : undefined)
    : st === 'kinder' || st === 'kid' ? [P.shorts, 2] : undefined;
  return { top1, top2, st, uni, pants, skirt, pack: st !== 'baby' && st !== 'casual' };
}
function outfitFront(look: Look): Grid {
  const g = blank();
  const b = body(look.age), cx = 12;
  const left = Math.round(cx - b.torsoW / 2), top = b.torsoTop;
  const { top1, top2, st, uni } = outfitColors(look);
  g.rect(left - 2, top + 1, 2, b.torsoH - 2, top1).rect(left + b.torsoW, top + 1, 2, b.torsoH - 2, top1);
  g.rect(left - 2, top + b.torsoH - 2, 2, 2, P.skin).rect(left + b.torsoW, top + b.torsoH - 2, 2, 2, P.skin);
  g.rect(left, top, b.torsoW, b.torsoH, top1);
  g.vline(left, top + 1, top + b.torsoH - 1, top2).vline(left + b.torsoW - 1, top + 1, top + b.torsoH - 1, top2);
  if (uni) {
    if (st === 'senior') g.rect(cx - 1, top, 2, 5, P.collar); // 블레이저 안 흰 셔츠
    g.set(cx - 2, top, P.collar).set(cx - 1, top + 1, P.collar).set(cx + 1, top, P.collar).set(cx, top + 1, P.collar);
    if (look.gender === 'boy' || st === 'senior') g.vline(cx - 1, top + 2, top + 5, P.tie).vline(cx, top + 2, top + 5, P.tie);
    else g.hline(cx - 2, cx + 1, top + 2, P.tie).set(cx - 1, top + 3, P.tie).set(cx, top + 3, P.tie);
    g.set(cx - 3, top + 6, P.collar);
  } else if (st === 'baby') {
    g.rect(cx - 2, top, 4, 2, P.white).set(cx - 1, top + 3, top2).set(cx, top + 3, top2); // 턱받이
  } else if (st === 'kinder') {
    g.rect(left + 7, top + 2, 3, 2, P.white).set(left + 8, top + 2, P.tomato); // 이름표
  } else if (st === 'kid') {
    g.vline(left + 2, top, top + b.torsoH - 2, P.pack).vline(left + b.torsoW - 3, top, top + b.torsoH - 2, P.pack);
  } else if (st === 'tween') {
    g.hline(left, left + b.torsoW - 1, top + 3, P.white).vline(left + 2, top, top + b.torsoH - 2, P.pack).vline(left + b.torsoW - 3, top, top + b.torsoH - 2, P.pack);
  } else if (st === 'casual') {
    if (look.gender === 'boy') g.set(cx - 2, top, P.white).set(cx - 1, top + 1, P.white).set(cx + 1, top, P.white).set(cx, top + 1, P.white);
    else g.rect(cx - 1, top, 2, b.torsoH, P.cream).set(cx - 2, top + 3, P.mustard).set(cx - 2, top + 6, P.mustard);
  }
  return g;
}
function legsFront(look: Look): Grid {
  const g = blank();
  const b = body(look.age), cx = 12;
  const { pants, skirt, st } = outfitColors(look);
  const lt = b.legTop, lh = b.legH, lx = cx - 4, rx = cx + 1;
  if (pants) g.rect(lx, lt, 3, lh, pants).rect(rx, lt, 3, lh, pants);
  else {
    g.rect(lx, lt, 3, lh, P.skin).rect(rx, lt, 3, lh, P.skin);
    const sock = Math.max(1, Math.min(3, lh - 4));
    g.rect(lx, lt + lh - sock, 3, sock, P.sock).rect(rx, lt + lh - sock, 3, sock, P.sock);
  }
  if (st === 'baby') g.rect(cx - 5, lt, 10, 2, pants!);
  if (skirt) g.rect(cx - 6, lt, 12, skirt[1], skirt[0]);
  if (st === 'baby') g.rect(lx - 1, CHILD_H - 2, 4, 2, P.sock).rect(rx, CHILD_H - 2, 4, 2, P.sock);
  else g.rect(lx - 1, CHILD_H - 2, 4, 2, P.shoe).rect(rx, CHILD_H - 2, 4, 2, P.shoe);
  return g;
}

// ───────── 옷 · 다리 (옆모습, 걷기 8프레임) ─────────
/** 걷기 한 주기를 8장으로: 다리는 앞뒤로 엇갈리고, 지나가는 순간 몸이 1칸 올라가고 앞으로 나가는 발이 들린다 */
export function walkPose(frame: number) {
  const ph = ((frame % WALK_FRAMES) / WALK_FRAMES) * Math.PI * 2;
  const swing = Math.round(3 * Math.sin(ph));
  const forwardIsFront = Math.cos(ph) > 0;
  const passing = Math.abs(swing) <= 1;
  return { swing, bob: passing ? -1 : 0, liftFront: passing && forwardIsFront, liftBack: passing && !forwardIsFront, arm: -Math.round(1.6 * Math.sin(ph)) };
}
function legsSide(look: Look, frame: number): Grid {
  const g = blank();
  const b = body(look.age), cx = 11;
  const { pants, skirt, st } = outfitColors(look);
  const w = walkPose(frame);
  const legColor = pants ?? P.skin;
  const legY = b.legTop;
  const legs = [{ x: cx - 2 - w.swing, lift: w.liftBack, back: true }, { x: cx - 1 + w.swing, lift: w.liftFront, back: false }];
  for (const leg of legs) {
    const lift = leg.lift ? 1 : 0;
    const bottom = CHILD_H - 1 - lift;
    g.rect(leg.x, legY, 3, Math.max(1, bottom - 1 - legY), leg.back && legColor === P.skin ? P.skinShade : legColor);
    if (!pants) g.rect(leg.x, bottom - 2, 3, 1, P.sock);
    g.rect(leg.x, bottom - 1, 4, 2, st === 'baby' ? P.sock : P.shoe);
  }
  if (skirt) g.rect(cx - 5, legY, 10, skirt[1], skirt[0]);
  return g;
}
function outfitSide(look: Look, frame: number): Grid {
  const g = blank();
  const b = body(look.age), cx = 11;
  const { top1, top2, uni, pack } = outfitColors(look);
  const w = walkPose(frame);
  const top = b.torsoTop, left = cx - 4;
  g.rect(left, top, 8, b.torsoH, top1);
  if (uni) g.set(cx + 2, top, P.collar).set(cx + 3, top + 1, look.gender === 'boy' ? P.tie : P.collar);
  const ph = Math.min(9, b.torsoH);
  if (pack) g.rect(left - 4, top + 1, 5, ph, P.pack).hline(left - 4, left, top + 1, P.packShade).vline(left - 4, top + 1, top + ph - 1, P.packShade);
  const armX = cx - 1 + w.arm;
  g.rect(armX, top + 1, 2, b.torsoH - 3, top2).rect(armX, top + b.torsoH - 2, 2, 2, P.skin);
  return g;
}

// ───────── 옷 색 바꾸기 (팔레트 교체) ─────────
export type OutfitId = 'default' | 'mint' | 'berry' | 'sky' | 'raincoat';
const OUTFIT_SWAPS: Record<OutfitId, Record<string, Color>> = {
  default: {},
  mint: { [P.shirt]: '#bfe6cf', [P.shirtShade]: '#97cfb0', [P.smock]: '#bfe6cf', [P.smockShade]: '#97cfb0', [P.navy]: '#3f7a6a', [P.navyDark]: '#2e5d50' },
  berry: { [P.shirt]: '#f3b6c4', [P.shirtShade]: '#e08ea2', [P.smock]: '#f3b6c4', [P.smockShade]: '#e08ea2', [P.navy]: '#7a3b5a', [P.navyDark]: '#5c2b44' },
  sky: { [P.shirt]: '#bcdcf2', [P.shirtShade]: '#94c2e3', [P.smock]: '#bcdcf2', [P.smockShade]: '#94c2e3', [P.navy]: '#3a5f8f', [P.navyDark]: '#2b476c' },
  raincoat: { [P.shirt]: '#ffd84a', [P.shirtShade]: '#e6b52b', [P.smock]: '#ffd84a', [P.smockShade]: '#e6b52b', [P.navy]: '#f2c230', [P.navyDark]: '#d19f1c' },
};
export const OUTFITS = Object.keys(OUTFIT_SWAPS) as OutfitId[];

// ───────── 머리 소품 (머리 꼭대기에 붙인다) ─────────
export type HatId = 'none' | 'crown' | 'gradcap' | 'cap' | 'raincap';
function hat(id: HatId, look: Look, view: View): Grid {
  const g = blank();
  if (id === 'none') return g;
  const { x, y } = headTop(look, view);
  if (id === 'crown') { g.rect(x - 5, y - 1, 10, 3, P.mustard).set(x - 5, y - 2, P.mustard).set(x - 1, y - 3, P.mustard).set(x, y - 3, P.mustard).set(x + 4, y - 2, P.mustard).set(x - 2, y, P.red).set(x + 2, y, P.sky); }
  if (id === 'gradcap') { g.rect(x - 7, y - 1, 15, 2, P.ink).rect(x - 4, y + 1, 9, 2, P.inkSoft).vline(x + 6, y + 1, y + 5, P.mustard).set(x + 6, y + 6, P.mustard); }
  if (id === 'cap') { g.ellipse(x, y + 2, 7, 3.5, P.tomato, (_x, yy) => yy <= y + 2).rect(view === 'side' ? x + 3 : x - 2, y + 2, view === 'side' ? 6 : 5, 1, P.tomatoDark); }
  if (id === 'raincap') { g.ellipse(x, y + 3, 8.5, 4.5, '#ffd84a', (_x, yy) => yy <= y + 3).hline(x - 9, x + 9, y + 3, '#e6b52b'); }
  return g;
}

// ───────── 조립 ─────────
function compose(layers: Grid[], o: { bob: number; tiltDeg?: number; tiltPivot?: { x: number; y: number }; upperFrom: number }): Grid {
  const out = blank();
  layers.forEach((l, i) => out.draw(l, 0, i >= o.upperFrom ? o.bob : 0));
  if (o.tiltDeg && o.tiltPivot) {
    // 머리 쪽 층만 다시 그려서 기울인다 (RotSprite 방식이라 외곽이 덜 깨진다)
    const head = blank();
    layers.slice(o.upperFrom + 1).forEach((l) => head.draw(l, 0, o.bob)); // 옷 다음부터 = 머리·머리카락·얼굴·소품
    const tilted = rotsprite(head, (o.tiltDeg * Math.PI) / 180, o.tiltPivot.x, o.tiltPivot.y + o.bob);
    const base = blank();
    layers.slice(0, o.upperFrom + 1).forEach((l, i) => base.draw(l, 0, i >= o.upperFrom ? o.bob : 0));
    return base.draw(tilted, 0, 0);
  }
  return out;
}

/** 정면 (부엌·현관·결산) */
export function childFront(look: Look, expr: Expr = 'neutral', o: { blink?: boolean; bob?: 0 | 1 } & Dress = {}): Grid {
  const full = headFull(look, 'front');
  const layers = [
    part('front', look, 'legs', () => legsFront(look)),
    part('front', look, 'outfit', () => outfitFront(look)),
    part('front', look, 'head', () => splitHead(full, false)),
    part('front', look, 'hair', () => splitHead(full, true)),
    part('front', look, `face-${expr}${o.blink ? '-blink' : ''}`, () => face(look, 'front', expr, !!o.blink)),
    hat(o.hat ?? 'none', look, 'front'),
  ];
  const { cx, cy, ry } = headCenter(look, 'front');
  let g = compose(layers, { bob: o.bob ?? 0, upperFrom: 1, tiltDeg: o.tilt, tiltPivot: { x: cx, y: cy + ry } });
  if (o.outfit && o.outfit !== 'default') g = recolor(g, OUTFIT_SWAPS[o.outfit]);
  return g.outline(P.ink);
}

/** 옆모습 걷기 (오른쪽을 본다), frame 0~7 */
export function childSide(look: Look, frame: number, expr: Expr = 'neutral', o: Dress = {}): Grid {
  const f = ((frame % WALK_FRAMES) + WALK_FRAMES) % WALK_FRAMES;
  const full = headFull(look, 'side');
  const layers = [
    part('side', look, `legs-f${f}`, () => legsSide(look, f)),
    part('side', look, `outfit-f${f}`, () => outfitSide(look, f)),
    part('side', look, 'head', () => splitHead(full, false)),
    part('side', look, 'hair', () => splitHead(full, true)),
    part('side', look, `face-${expr}`, () => face(look, 'side', expr, false)),
    hat(o.hat ?? 'none', look, 'side'),
  ];
  let g = compose(layers, { bob: walkPose(f).bob, upperFrom: 1 });
  if (o.outfit && o.outfit !== 'default') g = recolor(g, OUTFIT_SWAPS[o.outfit]);
  return g.outline(P.ink);
}

/** 부모 실루엣 (얼굴 없음) — 빨간 도시락 보자기를 들고 있다. frame 0~7 */
export function parentSide(frame: number, opts: { dash?: boolean } = {}): Grid {
  const g = new Grid(20, 46);
  const w = walkPose(frame);
  const swing = Math.round(w.swing * (opts.dash ? 1.4 : 1));
  const bob = w.bob;
  const c = P.inkSoft;
  g.ellipse(9, 5 + bob, 4.5, 4.5, c);
  g.rect(5, 10 + bob, 9, 18, c).rect(4, 14 + bob, 11, 12, c);
  for (const [x, lift] of [[7 - swing, w.liftBack], [9 + swing, w.liftFront]] as const) {
    g.rect(Math.round(x), 28 + bob, 3, 16 - bob - (lift ? 1 : 0), c).rect(Math.round(x), 44 - (lift ? 1 : 0), 4, 2, P.ink);
  }
  g.rect(12, 16 + bob, 4, 3, c);
  g.rect(14, 18 + bob, 6, 5, P.tomato).hline(14, 19, 18 + bob, P.tomatoDark).set(16, 17 + bob, P.mustard).set(17, 17 + bob, P.mustard);
  return g.outline(P.ink);
}

/** 부품 하나만 따로 (PNG로 뽑아서 사람이 고칠 때) */
export function childLayers(view: View, look: Look): Record<string, Grid> {
  const full = headFull(look, view);
  const out: Record<string, Grid> = { head: splitHead(full, false), hair: splitHead(full, true) };
  for (const e of EXPRS) {
    out[`face-${e}`] = face(look, view, e, false);
    if (view === 'front' && (e === 'neutral' || e === 'sad' || e === 'surprise')) out[`face-${e}-blink`] = face(look, view, e, true);
  }
  if (view === 'front') { out.legs = legsFront(look); out.outfit = outfitFront(look); }
  else for (let f = 0; f < WALK_FRAMES; f++) { out[`legs-f${f}`] = legsSide(look, f); out[`outfit-f${f}`] = outfitSide(look, f); }
  return out;
}
