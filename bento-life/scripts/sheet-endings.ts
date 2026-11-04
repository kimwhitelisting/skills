// 엔딩 장면 확인용 시트: npx vite-node scripts/sheet-endings.ts <out.png> [성별]
import { writeFileSync } from 'node:fs';
import { ENDINGS } from '../src/game/endings.ts';
import { pxAgeOf } from '../src/pixel/child.ts';
import { EV_H, EV_W, endingScene } from '../src/pixel/event-scenes.ts';
import { Grid } from '../src/pixel/grid.ts';
import { gridToPng } from './png.ts';

const gender = (process.argv[3] ?? 'girl') as 'girl' | 'boy';
const cols = 5;
const sheet = new Grid(cols * (EV_W + 4) + 4, Math.ceil(ENDINGS.length / cols) * (EV_H + 4) + 4);
sheet.px.fill('#3b2a24');
ENDINGS.forEach((e, i) => sheet.draw(endingScene(e.id, e.tone, { age: pxAgeOf(e.early ? e.early.min + 1 : 19), gender }), 4 + (i % cols) * (EV_W + 4), 4 + Math.floor(i / cols) * (EV_H + 4)));
writeFileSync(process.argv[2], gridToPng(sheet, 2));
