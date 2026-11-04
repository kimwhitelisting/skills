// 이벤트 장면 확인용 시트: npx vite-node scripts/sheet-events.ts <out.png> [나이] [성별]
import { writeFileSync } from 'node:fs';
import { EVENTS } from '../src/data/events.ts';
import { pxAgeOf } from '../src/pixel/child.ts';
import { EV_H, EV_W, eventScene } from '../src/pixel/event-scenes.ts';
import { Grid } from '../src/pixel/grid.ts';
import { gridToPng } from './png.ts';

const fixed = process.argv[3] ? Number(process.argv[3]) : undefined;
const gender = (process.argv[4] ?? 'girl') as 'girl' | 'boy';
const cols = 4;
const rows = Math.ceil(EVENTS.length / cols);
const sheet = new Grid(cols * (EV_W + 4) + 4, rows * (EV_H + 4) + 4);
sheet.px.fill('#3b2a24');
EVENTS.forEach((e, i) => {
  const age = fixed ?? e.age ?? Math.round(((e.ageMin ?? 0) + (e.ageMax ?? 19)) / 2);
  sheet.draw(eventScene(e.id, { age: pxAgeOf(age), gender }), 4 + (i % cols) * (EV_W + 4), 4 + Math.floor(i / cols) * (EV_H + 4));
});
writeFileSync(process.argv[2], gridToPng(sheet, 2));
