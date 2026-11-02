// 모든 재료 조합의 메뉴 테이블을 생성한다.
//   npm run gen:menus
// 출력: src/data/menus.generated.json (게임이 읽음), docs/menus.csv (기획 검토용, 엑셀에서 열기)
import { writeFileSync } from 'node:fs';
import { INGREDIENT_BY_ID } from '../src/data/ingredients.ts';
import { buildMenuTable, comboAgeRange } from '../src/game/menus.ts';

const table = buildMenuTable();
writeFileSync(new URL('../src/data/menus.generated.json', import.meta.url), JSON.stringify(table, null, 0).replace(/},{/g, '},\n{') + '\n');

const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const rows = [['key', '메뉴명', '주식', '메인', '반찬', '가능나이', '시그니처', '설명', '보너스', '플래그'].map(esc).join(',')];
for (const m of table) {
  const [b, mn, s] = [m.base, m.main, m.side].map((id) => INGREDIENT_BY_ID[id]);
  const [min, max] = comboAgeRange(b, mn, s)!;
  rows.push(
    [m.key, m.name, b.name, mn.name, s.name, max >= 99 ? `${min}+` : `${min}-${max}`, m.signature ? 'Y' : '', m.desc,
      m.bonus ? JSON.stringify(m.bonus) : '', m.flags ? JSON.stringify(m.flags) : ''].map(esc).join(','),
  );
}
writeFileSync(new URL('../docs/menus.csv', import.meta.url), '﻿' + rows.join('\n') + '\n');
console.log(`menus: ${table.length} (signatures: ${table.filter((m) => m.signature).length})`);
