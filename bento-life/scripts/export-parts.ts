// 아이 캐릭터 부품을 PNG로 뽑는다 (사람이 고칠 원본):  npm run export:parts
//   → art-src/pixel-parts/<키>.png  (1배 크기, 투명 배경, 외곽선 없음)
//   → art-src/pixel-parts/_preview/<키>.png  (8배 미리보기)
// 고친 파일을 src/assets/pixel/parts/ 에 같은 이름으로 넣으면 게임이 그걸 쓴다.
import { mkdirSync, writeFileSync } from 'node:fs';
import { childLayers, partKey, type Gender, type PxAge, type View } from '../src/pixel/child.ts';
import { gridToPng } from './png.ts';

const dir = new URL('../art-src/pixel-parts/', import.meta.url);
const prev = new URL('_preview/', dir);
mkdirSync(prev, { recursive: true });
let n = 0;
for (const view of ['front', 'side'] as View[]) for (const age of [7, 15] as PxAge[]) for (const gender of ['boy', 'girl'] as Gender[]) {
  const look = { age, gender };
  for (const [layer, g] of Object.entries(childLayers(view, look))) {
    const key = partKey(view, look, layer);
    writeFileSync(new URL(`${key}.png`, dir), gridToPng(g));
    writeFileSync(new URL(`${key}.png`, prev), gridToPng(g, 8));
    n++;
  }
}
console.log(`exported ${n} parts → art-src/pixel-parts/`);
