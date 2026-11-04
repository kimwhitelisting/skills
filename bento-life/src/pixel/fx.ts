/** 도트 이펙트 — 하트, 반짝임, 먼지, 느낌표. 모두 칸 단위로 그린다 */
import { P } from './palette.ts';

export type Fx = { kind: 'heart' | 'sparkle' | 'dust' | 'star'; x: number; y: number; t: number; life: number; vx: number; vy: number };

const HEART = ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'];
const STAR = ['..y..', '.yyy.', 'yyyyy', '.yyy.', '.y.y.'];

export function spawn(list: Fx[], kind: Fx['kind'], x: number, y: number, n = 1): void {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = kind === 'dust' ? 6 + Math.random() * 6 : kind === 'sparkle' ? 10 + Math.random() * 14 : 4 + Math.random() * 6;
    list.push({ kind, x, y, t: 0, life: kind === 'heart' ? 0.9 : kind === 'dust' ? 0.5 : 0.6,
      vx: Math.cos(a) * sp * (kind === 'heart' ? 0.6 : 1), vy: kind === 'heart' ? -18 - Math.random() * 10 : Math.sin(a) * sp - (kind === 'dust' ? 4 : 0) });
  }
}

export function step(list: Fx[], dt: number): void {
  for (const f of list) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.kind === 'dust') { f.vx *= 0.9; f.vy *= 0.9; } }
  for (let i = list.length - 1; i >= 0; i--) if (list[i].t >= list[i].life) list.splice(i, 1);
}

function stampMap(ctx: CanvasRenderingContext2D, map: string[], x: number, y: number, s: number, colors: Record<string, string>) {
  map.forEach((row, j) => [...row].forEach((ch, i) => { if (colors[ch]) { ctx.fillStyle = colors[ch]; ctx.fillRect((x + i) * s, (y + j) * s, s, s); } }));
}

export function draw(ctx: CanvasRenderingContext2D, list: Fx[], s: number, camX = 0): void {
  for (const f of list) {
    const k = f.t / f.life;
    ctx.globalAlpha = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
    const x = Math.round(f.x - camX), y = Math.round(f.y);
    if (f.kind === 'heart') stampMap(ctx, HEART, x - 2, y - 2, s, { r: P.red });
    else if (f.kind === 'star') stampMap(ctx, STAR, x - 2, y - 2, s, { y: P.mustard });
    else if (f.kind === 'sparkle') {
      const r = k < 0.3 ? 1 : k < 0.6 ? 2 : 1;
      ctx.fillStyle = P.white; ctx.fillRect(x * s, y * s, s, s);
      ctx.fillStyle = P.mustard;
      for (let i = 1; i <= r; i++) { ctx.fillRect((x + i) * s, y * s, s, s); ctx.fillRect((x - i) * s, y * s, s, s); ctx.fillRect(x * s, (y + i) * s, s, s); ctx.fillRect(x * s, (y - i) * s, s, s); }
    } else {
      const r = 1 + Math.floor(k * 3);
      ctx.fillStyle = P.grey;
      for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r && (i + j) % 2 === 0) ctx.fillRect((x + i) * s, (y + j) * s, s, s);
    }
  }
  ctx.globalAlpha = 1;
}

/** 아이 머리 위 말풍선 (…, !, ♪) */
export function bubble(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, mark: '!' | '…' | '♪'): void {
  const w = 9, h = 9;
  ctx.fillStyle = P.ink; ctx.fillRect((x - 1) * s, (y - 1) * s, (w + 2) * s, (h + 2) * s);
  ctx.fillStyle = mark === '!' ? P.tomato : P.white; ctx.fillRect(x * s, y * s, w * s, h * s);
  ctx.fillStyle = P.ink; ctx.fillRect((x + 3) * s, (y + h + 1) * s, 3 * s, s);
  ctx.fillStyle = mark === '!' ? P.white : P.ink;
  if (mark === '!') { ctx.fillRect((x + 4) * s, (y + 1) * s, s, 5 * s); ctx.fillRect((x + 4) * s, (y + 7) * s, s, s); }
  else if (mark === '…') for (const i of [1, 4, 7]) ctx.fillRect((x + i) * s, (y + 6) * s, s, s);
  else { ctx.fillRect((x + 5) * s, (y + 1) * s, s, 5 * s); ctx.fillRect((x + 6) * s, (y + 1) * s, 2 * s, s); ctx.fillRect((x + 3) * s, (y + 5) * s, 2 * s, 2 * s); }
}
