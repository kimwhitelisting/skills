// 필요한 일러스트 목록을 게임 데이터에서 뽑는다 (일러스트레이터 전달용).
//   npm run gen:art  →  docs/art-assets.csv
// 파일을 src/assets/art/<경로>.webp 로 넣으면 게임에 자동 반영된다.
import { existsSync, writeFileSync } from 'node:fs';
import { INGREDIENTS } from '../src/data/ingredients.ts';
import { EVENTS } from '../src/data/events.ts';
import { STAGES } from '../src/game/constants.ts';
import { ENDINGS } from '../src/game/endings.ts';
import { CHILD, ENDING_SCENES, EVENT_SCENES, EXPRESSION, EXTRA_SCENES, NEGATIVE, PARENT_RULE, STAGE_LOOK, STYLE } from './art-prompts.ts';

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

// ───────── AI 지시문 문서 ─────────
const missingScenes = [...EVENTS.filter((e) => !EVENT_SCENES[e.id]).map((e) => `events/${e.id}`), ...ENDINGS.filter((e) => !ENDING_SCENES[e.id]).map((e) => `endings/${e.id}`)];
if (missingScenes.length) throw new Error(`art-prompts.ts에 장면 설명이 없음: ${missingScenes.join(', ')}`);

const full = (scene: string, ratio: string) => `${scene}\n${PARENT_RULE}\n${STYLE}\n${NEGATIVE}\nAspect ratio ${ratio}.`;
const saveTo = (path: string) =>
  path.startsWith('(참조용)') ? '게임에 넣지 않음 — 다른 그림을 만들 때 참조 이미지로 쓰도록 따로 보관'
    : path.startsWith('(스토어)') ? '게임에 넣지 않음 — Play Console 스토어 등록정보에 업로드'
      : `\`src/assets/art/${path}.webp\`${done({ path } as Row) ? ' ✅' : ''}`;
const block = (title: string, path: string, prompt: string) => `### ${title}\n저장: ${saveTo(path)}\n\n\`\`\`\n${prompt}\n\`\`\`\n`;
const portrait = (g: 'boy' | 'girl', stage: string, expr: string) =>
  `Bust portrait of ${CHILD[g]}, ${STAGE_LOOK[stage]}. ${EXPRESSION[expr]}. Centered, head and shoulders, plain cream background.\n${STYLE}\n${NEGATIVE}\nAspect ratio 1:1.`;

const md: string[] = [
  '# AI 그림 지시문 모음',
  '',
  '> `npm run gen:art`로 자동 생성되는 문서예요. 직접 고치지 말고 `scripts/art-prompts.ts`를 고친 뒤 다시 생성하세요.',
  '> 각 상자 안의 영어 지시문을 통째로 복사해서 이미지 AI에 붙여 넣으면 돼요.',
  '',
  '## 진행 순서',
  '1. **스타일 테스트:** 아래 "8살 · 첫 소풍" 1장을 먼저 만들어요. 마음에 드는 결과가 나오면 그 그림을 **스타일 기준 그림**으로 저장해요.',
  '2. **캐릭터 기준 그림:** "캐릭터 기준 시트"를 남녀 각각 만들어요. 같은 아이가 자라는 모습으로 보이는 게 가장 중요해요.',
  '3. **나머지:** 이후 모든 그림에 스타일 기준 그림과 캐릭터 기준 그림을 **참조 이미지로 같이 넣어요.** 대부분의 이미지 AI에 "스타일 참조" 또는 "캐릭터 참조" 기능이 있어요.',
  '4. **저장:** WebP로 바꿔서(예: squoosh.app) 표시된 경로에 넣으면 게임에 자동으로 반영돼요. 초상화는 동그란 틀에 들어가니 크림색 배경 그대로 둬도 괜찮아요. 직접 넣기 어려우면 Claude에게 채팅으로 그림을 보내 변환과 배치를 맡겨도 돼요.',
  '5. **확인:** 결과물이 아트 가이드([ART.md](ART.md))와 맞는지 봐요. 특히 부모 얼굴이 나오지 않는지, 아기 앱처럼 지나치게 귀엽지 않은지요.',
  '6. 상업적 이용이 가능한 요금제인지, 사용하는 AI 도구의 약관을 꼭 확인하세요.',
  '',
  '## 1. 캐릭터 기준 시트 (먼저 만들기)',
  ...(['girl', 'boy'] as const).map((g) => block(`${g === 'girl' ? '여자아이' : '남자아이'} 성장 시트`, `(참조용) ${g}-sheet`,
    `Character reference sheet: the same child shown at six ages in a row, left to right, full body, standing, plain cream background: ${Object.values(STAGE_LOOK).join('; ')}. The child is ${CHILD[g]}; keep the hair, eyes, eyebrows and the mole identical at every age.\n${STYLE}\n${NEGATIVE}\nAspect ratio 3:1.`)),
  '## 2. 아이 초상 — 출시용 기본 표정 12장',
  ...STAGES.flatMap((st) => (['girl', 'boy'] as const).map((g) => block(`${st.name} · ${g === 'girl' ? '여자아이' : '남자아이'}`, `characters/${st.id}-${g}-neutral`, portrait(g, st.id, 'neutral')))),
  '## 3. 나이별 이벤트 20장',
  ...EVENTS.filter((e) => e.kind === 'milestone').map((e) => block(`${e.age}살 · ${e.title}`, `events/${e.id}`, full(EVENT_SCENES[e.id], '4:3'))),
  '## 4. 엔딩 12장',
  ...ENDINGS.map((e) => block(`엔딩 · ${e.title}`, `endings/${e.id}`, full(ENDING_SCENES[e.id], '4:3'))),
  '## 5. 로고 · 스토어',
  ...Object.entries(EXTRA_SCENES).map(([path, v]) => block(path, path, `${v.scene}\n${STYLE}\n${NEGATIVE}\nAspect ratio ${v.ratio}.`)),
  '## 6. 출시 후 보강',
  '### 랜덤 이벤트 16장',
  ...EVENTS.filter((e) => e.kind === 'random').map((e) => block(`${e.ageMin}~${e.ageMax}살 · ${e.title}`, `events/${e.id}`, full(EVENT_SCENES[e.id], '4:3'))),
  '### 표정 36장',
  '위 "아이 초상" 지시문에서 표정 문장만 아래로 바꾸고, 파일 이름 끝의 `neutral`을 표정 이름으로 바꿔 저장해요.',
  '',
  ...Object.entries(EXPRESSION).filter(([k]) => k !== 'neutral').map(([k, v]) => `- \`${k}\`: ${v}`),
  '',
];
writeFileSync(new URL('../docs/ai-prompts.md', import.meta.url), md.join('\n'));

const count = (p: string) => rows.filter((r) => r.priority === p).length;
console.log(`art assets: ${rows.length} (P0 ${count('P0')}, P1 ${count('P1')}), done ${rows.filter(done).length}`);
