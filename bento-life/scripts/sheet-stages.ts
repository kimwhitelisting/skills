// 성장 7단계 확인용 시트: npx vite-node scripts/sheet-stages.ts <out.png>
import { writeFileSync } from 'node:fs';
import { childFront, childSide, PX_AGES, EXPRS } from '../src/pixel/child.ts';
import { Grid } from '../src/pixel/grid.ts';
import { gridToPng } from './png.ts';

const cols = PX_AGES.length;
const sheet = new Grid(cols * 28 + 4, 4 * 44 + 4);
sheet.px.fill('#fbf2df');
PX_AGES.forEach((age, i) => {
  (['girl', 'boy'] as const).forEach((gender, j) => {
    sheet.draw(childFront({ age, gender }, EXPRS[(i + j) % EXPRS.length]), 2 + i * 28, 2 + j * 44);
    sheet.draw(childSide({ age, gender }, i), 2 + i * 28, 2 + (j + 2) * 44);
  });
});
writeFileSync(process.argv[2], gridToPng(sheet, 5));
