// Grid → 캔버스 캐시 (같은 그림은 한 번만 그린다)
import { paint, type Grid } from './grid.ts';

const cache = new Map<string, HTMLCanvasElement>();
export function sprite(key: string, make: () => Grid): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) {
    const g = make();
    c = document.createElement('canvas');
    c.width = g.w; c.height = g.h;
    paint(c.getContext('2d')!, g);
    cache.set(key, c);
  }
  return c;
}
export const clearSprites = () => cache.clear();
export function blit(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, x: number, y: number, alpha = 1): void {
  ctx.globalAlpha = alpha;
  ctx.drawImage(c, Math.round(x), Math.round(y));
  ctx.globalAlpha = 1;
}
