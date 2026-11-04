// 아주 작은 PNG 저장기 (외부 라이브러리 없이): RGBA, 압축은 node:zlib
import { deflateSync } from 'node:zlib';
import type { Grid } from '../src/pixel/grid.ts';

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf: Buffer): number { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function rgba(c: string | null): [number, number, number, number] {
  if (!c) return [0, 0, 0, 0];
  const m = c.match(/^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/);
  if (m) return [+m[1], +m[2], +m[3], Math.round(+m[4] * 255)];
  const h = c.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255];
}

/** Grid → PNG 바이트 (scale배 확대 가능) */
export function gridToPng(g: Grid, scale = 1): Buffer {
  const W = g.w * scale, H = g.h * scale;
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 4 + 1)] = 0;
    for (let x = 0; x < W; x++) {
      const [r, gg, b, a] = rgba(g.get(Math.floor(x / scale), Math.floor(y / scale)));
      const o = y * (W * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = gg; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
