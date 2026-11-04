// 도트 그림을 JSON으로 뽑는다 (확대 미리보기 이미지 만들 때 사용):  npx vite-node scripts/dump-pixels.ts <out.json>
import { writeFileSync } from 'node:fs';
import { childFront, childSide, parentSide } from '../src/pixel/child.ts';
import { PX_FOODS, food } from '../src/pixel/foods.ts';
const out: { name: string; w: number; h: number; px: (string | null)[] }[] = [];
const push = (name: string, g: { w: number; h: number; px: (string | null)[] }) => out.push({ name, w: g.w, h: g.h, px: g.px });
for (const age of [7, 15] as const) for (const gender of ['boy', 'girl'] as const) {
  push(`${age}${gender}`, childFront({ age, gender }));
  for (const e of ['happy', 'yuck', 'sad', 'surprise'] as const) push(`${age}${gender}-${e}`, childFront({ age, gender }, e));
  push(`${age}${gender}-blink`, childFront({ age, gender }, 'neutral', { blink: true }));
  for (let f = 0; f < 4; f++) push(`${age}${gender}-walk${f}`, childSide({ age, gender }, f));
}
for (let f = 0; f < 4; f++) push(`parent${f}`, parentSide(f));
for (const id of PX_FOODS) push(`food-${id}`, food(id));
writeFileSync(process.argv[2], JSON.stringify(out));
