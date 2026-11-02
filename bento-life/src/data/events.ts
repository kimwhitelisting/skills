import { TALENT_INFO } from '../game/constants.ts';
import { getMenu } from '../game/bento.ts';
import { rand } from '../game/rng.ts';
import type { GameEvent, GameState } from '../game/types.ts';

/** 최근 도시락 (끼니 수 설정에 따라 점심이 없을 수 있으니 가장 최근 메뉴로 대신) */
const lunchMenu = (s: GameState) => { const k = s.lastMeals.lunch ?? s.lastMenu; return k ? getMenu(k) : undefined; };
const revealTalent = (s: GameState) => { s.child.known.talent = true; };
/** 재능이 예술/요리면 엔딩용 플래그를 쌓는다 */
const talentFlags = (s: GameState, n: number): Record<string, number> =>
  s.child.talent === 'art' ? { art: n } : s.child.talent === 'cook' ? { cook: n } : {};

// ─────────────────────────── 나이별 고정 이벤트 ───────────────────────────
const MILESTONES: GameEvent[] = [
  {
    id: 'birth', kind: 'milestone', age: 0, emoji: '🎉', title: '응애! 아이가 태어났다',
    text: (s) => `축하합니다, 건강한 ${s.child.gender === 'boy' ? '아들' : '딸'}이에요!\n작은 손이 손가락을 꼭 쥔다. 이름을 지어 주자.`,
    choices: (s) => s.child.nameOptions.map((n) => ({
      label: n,
      outcome: { text: `오늘부터 너는 ${n}. 앞으로 도시락은 걱정 마.`, apply: (st: GameState) => { st.child.name = n; } },
    })),
  },
  {
    id: 'doljabi', kind: 'milestone', age: 1, emoji: '🎂', title: '돌잡이',
    text: '첫 생일상 앞에 물건들이 놓였다. 슬쩍… 하나를 아이 손 가까이 밀어 둘 수 있다.',
    choices: [
      { label: '✏️ 연필', outcome: { text: '연필을 덥석! "공부 잘하겠네~"', stats: { smarts: 5 } } },
      { label: '⚽ 공', outcome: { text: '공을 굴리며 깔깔 웃는다.', stats: { fitness: 5 } } },
      { label: '🎤 마이크', outcome: { text: '마이크를 들고 옹알옹알 연설 중.', stats: { social: 5 } } },
      { label: '🖌️ 붓', outcome: { text: '붓으로 상 위에 낙서를 시작했다.', stats: { happy: 3 }, flags: { art: 1 } } },
      { label: '🥄 숟가락', outcome: { text: '숟가락을 쥐더니 밥상을 두드린다. 먹을 복이 있겠다!', stats: { health: 3 }, flags: { cook: 1 } } },
    ],
  },
  {
    id: 'firstword', kind: 'milestone', age: 2, emoji: '🗣️', title: '첫 마디',
    text: (s) => `{c}가 처음으로 또렷하게 말을 했다.\n"${s.stats.bond >= 60 ? '엄…마? 아…빠?' : '맘마!'}"`,
    choices: (s) => [{
      label: s.stats.bond >= 60 ? '눈물이 핑 돈다' : '역시 밥이 최고지',
      outcome: s.stats.bond >= 60 ? { text: '녹음 버튼을 못 누른 게 평생의 한.', stats: { bond: 3 } } : { text: '도시락 덕분인가 보다.', stats: { happy: 3 } },
    }],
  },
  {
    id: 'daycare', kind: 'milestone', age: 3, emoji: '🏫', title: '어린이집 첫 등원',
    text: '{c}가 문 앞에서 다리에 매달려 운다. 선생님이 "어머님/아버님, 금방 그쳐요~" 하신다.',
    choices: [
      { label: '단호하게 손 흔들고 돌아서기', outcome: { text: '돌아서는 등 뒤로 울음소리가… 10분 뒤 그쳤다고 한다.', stats: { indep: 5, bond: -2 } } },
      { label: '창문 너머로 하루 종일 지켜보기', requires: { followMin: 1 }, outcome: { text: '선생님과 눈이 세 번 마주쳤다.', stats: { bond: 3, indep: -2 } } },
      { label: '도시락 가방에 쪽지 넣어 두기', outcome: { text: '그림 쪽지를 보고 울음을 뚝 그쳤다.', stats: { bond: 2, happy: 2 } } },
    ],
  },
  {
    id: 'picky', kind: 'milestone', age: 4, emoji: '🥦', title: '편식 전쟁',
    text: (s) => {
      const hidden = s.child.dislikes.find((d) => !s.child.known.dislikes.includes(d));
      if (hidden) s.child.known.dislikes.push(hidden);
      return '{c}가 숟가락을 내던졌다. "이거 싫어!!"\n싫어하는 음식이 확실해졌다. (도감에서 확인)';
    },
    choices: [
      { label: '잘게 다져서 몰래 숨기기', outcome: { text: '완벽 범죄 성공. …라고 생각했다.', stats: { health: 3, happy: -1 } } },
      { label: '같이 요리해 보기', outcome: { text: '자기가 만든 건 먹는다! 주방이 난장판이 됐지만.', stats: { happy: 3, health: 1 }, flags: { cook: 1 } } },
      { label: '그래, 먹지 마', outcome: { text: '평화가 찾아왔다.', stats: { happy: 3, health: -2 } } },
    ],
  },
  {
    id: 'recital', kind: 'milestone', age: 5, emoji: '🎭', title: '유치원 재롱잔치',
    text: '무대 위 {c}. 수십 명의 부모 사이에서 우리 아이를 찾아야 한다.',
    choices: (s) => [
      { label: '맨 앞줄 사수, 4K 촬영', requires: { followMin: 1 }, outcome: { text: s.stats.social >= 30 ? '나를 발견하고 손을 흔들었다! 박수갈채.' : '나를 보고 긴장했는지 얼어붙었다…', stats: s.stats.social >= 30 ? { bond: 3, social: 3 } : { happy: -2, bond: 1 } } },
      { label: '무대 뒤에서 간식 도시락 대기', outcome: { text: '끝나자마자 달려와 안겼다.', stats: { bond: 2, happy: 2 } } },
      { label: '뒷줄에서 조용히 응원', outcome: { text: '혼자서도 끝까지 해냈다.', stats: { indep: 3, social: 2 } } },
    ],
  },
  {
    id: 'hagwon', kind: 'milestone', age: 6, emoji: '📚', title: '선행학습의 유혹',
    text: '옆집 아이는 벌써 구구단을 외운다고 한다. 학원 전단지가 눈에 들어온다.',
    choices: [
      { label: '학원 등록 (💰-10)', requires: { money: 10 }, outcome: { text: '가방이 하나 더 늘었다.', money: -10, stats: { smarts: 6, happy: -3 } } },
      { label: '놀이터에서 실컷 놀게 하기', outcome: { text: '흙투성이로 돌아와 꿀잠.', stats: { fitness: 4, social: 3, happy: 2 } } },
      { label: '매일 밤 같이 책 읽기', outcome: { text: '"한 권만 더!"가 입버릇이 됐다.', stats: { smarts: 3, bond: 3 } } },
    ],
  },
  {
    id: 'school', kind: 'milestone', age: 7, emoji: '🎒', title: '초등학교 입학',
    text: '큰 가방을 멘 뒷모습이 낯설다. 이제부터 진짜 사회생활의 시작.',
    choices: [
      { label: '교문까지만 같이 가기', outcome: { text: '"이제 혼자 갈 수 있어!"', stats: { indep: 3, bond: 1 } } },
      { label: '교실 앞까지 데려다주기', outcome: { text: '반 친구 이름을 몰래 외워 두었다.', stats: { bond: 2, indep: -1 } } },
    ],
  },
  {
    id: 'picnic', kind: 'milestone', age: 8, emoji: '🧺', title: '첫 소풍',
    text: (s) => {
      const m = lunchMenu(s);
      return `드디어 소풍날! 최근 점심 도시락은 「${m?.name ?? '???'}」.\n소풍 도시락은 아이들 사이의 자존심이다.`;
    },
    choices: (s) => {
      const m = lunchMenu(s);
      const great = !!m?.flags?.picnic;
      return [
        {
          label: great ? '자신 있게 그 도시락 그대로!' : '평소 도시락 그대로 보내기',
          outcome: great ? { text: '돗자리 주변이 인산인해. 오늘의 주인공은 {c}!', stats: { social: 8, happy: 5 } } : { text: '친구 김밥을 부러운 눈으로 바라봤다고 한다.', stats: { happy: -2 } },
        },
        { label: '새벽 4시에 일어나 김밥 말기 (💰-6)', requires: { money: 6 }, outcome: { text: '옆구리가 터졌지만 사랑은 꽉 찼다.', money: -6, stats: { social: 4, happy: 4, bond: 2 }, flags: { picnic: 1 } } },
        { label: '나무 뒤에 숨어 따라가기', requires: { followMin: 2 }, outcome: { text: '선생님께 발각되어 같이 보물찾기를 했다. 민망.', stats: { bond: 2, indep: -3, social: -1 } } },
      ];
    },
  },
  {
    id: 'fight', kind: 'milestone', age: 9, emoji: '💢', title: '친구와 싸웠다',
    text: '{c}가 울면서 돌아왔다. 짝꿍이랑 크게 다퉜다고 한다.',
    choices: [
      { label: '담임 선생님께 전화하기', outcome: { text: '해결은 됐지만 {c}는 조금 머쓱해한다.', stats: { bond: 1, indep: -3 } } },
      { label: '스스로 해결하게 두기', outcome: (s) => (s.stats.social >= 35 ? { text: '다음 날 둘이 어깨동무하고 하교했다.', stats: { social: 5, indep: 4 } } : { text: '한동안 혼자 밥을 먹었다고 한다…', stats: { happy: -4, indep: 3 } }) },
      { label: '화해용 도시락 2인분 싸주기 (💰-4)', requires: { money: 4 }, outcome: { text: '"너희 엄마/아빠 도시락 진짜 맛있다!" 둘은 베프가 되었다.', money: -4, stats: { social: 6, happy: 3 } } },
    ],
  },
  {
    id: 'sportsday', kind: 'milestone', age: 10, emoji: '🏃', title: '운동회',
    text: '청군 백군! 이어달리기 마지막 주자가 {c}다.',
    choices: (s) => {
      const win = s.stats.fitness >= 50;
      return [
        { label: '목이 터져라 응원', outcome: win ? { text: '1등으로 결승선 통과! 반 전체가 들썩.', stats: { happy: 5, social: 4 } } : { text: '넘어졌지만 끝까지 달렸다.', stats: { happy: -1, indep: 3, fitness: 2 } } },
        { label: '학부모 계주에 출전', requires: { followMin: 1 }, outcome: { text: '부모 계주에서 대역전. 다음 날 {c}는 학교 스타.', stats: { bond: 4, social: 3 } } },
      ];
    },
  },
  {
    id: 'dream', kind: 'milestone', age: 11, emoji: '🌟', title: '장래희망 발표',
    text: (s) => {
      revealTalent(s);
      const label = TALENT_INFO[s.child.talent].label;
      return `"제 꿈은요…" {c}의 눈이 반짝인다. ${label} 쪽에 재능이 있는 것 같다. (재능 발견!)`;
    },
    choices: (s) => [
      { label: '무조건 응원한다!', outcome: { text: '"진짜? 나 해볼래!"', stats: { [TALENT_INFO[s.child.talent].stat]: 6, happy: 3, bond: 2 }, flags: talentFlags(s, 1) } },
      { label: '"그래도 공부가 먼저야"', outcome: { text: '고개를 끄덕였지만 표정이 어둡다.', stats: { smarts: 4, happy: -4, bond: -2 } } },
    ],
  },
  {
    id: 'puberty', kind: 'milestone', age: 12, emoji: '🚪', title: '방문이 닫혔다',
    text: '"노크 좀 해!" 쾅. 사춘기의 시작을 알리는 소리.',
    choices: [
      { label: '문 앞에 간식 두고 조용히 가기', outcome: { text: '30분 뒤 빈 접시가 문 밖에 나와 있었다.', stats: { bond: 2, indep: 2 } } },
      { label: '문 열고 들어가서 대화 시도', outcome: { text: '대화는 3초 만에 끝났다.', stats: { bond: -4, indep: -1 } } },
      { label: '도시락에 손편지 넣기', outcome: { text: '답장은 없었지만 편지는 버려지지 않았다.', stats: { bond: 3, happy: 1 } } },
    ],
  },
  {
    id: 'middle', kind: 'milestone', age: 13, emoji: '🏫', title: '중학교 입학',
    text: (s) => (s.follow === 2 ? '입학식 날, {c}가 진지하게 말했다. "제발… 오늘은 따라오지 마."' : '교복이 아직 헐렁하다. 금방 맞게 되겠지.'),
    choices: (s) => s.follow === 2
      ? [
        { label: '알겠어… (이번만)', outcome: { text: '{c}의 어깨가 한결 가벼워 보인다.', stats: { indep: 4, bond: 1 } } },
        { label: '변장하고 몰래 간다', outcome: { text: '선글라스는 아무 의미가 없었다. 반 친구들이 다 알아봤다.', stats: { social: -4, bond: -3, indep: -2 } } },
      ]
      : [{ label: '교복 사진 찍기', outcome: { text: '마지못해 브이. 그래도 찍어 줬다.', stats: { bond: 2 } } }],
  },
  {
    id: 'crush', kind: 'milestone', age: 14, emoji: '💌', title: '첫사랑?',
    text: '요즘 {c}가 거울을 오래 본다. 도시락을 "예쁘게" 싸 달라는 주문까지.',
    choices: [
      { label: '모르는 척 해 준다', outcome: { text: '센스 있는 부모 인증.', stats: { indep: 3, bond: 2 } } },
      { label: '하트 모양 도시락 2인분 (💰-4)', requires: { money: 4 }, outcome: { text: '"이거 누구 거야?!" 얼굴이 빨개졌지만 들고 갔다.', money: -4, stats: { happy: 5, social: 3 } } },
      { label: '"누군데? 어느 반이야?"', outcome: { text: '그날부터 대화 금지령.', stats: { bond: -5 } } },
    ],
  },
  {
    id: 'career', kind: 'milestone', age: 15, emoji: '🧭', title: '진로 상담',
    text: (s) => `담임 선생님: "{c}는 ${TALENT_INFO[s.child.talent].label} 쪽 재능이 보여요. 집에서는 어떻게 생각하세요?"`,
    once: true,
    choices: (s) => [
      { label: '재능 쪽으로 밀어 주기 (💰-8)', requires: { money: 8 }, outcome: { text: '학원 대신 레슨을 끊었다.', money: -8, stats: { [TALENT_INFO[s.child.talent].stat]: 8, happy: 3 }, flags: talentFlags(s, 2) } },
      { label: '본인이 정하게 하기', outcome: { text: '"…생각해 볼게." 진지한 얼굴이다.', stats: { indep: 5 } } },
      { label: '안정적인 길을 권하기', outcome: { text: '공부 시간이 늘었다.', stats: { smarts: 5, happy: -3 } } },
    ],
  },
  {
    id: 'highschool', kind: 'milestone', age: 16, emoji: '🌙', title: '야간 자율학습 시작',
    text: '이제 저녁도 학교에서. 하루 세 끼 중 두 끼가 도시락이다. 도시락 가방이 무거워진다.',
    choices: [
      { label: '보온 도시락통 장만 (💰-5)', requires: { money: 5 }, outcome: { text: '밤 9시에도 밥이 따끈하다.', money: -5, stats: { health: 3, bond: 2 } } },
      { label: '"매점에서 사 먹어" 용돈 주기 (💰-5)', requires: { money: 5 }, outcome: { text: '자유를 얻었다. 컵라면도 얻었다.', money: -5, stats: { indep: 3, happy: 2, health: -2 } } },
      { label: '야자 시간에 도시락 배달', requires: { followMin: 2 }, outcome: { text: '경비 아저씨와 친해졌다. {c}는 고개를 숙이고 받아 갔다.', stats: { health: 2, bond: -1, social: -2 } } },
    ],
  },
  {
    id: 'slump', kind: 'milestone', age: 17, emoji: '🌧️', title: '고2 슬럼프',
    text: (s) => (s.stats.happy < 45 ? '{c}가 요즘 밥을 남긴다. 표정도 어둡다.' : '성적이 정체기다. {c}가 한숨을 쉰다.'),
    choices: [
      { label: '좋아하는 메뉴로 도시락 폭격', outcome: (s) => ({ text: s.child.known.likes.length ? '빈 도시락통에 "고마워" 포스트잇이 붙어 왔다.' : '뭘 좋아하는지 몰라서 감으로 쌌다… 반응은 미지근.', stats: s.child.known.likes.length ? { happy: 6, bond: 3 } : { happy: 1 } }) },
      { label: '주말에 둘이 여행 가기 (💰-8)', requires: { money: 8 }, outcome: { text: '오랜만에 많이 웃었다.', money: -8, stats: { happy: 5, bond: 5, smarts: -1 } } },
      { label: '"다들 힘들어. 버텨."', outcome: { text: '문이 다시 닫혔다.', stats: { bond: -3, indep: 2 } } },
    ],
  },
  {
    id: 'exam', kind: 'milestone', age: 18, emoji: '📝', title: '수능 D-day',
    text: (s) => {
      const k = s.lastMeals.breakfast ?? s.lastMenu;
      const m = k ? getMenu(k) : undefined;
      return `새벽 5시. 최근 도시락은 「${m?.name ?? '???'}」였다.\n이제 시험만 남았다.`;
    },
    choices: (s) => {
      const brain = (s.flags.brain ?? 0) > 0;
      const score = s.stats.smarts + (brain ? 10 : 0) + (s.stats.health >= 50 ? 5 : -5) + Math.floor(rand(s) * 15);
      const result = score >= 85 ? { text: '전 과목 1등급!! 교문 앞에서 껴안고 울었다.', stats: { happy: 10, smarts: 3 }, flags: { examTop: 1 } }
        : score >= 60 ? { text: '평소 실력 그대로. 후련한 얼굴이다.', stats: { happy: 4 } }
          : { text: '시험이 끝나고 한참을 말이 없었다. 그래도 끝났다.', stats: { happy: -3, indep: 2 } };
      return [
        { label: '소화 잘 되는 죽 도시락', outcome: { ...result, stats: { ...result.stats, health: 2 } } },
        { label: '평소 먹던 그대로', outcome: { ...result, stats: { ...result.stats, bond: 2 } } },
        { label: '교문 앞에서 끝날 때까지 기다리기', requires: { followMin: 1 }, outcome: { ...result, stats: { ...result.stats, bond: 4 } } },
      ];
    },
  },
  {
    id: 'leaving', kind: 'milestone', age: 19, emoji: '🧳', title: '독립 선언',
    text: '"나 이제 나가서 살아 볼래." {c}가 원룸 계약서를 내밀었다.',
    choices: [
      { label: '등을 두드려 준다', outcome: { text: '"잘 해낼 거야." 진심이었다.', stats: { indep: 8, bond: 2 } } },
      { label: '반찬 택배를 약속한다', outcome: { text: '"…그건 좋아." 웃음이 터졌다.', stats: { indep: 4, bond: 4 } } },
      { label: '"아직 밥도 못 하잖아!" 붙잡는다', outcome: { text: '계약서가 서랍 속으로 들어갔다.', stats: { indep: -10, bond: -2 } } },
    ],
  },
];

