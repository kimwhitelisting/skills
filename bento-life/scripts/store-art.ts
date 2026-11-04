// Play 스토어 그래픽: 아이콘 512×512, 그래픽 이미지 1024×500 → art-src/store/   (npm run store:art)
import { mkdirSync, writeFileSync } from 'node:fs';
import { childFront } from '../src/pixel/child.ts';
import { photoScene } from '../src/pixel/event-scenes.ts';
import { Grid } from '../src/pixel/grid.ts';
import { P } from '../src/pixel/palette.ts';
import { gridToPng } from './png.ts';

const out = new URL('../art-src/store/', import.meta.url);
mkdirSync(out, { recursive: true });
const BG = '#f6e7cf';

// 아이콘: 64칸 × 8 = 512 (안드로이드 적응형 아이콘과 같은 그림)
const kid = childFront({ age: 7, gender: 'girl' }, 'happy', { plain: true });
const icon = new Grid(64, 64).rect(0, 0, 64, 64, BG);
icon.draw(new Grid(24, 18).draw(kid, 0, -9), 20, 18);
const lid = new Grid(44, 22).rect(0, 3, 44, 19, P.tomato);
for (let i = -22; i < 44; i += 3) for (let j = 0; j < 19; j++) lid.set(i + j, 3 + j, P.tomatoDark);
lid.rect(18, 4, 8, 5, P.mustard).set(16, 2, P.mustard).set(15, 1, P.mustard).set(27, 2, P.mustard).set(28, 1, P.mustard).rect(21, 6, 2, 2, P.mustardDark);
icon.draw(lid.outline(P.ink), 10, 34);
writeFileSync(new URL('icon-512.png', out), gridToPng(icon, 8));

// 그래픽 이미지: 256×125 × 4 = 1024×500 — 폴라로이드 두 장 (등굣길 · 부엌) 사이에 하트
const fg = new Grid(256, 125).rect(0, 0, 256, 125, BG);
for (let y = 0; y < 125; y += 8) for (let x = (y / 8) % 2 ? 2 : 6; x < 256; x += 8) fg.set(x, y, '#ead6b8');
const polaroid = (g: Grid) => new Grid(g.w + 8, g.h + 16).rect(0, 0, g.w + 8, g.h + 16, '#fffdf8').draw(g, 4, 4).outline(P.ink);
fg.draw(polaroid(photoScene('c-nearmiss', { age: 7, gender: 'girl' })), 6, 18);
fg.draw(polaroid(photoScene('d-7', { age: 7, gender: 'boy' })), 132, 18);
fg.stamp(['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'], 125, 56, { r: P.red });
writeFileSync(new URL('feature-1024x500.png', out), gridToPng(fg, 4));
console.log('art-src/store/ icon-512.png, feature-1024x500.png');
