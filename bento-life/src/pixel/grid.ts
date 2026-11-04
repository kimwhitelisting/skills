/**
 * 도트 그림 엔진 — 정해진 칸에 색을 찍는다.
 * 모든 그림(아이·재료·장면)은 이 Grid 위에 코드로 그린다.
 */
export type Color = string | null;

export class Grid {
  readonly px: Color[];
  constructor(readonly w: number, readonly h: number) { this.px = new Array(w * h).fill(null); }

  get(x: number, y: number): Color { return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.px[y * this.w + x]; }
  set(x: number, y: number, c: Color): this {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = c;
    return this;
  }
  rect(x: number, y: number, w: number, h: number, c: Color): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    return this;
  }
  hline(x0: number, x1: number, y: number, c: Color): this { for (let x = x0; x <= x1; x++) this.set(x, y, c); return this; }
  vline(x: number, y0: number, y1: number, c: Color): this { for (let y = y0; y <= y1; y++) this.set(x, y, c); return this; }
  /** 속이 찬 타원 (도트 그림에 맞게 반 칸 보정) */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: Color, only?: (x: number, y: number) => boolean): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / (rx + 0.25), dy = (y + 0.5 - cy) / (ry + 0.25);
        if (dx * dx + dy * dy <= 1 && (!only || only(x, y))) this.set(x, y, c);
      }
    return this;
  }
  /** 문자 그림: '.'은 빈칸, 나머지 글자는 palette에서 색을 찾는다 */
  stamp(rows: string[], x: number, y: number, palette: Record<string, Color>): this {
    rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.' && ch !== ' ') this.set(x + i, y + j, palette[ch] ?? null); }));
    return this;
  }
  /** 바깥 테두리: 빈칸 중 칠해진 칸과 맞닿은 곳을 외곽선 색으로 */
  outline(c: Color): this {
    const add: number[] = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.get(x, y)) continue;
      if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) add.push(y * this.w + x);
    }
    for (const i of add) this.px[i] = c;
    return this;
  }
  /** 다른 그림을 위에 얹기 */
  draw(g: Grid, x: number, y: number, flip = false): this {
    for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) {
      const c = g.get(flip ? g.w - 1 - i : i, j);
      if (c) this.set(x + i, y + j, c);
    }
    return this;
  }
  clone(): Grid { const g = new Grid(this.w, this.h); g.px.splice(0, g.px.length, ...this.px); return g; }
}

/** 캔버스에 찍기 (확대해도 흐려지지 않게) */
export function paint(ctx: CanvasRenderingContext2D, g: Grid, x = 0, y = 0, scale = 1, flip = false): void {
  for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) {
    const c = g.get(flip ? g.w - 1 - i : i, j);
    if (!c) continue;
    ctx.fillStyle = c;
    ctx.fillRect(Math.round((x + i) * scale), Math.round((y + j) * scale), Math.ceil(scale), Math.ceil(scale));
  }
}

/** 그림을 이미지 주소(data URL)로 — DOM <img>나 CSS에 쓰기 */
export function toDataURL(g: Grid, scale = 1): string {
  const c = document.createElement('canvas');
  c.width = g.w * scale; c.height = g.h * scale;
  paint(c.getContext('2d')!, g, 0, 0, scale);
  return c.toDataURL('image/png');
}
