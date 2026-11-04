// 도트 그림을 JSON으로 뽑는다 (확대 미리보기 이미지 만들 때 사용):  npx vite-node scripts/dump-pixels.ts <out.json> [set]
import { writeFileSync } from 'node:fs';
import { childFront, childSide, parentSide, OUTFITS, WALK_FRAMES, type HatId } from '../src/pixel/child.ts';
import { PX_FOODS, food } from '../src/pixel/foods.ts';
import type { Grid } from '../src/pixel/grid.ts';

const set = process.argv[3] ?? 'all';
const out: { name: string; w: number; h: number; px: (string | null)[] }[] = [];
const push = (name: string, g: Grid) => out.push({ name, w: g.w, h: g.h, px: g.px });
if (set === 'all' || set === 'kids') for (const age of [7, 15] as const) for (const gender of ['boy', 'girl'] as const) {
  push(`${age}${gender}`, childFront({ age, gender }));
  for (const e of ['happy', 'yuck', 'sad', 'surprise'] as const) push(`${age}${gender}-${e}`, childFront({ age, gender }, e));
}
if (set === 'all' || set === 'walk') {
  for (let f = 0; f < WALK_FRAMES; f++) push(`7girl-walk${f}`, childSide({ age: 7, gender: 'girl' }, f));
  for (let f = 0; f < WALK_FRAMES; f++) push(`15boy-walk${f}`, childSide({ age: 15, gender: 'boy' }, f));
  for (let f = 0; f < WALK_FRAMES; f++) push(`parent${f}`, parentSide(f));
}
if (set === 'all' || set === 'dress') {
  for (const outfit of OUTFITS) push(`outfit-${outfit}`, childFront({ age: 7, gender: 'boy' }, 'neutral', { outfit }));
  for (const hat of ['crown', 'gradcap', 'cap', 'raincap'] as HatId[]) push(`hat-${hat}`, childFront({ age: 15, gender: 'girl' }, 'happy', { hat }));
  for (const tilt of [-14, -7, 7, 14]) push(`tilt${tilt}`, childFront({ age: 7, gender: 'girl' }, 'surprise', { tilt }));
}
if (set === 'all' || set === 'foods') for (const id of PX_FOODS) push(`food-${id}`, food(id));
writeFileSync(process.argv[2], JSON.stringify(out));
console.log(`${out.length} sprites`);
