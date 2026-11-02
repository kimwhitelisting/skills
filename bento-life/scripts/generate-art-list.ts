// 필요한 일러스트 목록을 게임 데이터에서 뽑는다 (일러스트레이터 전달용).
//   npm run gen:art  →  docs/art-assets.csv
// 파일을 src/assets/art/<경로>.webp 로 넣으면 게임에 자동 반영된다.
import { existsSync, writeFileSync } from 'node:fs';
import { INGREDIENTS } from '../src/data/ingredients.ts';
import { EVENTS } from '../src/data/events.ts';
import { STAGES } from '../src/game/constants.ts';
import { ENDINGS } from '../src/game/endings.ts';

type Row = { priority: string; path: string; size: string; title: string; brief: string };
const rows: Row[] = [];
const EXPR = { neutral: '기본 표정', happy: '맛있어서 신남', sad: '시무룩/속상', yuck: '싫은 음식에 질색' } as const;
const STAGE_BRIEF: Record<string, string> = {
  infant: '돌 전후 아기',
  toddler: '어린이집 다니는 유아',
  child: '초등학생, 책가방 끈이 보이게',
  teen: '중학생, 교복',
  high: '고등학생, 교복, 살짝 피곤한 눈',
  adult: '스무 살, 사복',
};

for (const st of STAGES)
  for (const g of ['boy', 'girl'] as const)
    for (const [e, desc] of Object.entries(EXPR))
      rows.push({
        priority: e === 'neutral' ? 'P0' : 'P1',
        path: `characters/${st.id}-${g}-${e}`,
        size: '512×512 투명배경, 가슴 위 초상',
        title: `${st.name} ${g === 'boy' ? '남자아이' : '여자아이'} · ${desc}`,
        brief: STAGE_BRIEF[st.id],
      });

for (const i of INGREDIENTS)
  rows.push({ priority: 'P0', path: `ingredients/${i.id}`, size: '256×256 투명배경', title: i.name, brief: `${i.slot === 'base' ? '주식' : i.slot === 'main' ? '메인 반찬' : '곁들이 반찬'} · 40px로 줄여도 알아볼 수 있게` });

for (const e of EVENTS) {
  const text = typeof e.text === 'string' ? e.text.replace(/\{c\}/g, '아이').replace(/\n/g, ' ') : '(상황에 따라 문구가 바뀜 — 제목 기준으로)';
  const when = e.age !== undefined ? `${e.age}살` : `${e.ageMin}~${e.ageMax}살 중 랜덤`;
  rows.push({
    priority: e.kind === 'milestone' ? 'P0' : 'P1',
    path: `events/${e.id}`,
    size: '1200×900 (4:3)',
    title: `${when} · ${e.title}`,
    brief: text,
  });
}

for (const e of ENDINGS)
  rows.push({ priority: 'P0', path: `endings/${e.id}`, size: '1200×900 (4:3)', title: `엔딩 · ${e.title}`, brief: e.text });

rows.push({ priority: 'P0', path: 'ui/logo', size: '512×512 투명배경', title: '타이틀 로고 그림', brief: '도시락통 + 작은 손. 글자 없이' });
rows.push({ priority: 'P0', path: '(스토어) icon', size: '512×512 PNG, 32bit', title: '앱 아이콘', brief: 'Google Play 필수. 게임 안에는 안 들어감' });
rows.push({ priority: 'P0', path: '(스토어) feature-graphic', size: '1024×500 JPG/PNG', title: '스토어 대표 이미지', brief: 'Google Play 필수' });

const done = (r: Row) => ['webp', 'png', 'jpg', 'svg'].some((ext) => existsSync(new URL(`../src/assets/art/${r.path}.${ext}`, import.meta.url)));
const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
const csv = [['우선순위', '파일 경로 (src/assets/art/ 아래, 확장자 .webp)', '규격', '내용', '설명', '완료'].map(esc).join(',')]
  .concat(rows.map((r) => [r.priority, r.path, r.size, r.title, r.brief, done(r) ? 'O' : ''].map(esc).join(',')));
writeFileSync(new URL('../docs/art-assets.csv', import.meta.url), '﻿' + csv.join('\n') + '\n');

const count = (p: string) => rows.filter((r) => r.priority === p).length;
console.log(`art assets: ${rows.length} (P0 ${count('P0')}, P1 ${count('P1')}), done ${rows.filter(done).length}`);