// ─────────────────────────── 랜덤 이벤트 ───────────────────────────
const RANDOM: GameEvent[] = [
  {
    id: 'cold', kind: 'random', emoji: '🤒', ageMin: 0, ageMax: 19, weight: 3, title: '감기에 걸렸다',
    when: (s) => s.stats.health < 60,
    text: '{c}의 이마가 뜨끈하다. 콧물이 줄줄.',
    choices: [
      { label: '소아과 오픈런 (💰-3)', requires: { money: 3 }, outcome: { text: '대기 32번. 그래도 금방 나았다.', money: -3, stats: { health: 4 } } },
      { label: '밤새 간호하며 죽 끓이기', outcome: { text: '새벽 3시, 작은 손이 내 손을 잡았다.', stats: { health: 2, bond: 3 } } },
    ],
  },
  {
    id: 'fall', kind: 'random', emoji: '🩹', ageMin: 2, ageMax: 9, weight: 3, title: '꽈당!',
    text: (s) => (s.follow === 2 ? '{c}가 넘어지려는 순간 — 따라다니던 내가 번개처럼 받아냈다!' : '{c}가 놀이터에서 넘어져 무릎이 까졌다.'),
    choices: (s) => s.follow === 2
      ? [{ label: '휴, 다행이다', outcome: { text: '하지만 {c}는 넘어지는 법을 배우지 못했다.', stats: { bond: 2, indep: -2 } } }]
      : [{ label: '"괜찮아, 털고 일어나!"', outcome: { text: '울지 않고 일어났다고 한다. 대견하다.', stats: { health: -2, indep: 3 } } }],
  },
  {
    id: 'lost', kind: 'random', emoji: '😱', ageMin: 3, ageMax: 7, weight: 2, title: '마트에서 사라졌다',
    when: (s) => s.follow === 0,
    text: '잠깐 장바구니를 보는 사이 {c}가 사라졌다! 심장이 멎는 줄 알았다.',
    choices: [{ label: '안내방송을 부탁한다', outcome: { text: '시식 코너에서 만두를 먹고 있었다. 다리가 풀렸다.', stats: { bond: -1, indep: 2, happy: -1 } } }],
  },
  {
    id: 'swap', kind: 'random', emoji: '🔄', ageMin: 7, ageMax: 15, weight: 3, title: '반찬 교환 시장',
    text: '점심시간, 교실에 반찬 교환 시장이 열렸다.',
    choices: (s) => {
      const m = lunchMenu(s);
      const strong = !!m?.signature;
      return [{ label: '오늘 도시락은…?', outcome: strong ? { text: `「${m!.name}」은 시장에서 최고가에 거래됐다!`, stats: { social: 5, happy: 2 } } : { text: '평범한 거래였다. 소시지 하나를 얻어 왔다.', stats: { social: 1 } } }];
    },
  },
  {
    id: 'cat', kind: 'random', emoji: '🐈', ageMin: 5, ageMax: 13, weight: 2, once: true, title: '길고양이',
    text: '{c}가 비에 젖은 아기 고양이를 안고 왔다. "키우면 안 돼?"',
    choices: [
      { label: '가족으로 맞이한다 (💰-6)', requires: { money: 6 }, outcome: { text: '이름은 "도시락". 이제 도시락이 둘이다.', money: -6, stats: { happy: 8, indep: 2 }, flags: { cat: 1 } } },
      { label: '임시 보호처를 같이 찾는다', outcome: { text: '좋은 집으로 보내며 함께 울었다.', stats: { social: 2, bond: 2 } } },
    ],
  },
  {
    id: 'party', kind: 'random', emoji: '🎈', ageMin: 5, ageMax: 12, weight: 2, title: '친구 생일 파티',
    text: '친구 생일 파티 초대장을 받아 왔다.',
    choices: [
      { label: '선물 사서 보내기 (💰-3)', requires: { money: 3 }, outcome: { text: '파티의 인기 손님이 되었다.', money: -3, stats: { social: 4, happy: 2 } } },
      { label: '파티장까지 따라가기', requires: { followMin: 2 }, outcome: { text: '부모님 중 나만 끝까지 있었다…', stats: { social: -2, bond: 1 } } },
      { label: '"다음에 가자"', outcome: { text: '시무룩.', stats: { happy: -2 } } },
    ],
  },
  {
    id: 'game', kind: 'random', emoji: '🎮', ageMin: 11, ageMax: 17, weight: 2, title: '게임에 빠졌다',
    text: '새벽 2시, {c}의 방에서 키보드 소리가 들린다.',
    choices: [
      { label: '와이파이 공유기를 뽑는다', outcome: { text: '전쟁이 시작됐다.', stats: { bond: -4, smarts: 2 } } },
      { label: '같이 한 판 해 본다', outcome: { text: '의외로 잘한다며 놀랐다. 규칙도 같이 정했다.', stats: { bond: 4, happy: 2 } } },
      { label: '스스로 조절하게 둔다', outcome: (s) => (s.stats.indep >= 40 ? { text: '알아서 시간을 정해 지키기 시작했다.', stats: { indep: 4 } } : { text: '다크서클이 턱까지 내려왔다.', stats: { health: -3, smarts: -2 } }) },
    ],
  },
  {
    id: 'teacher', kind: 'random', emoji: '👩‍🏫', ageMin: 7, ageMax: 17, weight: 3, title: '학부모 상담',
    when: (s) => s.follow === 2,
    text: '담임 선생님: "저… 매일 교문 앞에 계시던데요. {c}가 친구들한테 놀림을 좀 받나 봐요."',
    choices: [
      { label: '반성하고 거리를 둔다', outcome: { text: '다음 해부터 조금 멀리서 지켜보기로 했다.', stats: { indep: 2, social: 1 } } },
      { label: '"제 아이는 제가 지킵니다"', outcome: { text: '선생님의 미소가 굳었다.', stats: { social: -3, indep: -2 } } },
    ],
  },
  {
    id: 'caught', kind: 'random', emoji: '🕵️', ageMin: 12, ageMax: 19, weight: 4, title: '미행이 들켰다',
    when: (s) => s.follow === 2,
    text: '학원 앞 편의점에서 도시락을 들고 숨어 있다가 {c}와 눈이 마주쳤다.',
    choices: [
      { label: '"…우연이네?"', outcome: { text: '아무도 믿지 않았다.', stats: { bond: -4, indep: -2, social: -2 } } },
      { label: '솔직하게 사과한다', outcome: { text: '"걱정되는 건 알아. 근데 나도 이제 커." 오랜만에 진지한 대화.', stats: { bond: 1, indep: 3 } } },
    ],
  },
  {
    id: 'helpcook', kind: 'random', emoji: '🍳', ageMin: 6, ageMax: 18, weight: 2, title: '"나도 해 볼래!"',
    text: '도시락을 싸는데 {c}가 앞치마를 두르고 나타났다.',
    choices: [
      { label: '계란말이를 맡긴다', outcome: { text: '모양은 엉망, 맛은 최고.', stats: { happy: 3, indep: 2 }, flags: { cook: 1 } } },
      { label: '"위험해, 저리 가 있어"', outcome: { text: '부엌 문턱에서 서성이다 돌아갔다.', stats: { happy: -1, indep: -1 } } },
    ],
  },
  {
    id: 'contest', kind: 'random', emoji: '🎨', ageMin: 6, ageMax: 16, weight: 2, title: '그림 대회',
    text: '학교에서 그림 대회가 열린다. 주제는 "우리 가족".',
    choices: (s) => [{
      label: '어떤 그림을 그렸을까?',
      outcome: s.stats.bond >= 60
        ? { text: '도시락을 건네는 내 모습이 그려져 있었다. 최우수상!', stats: { happy: 5, bond: 3 }, flags: { art: 1 } }
        : { text: '고양이와 단둘이 있는 그림이었다. 장려상.', stats: { happy: 1 }, flags: { art: 1 } },
    }],
  },
  {
    id: 'growth', kind: 'random', emoji: '📏', ageMin: 10, ageMax: 16, weight: 2, title: '폭풍 성장',
    when: (s) => s.stats.health >= 55,
    text: '바지가 또 짧아졌다. 1년에 10cm라니!',
    choices: [{ label: '도시락 양을 늘린다', outcome: { text: '이제 2단 도시락으로도 모자라다.', stats: { fitness: 4 }, money: -2 } }],
  },
  {
    id: 'sns', kind: 'random', emoji: '📸', ageMin: 14, ageMax: 19, weight: 2, title: '도시락이 SNS에 떴다',
    when: (s) => s.runMenus.length >= 15,
    text: '{c}가 올린 도시락 사진이 "부모님 도시락 레전드"로 퍼지고 있다.',
    choices: [
      { label: '협찬 연락을 받아들인다', outcome: { text: '도시락통 회사에서 협찬이 들어왔다!', money: 10, stats: { social: 3 } } },
      { label: '조용히 넘어간다', outcome: { text: '{c}가 내심 뿌듯해한다.', stats: { bond: 3, social: 2 } } },
    ],
  },
  {
    id: 'returnlunch', kind: 'random', emoji: '🥹', ageMin: 15, ageMax: 19, weight: 3, once: true, title: '처음 받은 도시락',
    when: (s) => s.stats.bond >= 65,
    text: '아침에 식탁 위에 낯선 도시락이 놓여 있다. 쪽지: "오늘은 내가 쌌어."',
    choices: [{ label: '뚜껑을 연다', outcome: { text: '삐뚤빼뚤한 계란말이. 지금까지 먹은 것 중 제일 맛있었다.', stats: { bond: 6, indep: 4, happy: 3 }, flags: { cook: 1 } } }],
  },
  {
    id: 'allowance', kind: 'random', emoji: '💸', ageMin: 8, ageMax: 18, weight: 2, title: '용돈 협상',
    text: '"친구들은 용돈을 더 받는단 말이야!"',
    choices: [
      { label: '인상해 준다 (💰-4)', requires: { money: 4 }, outcome: { text: '협상 성공에 신났다.', money: -4, stats: { happy: 3 } } },
      { label: '용돈 기입장을 쓰게 한다', outcome: { text: '투덜대면서도 쓰기 시작했다.', stats: { indep: 3, smarts: 1 } } },
    ],
  },
  {
    id: 'bonus', kind: 'random', emoji: '🧧', ageMin: 0, ageMax: 19, weight: 1, title: '할머니의 용돈',
    text: '할머니가 "애 맛있는 거 해 먹여라" 하며 봉투를 쥐여 주셨다.',
    choices: [{ label: '감사히 받는다', outcome: { text: '반찬값이 넉넉해졌다.', money: 12 } }],
  },
];

export const EVENTS: GameEvent[] = [...MILESTONES, ...RANDOM];
export const EVENT_BY_ID: Record<string, GameEvent> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
