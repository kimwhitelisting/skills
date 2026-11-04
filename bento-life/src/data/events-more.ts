// 랜덤 이벤트 2탄 — 삐딱한 일, 갈림길, 이어지는 이야기.
// 플래그는 엔딩으로 이어진다 (src/game/endings.ts): rebel 반항 · lie 거짓말 · runaway 가출 · debt 빚 · coinWin
// tuber 유튜브 · band 밴드 · gamer 게임 · couple 연애 · idol/idolDebut/idolFail 연습생 · abroad 유학 · scout 체고 · skip 월반
import { rand } from '../game/rng.ts';
import type { Choice, GameEvent, GameState, Outcome } from '../game/types.ts';

const f = (s: GameState, k: string) => s.flags[k] ?? 0;

export const MORE_EVENTS: GameEvent[] = [
  // ───────── 사춘기의 삐딱함 ─────────
  {
    id: 'dye', kind: 'random', emoji: '💇', ageMin: 14, ageMax: 18, weight: 2, once: true, title: '형광 분홍 머리',
    text: '{c}가 머리를 형광 분홍으로 물들이고 들어왔다. "어때?"',
    choices: [
      { label: '"오, 잘 어울리는데?"', outcome: { text: '의외라는 듯 눈이 커졌다. 그날 저녁, 설거지를 자진해서 했다.', stats: { happy: 4, bond: 3, indep: 2 }, flags: { rebel: 1 } } },
      { label: '"당장 검은색으로 돌려!"', outcome: { text: '다음 날 머리는 초록색이 됐다.', stats: { bond: -4, happy: -2 }, flags: { rebel: 2 } } },
      { label: '"나도 해 볼까?" (💰-3)', requires: { money: 3 }, outcome: { text: '둘이 나란히 분홍 머리. 동네 명물이 됐다.', money: -3, stats: { bond: 5, happy: 4, social: -1 } } },
    ],
  },
  {
    id: 'smoke', kind: 'random', emoji: '🚬', ageMin: 15, ageMax: 19, weight: 2, title: '교복에서 나는 냄새',
    when: (s) => s.stats.happy < 55 || s.stats.bond < 45,
    text: '빨래를 개다가 멈췄다. {c}의 교복에서 담배 냄새가 난다.',
    choices: [
      { label: '모른 척 넘어간다', outcome: { text: '냄새는 점점 진해졌다.', stats: { health: -3 }, flags: { rebel: 1 } } },
      { label: '정면으로 묻는다', outcome: (s): Outcome => (s.stats.bond >= 50
        ? { text: '한참 말이 없더니 고개를 숙였다. "…끊을게."', stats: { health: 2, bond: 1 } }
        : { text: '"내 방 뒤졌어?" 문이 쾅. 그날 밤 들어오지 않았다.', stats: { bond: -5 }, flags: { rebel: 1, runaway: 1 } }) },
      { label: '저녁 먹고 같이 걷자고 한다', outcome: { text: '말없이 한 시간을 걸었다. 돌아오는 길에 {c}가 먼저 말을 꺼냈다.', stats: { bond: 3, health: 1, happy: 1 } } },
    ],
  },
  {
    id: 'cheat', kind: 'random', emoji: '📄', ageMin: 13, ageMax: 18, weight: 2, once: true, title: '커닝 페이퍼',
    when: (s) => s.stats.smarts < 50,
    text: '학교에서 전화가 왔다. {c}가 시험 중에 커닝을 하다 걸렸다고 한다.',
    choices: [
      { label: '크게 혼낸다', outcome: { text: '"다들 하는데 나만 걸린 거야!"', stats: { bond: -3, smarts: 1 }, flags: { lie: 1 } } },
      { label: '이유부터 묻는다', outcome: { text: '"…성적 떨어지면 실망할까 봐." 생각보다 무거운 대답이었다.', stats: { bond: 3, happy: 1, smarts: 1 } } },
      { label: '"공부보다 중요한 게 있지~"', outcome: { text: '혼날 줄 알았던 {c}가 어리둥절해한다. 반성은… 글쎄.', stats: { happy: 2 }, flags: { lie: 1 } } },
    ],
  },
  {
    id: 'reportcard', kind: 'random', emoji: '🔢', ageMin: 10, ageMax: 16, weight: 2, title: '번진 성적표',
    when: (s) => s.stats.smarts < 45,
    text: '성적표 숫자가 묘하게 번져 있다. 아무리 봐도 3이 8이 됐다.',
    choices: [
      { label: '모른 척 칭찬한다', outcome: { text: '"…응, 열심히 했어." 눈을 피했다.', stats: { happy: 2 }, flags: { lie: 1 } } },
      { label: '같이 공부 계획을 짠다', outcome: { text: '투덜대며 따라온다. 다음 성적표는 번지지 않았다.', stats: { smarts: 4, bond: 1, happy: -1 } } },
      { label: '용돈을 끊는다', outcome: { text: '다음 성적표는 더 정교하게 번져 있었다.', stats: { bond: -3 }, flags: { lie: 1, rebel: 1 } } },
    ],
  },
  {
    id: 'runaway_try', kind: 'random', emoji: '🌃', ageMin: 13, ageMax: 18, weight: 3, title: '밤 11시, 빈 방',
    when: (s) => s.stats.bond < 35,
    text: '밤 11시. {c}가 집에 들어오지 않았다. 휴대폰도 꺼져 있다.',
    choices: [
      { label: '도시락 들고 친구 집을 돌아다닌다', outcome: { text: '세 번째 집에서 찾았다. 도시락은 친구들이 다 먹었다. {c}는 말없이 따라왔다.', stats: { bond: 3, indep: -2 } } },
      { label: '거실 불을 켜 두고 기다린다', outcome: (s): Outcome => (s.stats.bond >= 22
        ? { text: '새벽 2시, 현관문이 조용히 열렸다. 식탁 위 밥을 먹고 들어갔다.', stats: { bond: 2, indep: 2 } }
        : { text: '아침이 되어서야 돌아왔다. 아무 말도 하지 않았다.', stats: { bond: -2 }, flags: { runaway: 1 } }) },
      { label: '경찰에 신고한다', outcome: { text: 'PC방에서 경찰차를 타고 돌아왔다. 동네에 소문이 다 났다.', stats: { bond: -4, social: -3, indep: -2 }, flags: { runaway: 1 } } },
    ],
  },
  {
    id: 'thrown', kind: 'random', emoji: '🗑️', ageMin: 13, ageMax: 18, weight: 2, once: true, title: '쓰레기통 속 도시락',
    when: (s) => s.stats.bond < 45,
    text: '음식물 쓰레기통에서 오늘 아침 싼 도시락이 그대로 나왔다.',
    choices: [
      { label: '왜 그랬는지 조용히 묻는다', outcome: (s): Outcome => (s.stats.bond >= 30
        ? { text: '"…친구들이 도시락 싸 오는 애는 나밖에 없대." 내일부터는 김밥으로 싸기로 했다.', stats: { bond: 3, social: 2 } }
        : { text: '"그냥 먹기 싫었어." 그게 전부였다.', stats: { bond: -1, happy: -1 } }) },
      { label: '내일부터 안 싼다', outcome: { text: '매점 빵과 컵라면의 나날. 처음엔 신나 하더니 한 달 뒤 슬쩍 물었다. "…내일 도시락 있어?"', stats: { indep: 4, health: -3, bond: -2 } } },
      { label: '더 맛있게 싸 준다', outcome: { text: '다음 날 도시락은 비어서 돌아왔다. 누가 먹었는지는 묻지 않기로 했다.', stats: { bond: 1, happy: 1 } } },
    ],
  },
  {
    id: 'bullied', kind: 'random', emoji: '🥀', ageMin: 9, ageMax: 15, weight: 2, once: true, title: '혼자 먹는 점심',
    when: (s) => s.stats.social < 35,
    text: '{c}가 요즘 점심을 혼자 먹는다고 한다. 도시락은 늘 반쯤 남아서 온다.',
    choices: [
      { label: '학교에 찾아간다', requires: { followMin: 1 }, outcome: { text: '선생님이 자리를 바꿔 주셨다. {c}는 조금 창피해했지만 안도했다.', stats: { social: 3, bond: 2, indep: -2 } } },
      { label: '친구 몫까지 도시락 2인분 (💰-4)', requires: { money: 4 }, outcome: { text: '"너 반찬 맛있다" 한마디에 자리가 하나 늘었다.', money: -4, stats: { social: 6, happy: 3 } } },
      { label: '저녁마다 이야기를 들어 준다', outcome: { text: '해결되진 않았지만, 집에서는 웃기 시작했다.', stats: { happy: 3, bond: 3 } } },
    ],
  },
  {
    id: 'bully', kind: 'random', emoji: '😈', ageMin: 11, ageMax: 16, weight: 2, once: true, title: '담임 선생님의 전화',
    when: (s) => s.stats.social >= 50 && s.stats.bond < 45,
    text: '"어머님/아버님, {c}가 친구를 괴롭히는 무리에 있었습니다."',
    choices: [
      { label: '같이 사과하러 간다', outcome: { text: '그 집 문 앞에서 {c}가 먼저 고개를 숙였다.', stats: { bond: 2, social: -2, indep: 2 } } },
      { label: '"우리 애가 그럴 리 없어요"', outcome: { text: '{c}는 그날 웃었다. 그 웃음이 조금 무서웠다.', stats: { social: 2 }, flags: { lie: 1, rebel: 1 } } },
      { label: '휴대폰을 압수한다', outcome: { text: '"내가 뭘 했는데!" 이유는 끝내 말하지 않았다.', stats: { bond: -4 }, flags: { rebel: 1 } } },
    ],
  },
  {
    id: 'lie', kind: 'random', emoji: '🙊', ageMin: 8, ageMax: 13, weight: 2, title: '학원 간다더니',
    text: '학원에 간다던 {c}가 PC방 창가 자리에 앉아 있다.',
    choices: [
      { label: '들어가서 혼낸다', outcome: { text: '친구들 앞에서 끌려 나왔다. 학원은 다시 다니지만 눈빛이 달라졌다.', stats: { bond: -3, smarts: 1, social: -1 } } },
      { label: '들어가서 옆자리에 앉는다', outcome: { text: '"…한 판만 하고 가자." 규칙은 같이 정했다.', stats: { bond: 3, happy: 2 }, flags: { gamer: 1 } } },
      { label: '못 본 척 지나간다', outcome: { text: '저녁에 물었다. "학원 어땠어?" "재밌었어." …그렇구나.', stats: { indep: 1 }, flags: { lie: 1 } } },
    ],
  },

  // ───────── 갈림길 (조기 엔딩으로 이어질 수 있다) ─────────
  {
    id: 'casting', kind: 'random', emoji: '📇', ageMin: 12, ageMax: 15, weight: 2, once: true, title: '길거리 캐스팅',
    when: (s) => s.stats.social >= 48,
    text: '{c}가 명함을 받아 왔다. 「○○엔터테인먼트 — 연습생 오디션 제안」',
    choices: [
      { label: '레슨비를 대 준다 (💰-6)', requires: { money: 6 }, outcome: { text: '그날부터 거실이 연습실이 됐다.', money: -6, stats: { social: 3, happy: 4, smarts: -3 }, flags: { idol: 1 } } },
      { label: '"공부해야지"', outcome: { text: '명함은 책상 서랍 깊숙이 들어갔다. 가끔 꺼내 보는 것 같다.', stats: { happy: -4, smarts: 2 } } },
      { label: '본인이 정하게 한다', outcome: (s): Outcome => (s.stats.indep >= 40
        ? { text: '"해 볼래. 대신 공부도 할게." 계약서를 꼼꼼히 읽는 모습이 낯설다.', stats: { indep: 3, social: 2 }, flags: { idol: 1 } }
        : { text: '"…모르겠어. 엄마아빠가 정해 줘." 결국 흐지부지됐다.', stats: { indep: -1 } }) },
    ],
  },
  {
    id: 'debut_eval', kind: 'random', emoji: '🪩', ageMin: 14, ageMax: 18, weight: 6, once: true, title: '연습생 월말 평가',
    when: (s) => f(s, 'idol') >= 1,
    text: '오늘은 데뷔조가 정해지는 월말 평가 날이다. {c}의 손이 차갑다.',
    choices: (s): Choice[] => {
      const ok = s.stats.social + s.stats.happy + s.stats.fitness / 2 + rand(s) * 30 >= 140;
      return [
        { label: '응원 도시락을 싸서 보낸다', outcome: ok ? <Outcome>{ text: '데뷔조 명단에 {c}의 이름이 있었다!', stats: { happy: 8 }, flags: { idolDebut: 1 } } : { text: '명단에 이름이 없었다. 연습실 앞에서 같이 도시락을 먹었다.', stats: { happy: -4, bond: 3 }, flags: { idolFail: 1 } } },
        { label: '연습실 앞에서 끝까지 기다린다', requires: { followMin: 1 }, outcome: ok ? <Outcome>{ text: '문이 열리자마자 {c}가 뛰어나와 안겼다. "됐어!!"', stats: { happy: 8, bond: 3 }, flags: { idolDebut: 1 } } : { text: '"…오지 말라니까." 눈이 빨갰다.', stats: { happy: -4, bond: -1 }, flags: { idolFail: 1 } } },
        { label: '"이제 그만하고 공부하자"', outcome: { text: '평가는 보지 않았다. 그날 밤 연습복을 버리는 소리가 들렸다.', stats: { happy: -6, bond: -4, smarts: 3 }, flags: { idolFail: 1 } } },
      ];
    },
  },
  {
    id: 'abroad_offer', kind: 'random', emoji: '🛫', ageMin: 13, ageMax: 16, weight: 2, once: true, title: '유학 상담',
    when: (s) => s.stats.smarts >= 62,
    text: '유학원 상담사: "{c} 성적이면 미국 기숙학교도 충분해요. 비용은… 좀 듭니다."',
    choices: [
      { label: '보낸다 (💰-25)', requires: { money: 25 }, outcome: { text: '여권 사진 속 {c}가 어색하게 웃는다. 출국은 한 달 뒤.', money: -25, stats: { smarts: 3, indep: 4 }, flags: { abroad: 1 } } },
      { label: '대학 가서 교환학생으로', outcome: { text: '"그때 꼭 보내 줘." 약속했다.', stats: { smarts: 2, bond: 1 } } },
      { label: '"옆에 있어 줘"', outcome: { text: '{c}는 남았다. 가끔 그 팸플릿을 꺼내 본다.', stats: { bond: 2, indep: -3, happy: -1 } } },
    ],
  },
  {
    id: 'scout', kind: 'random', emoji: '🏟️', ageMin: 13, ageMax: 16, weight: 2, once: true, title: '체육고 스카우트',
    when: (s) => s.stats.fitness >= 65,
    text: '체육 선생님 소개로 체육고 감독님이 찾아왔다. "기숙사 생활을 해야 합니다."',
    choices: [
      { label: '보낸다', outcome: { text: '짐 가방에 보온 도시락통을 넣었다.', stats: { fitness: 5, indep: 4, bond: -1 }, flags: { scout: 1 } } },
      { label: '"공부도 해야지"', outcome: { text: '동네 클럽에서 계속 뛰기로 했다.', stats: { fitness: 2, smarts: 2, happy: -2 } } },
    ],
  },
  {
    id: 'genius', kind: 'random', emoji: '🧠', ageMin: 9, ageMax: 14, weight: 3, once: true, title: '월반 제안',
    when: (s) => s.stats.smarts >= 78,
    text: '교장 선생님: "{c}는 지금 교실이 너무 쉬워요. 월반을 권합니다."',
    choices: [
      { label: '월반시킨다', outcome: { text: '형, 누나들 사이에서 도시락을 먹는다. 반찬 뺏기는 일이 늘었다.', stats: { smarts: 5, social: -4, happy: -1 }, flags: { skip: 1 } } },
      { label: '또래와 함께 크게 한다', outcome: { text: '반에서 제일 웃긴 애가 됐다. 공부는 집에서 더 한다.', stats: { social: 3, happy: 2 } } },
    ],
  },

  // ───────── 취미·꿈 ─────────
  {
    id: 'youtube', kind: 'random', emoji: '📹', ageMin: 11, ageMax: 18, weight: 2, title: '유튜브 채널 개설',
    text: (s) => (f(s, 'tuber') ? '{c}의 채널 구독자가 늘고 있다. "이번엔 도시락 싸는 과정 찍어도 돼?"' : '{c}가 유튜브 채널을 만들었다. 첫 영상 제목: 「오늘의 부모 도시락 평가」'),
    choices: [
      { label: '출연해 준다', outcome: { text: '조회수 1위 영상: 「뚜껑 닫다가 손 낀 부모」.', stats: { bond: 3, social: 2 }, flags: { tuber: 1 } } },
      { label: '장비를 사 준다 (💰-5)', requires: { money: 5 }, outcome: { text: '조명이 생겼다. 도시락이 반짝반짝 찍힌다.', money: -5, stats: { social: 3, happy: 2 }, flags: { tuber: 1 } } },
      { label: '"공부나 해"', outcome: { text: '채널은 비공개가 됐다. 정말로?', stats: { happy: -3, smarts: 1 } } },
    ],
  },
  {
    id: 'band', kind: 'random', emoji: '🎸', ageMin: 13, ageMax: 18, weight: 2, title: '밴드 결성',
    text: (s) => (f(s, 'band') ? '밴드가 첫 공연을 잡았다. 장소는 동네 치킨집 2층.' : '{c}가 친구들과 밴드를 만들었다. 연습실은… 우리 집 거실.'),
    choices: [
      { label: '거실을 내준다', outcome: { text: '이웃집에서 항의가 왔다. 곡 제목은 「또 계란말이」.', stats: { happy: 4, social: 2 }, flags: { band: 1 } } },
      { label: '공연 맨 앞줄에 선다', requires: { followMin: 1 }, outcome: { text: '형광봉을 흔들었다. {c}는 무대에서 고개를 돌렸지만, 마지막 곡을 나에게 바쳤다.', stats: { bond: 3, happy: 2, social: -1 }, flags: { band: 1 } } },
      { label: '"시끄러워!"', outcome: { text: '연습실은 친구네 창고로 옮겨 갔다. 곡은 더 시끄러워졌다.', stats: { bond: -2 }, flags: { band: 1, rebel: 1 } } },
    ],
  },
  {
    id: 'club', kind: 'random', emoji: '🏷️', ageMin: 11, ageMax: 16, weight: 2, once: true, title: '동아리 고르기',
    text: '동아리 신청서를 들고 고민 중이다. "뭐가 좋을까?"',
    choices: [
      { label: '요리부', outcome: { text: '첫 작품은 부모님 도시락 따라 하기.', stats: { happy: 2, health: 1 }, flags: { cook: 1 } } },
      { label: '미술부', outcome: { text: '도시락 뚜껑에 그림을 그려 왔다.', stats: { happy: 3 }, flags: { art: 1 } } },
      { label: '축구부', outcome: { text: '흙투성이 운동화가 현관에 늘었다.', stats: { fitness: 5, social: 2 } } },
      { label: '코딩부', outcome: { text: '"도시락 메뉴 추천 앱 만들 거야."', stats: { smarts: 5 }, flags: { gamer: 1 } } },
    ],
  },
  {
    id: 'gacha', kind: 'random', emoji: '💎', ageMin: 11, ageMax: 17, weight: 2, once: true, title: '카드 명세서',
    when: (s) => f(s, 'gamer') >= 1 || s.stats.indep < 45,
    text: '카드 명세서에 낯선 줄이 있다. 「전설 상자 ×40」',
    choices: [
      { label: '알바해서 갚게 한다', outcome: { text: '편의점 알바 석 달. 이제 돈의 무게를 안다.', stats: { indep: 4, happy: -2 } } },
      { label: '크게 혼내고 환불 신청 (💰-3)', requires: { money: 3 }, outcome: { text: '환불은 절반만 됐다. 대화는 0이 됐다.', money: -3, stats: { bond: -3 } } },
      { label: '대신 갚아 준다 (💰-6)', requires: { money: 6 }, outcome: { text: '"고마워!" 그리고 다음 달 명세서에 「전설 상자 ×60」.', money: -6, stats: { happy: 2 }, flags: { debt: 1 } } },
    ],
  },
  {
    id: 'coin', kind: 'random', emoji: '📈', ageMin: 17, ageMax: 19, weight: 2, once: true, title: '알바비 전부 코인',
    text: '"이번엔 진짜야." {c}가 알바비를 전부 코인에 넣었다고 한다.',
    choices: [
      { label: '말린다', outcome: { text: '반만 뺐다. 남은 반은 다음 날 반토막이 났다.', stats: { smarts: 1, bond: 1 } } },
      { label: '냅둔다', outcome: (s): Outcome => (rand(s) < 0.2
        ? { text: '…올랐다. 열 배가 됐다. {c}가 떨리는 손으로 화면을 보여 줬다.', stats: { happy: 6 }, money: 10, flags: { coinWin: 1 } }
        : rand(s) < 0.5 ? { text: '사흘 만에 -90%. 그런데 "물타기"를 하겠다며 대출 앱을 깔았다.', stats: { happy: -4 }, flags: { debt: 1 } }
          : { text: '반토막이 났다. "수업료 낸 셈 칠게." 조금 어른스러워졌다.', stats: { happy: -2, indep: 2, smarts: 1 } }) },
      { label: '경제 공부부터 같이 한다', outcome: { text: '차트 대신 책을 펼쳤다. 의외로 재미있어한다.', stats: { smarts: 4, indep: 2 } } },
    ],
  },
  {
    id: 'parttime', kind: 'random', emoji: '🏪', ageMin: 16, ageMax: 19, weight: 2, title: '첫 알바',
    text: '{c}가 편의점 야간 알바를 하겠다고 한다.',
    choices: [
      { label: '응원한다', outcome: { text: '첫 월급으로 부모님 도시락을 사 왔다. 편의점 도시락이었다.', money: 4, stats: { indep: 4, bond: 2, smarts: -1 } } },
      { label: '"공부해야지"', outcome: { text: '고개를 끄덕였지만 알바 공고는 계속 본다.', stats: { smarts: 2, indep: -1 } } },
      { label: '몰래 가게 앞에서 지켜본다', requires: { followMin: 2 }, outcome: { text: '진열대 사이로 눈이 마주쳤다. 점장님이 "아버님/어머님이세요?"', stats: { bond: -3, indep: -2, social: -1 } } },
    ],
  },
  {
    id: 'nightout', kind: 'random', emoji: '⛺', ageMin: 17, ageMax: 19, weight: 2, title: '외박 허락',
    text: '"친구들이랑 바다 보러 가도 돼? 하룻밤만."',
    choices: [
      { label: '도시락 싸서 보내 준다', outcome: { text: '해 뜨는 바다 사진이 왔다. 도시락통도 같이 찍혀 있었다.', stats: { happy: 4, indep: 3, social: 2 } } },
      { label: '"안 돼"', outcome: { text: '방에서 나오지 않았다. 다음 주에 또 물었다.', stats: { bond: -2, happy: -2 }, flags: { rebel: 1 } } },
      { label: '"나도 갈래"', requires: { followMin: 2 }, outcome: { text: '친구들 사이에 부모 한 명. 사진마다 {c}의 표정이 어둡다.', stats: { bond: -2, social: -3, indep: -2 } } },
    ],
  },

  // ───────── 연애 ─────────
  {
    id: 'dating', kind: 'random', emoji: '💞', ageMin: 15, ageMax: 19, weight: 2, once: true, title: '현관 앞의 누군가',
    text: '창밖으로 보니 {c}가 누군가와 오래도록 손을 흔들고 있다.',
    choices: [
      { label: '반갑게 인사한다', outcome: { text: '"…안녕하세요." 다음 날 도시락이 2인분으로 늘었다.', stats: { happy: 4, bond: 2 }, flags: { couple: 1 } } },
      { label: '모르는 척한다', outcome: { text: '{c}가 콧노래를 부르며 들어왔다.', stats: { happy: 3, indep: 2 }, flags: { couple: 1 } } },
      { label: '"누구야! 몇 살이야!"', outcome: { text: '그날부터 현관 앞이 아니라 골목 끝에서 헤어진다.', stats: { bond: -4 }, flags: { couple: 1, rebel: 1 } } },
    ],
  },
  {
    id: 'breakup', kind: 'random', emoji: '💔', ageMin: 16, ageMax: 19, weight: 4, once: true, title: '이불 속',
    when: (s) => f(s, 'couple') >= 1,
    text: '{c}가 이불 밖으로 나오지 않는다. 휴대폰 배경 화면이 바뀌어 있다.',
    choices: [
      { label: '제일 좋아하는 메뉴로 도시락', outcome: { text: '이불 밖으로 손이 나와 도시락을 가져갔다. 빈 통이 돌아왔다.', stats: { happy: 3, bond: 3 } } },
      { label: '시간이 약이다', outcome: (s): Outcome => (rand(s) < 0.4
        ? { text: '일주일 뒤, 다시 화해했다고 한다. 배경 화면이 돌아왔다.', stats: { happy: 4 }, flags: { couple: 1 } }
        : { text: '한 달이 걸렸다. 조금 어른이 된 것 같다.', stats: { indep: 3, happy: -1 } }) },
      { label: '상대를 찾아간다', requires: { followMin: 2 }, outcome: { text: '전 학교에 소문이 났다. {c}는 일주일간 말을 하지 않았다.', stats: { bond: -5, social: -3 } } },
    ],
  },

  // ───────── 집안일 ─────────
  {
    id: 'jobloss', kind: 'random', emoji: '📦', ageMin: 5, ageMax: 17, weight: 1, once: true, title: '회사가 문을 닫았다',
    text: '회사가 문을 닫았다. 반찬값이 절반으로 줄었다. {c}에게 뭐라고 말할까?',
    choices: [
      { label: '솔직하게 말한다', outcome: { text: '다음 날 아침, {c}가 자기 도시락을 직접 싸고 있었다.', stats: { indep: 4, bond: 3 }, flags: { cook: 1 }, apply: (s) => { s.money = Math.floor(s.money / 2); } } },
      { label: '티 내지 않는다', outcome: { text: '반찬은 줄었지만 웃음은 줄이지 않았다. {c}는 눈치챘을까?', stats: { happy: 1, health: -2 }, apply: (s) => { s.money = Math.floor(s.money / 2); } } },
    ],
  },
  {
    id: 'moving', kind: 'random', emoji: '🚚', ageMin: 6, ageMax: 14, weight: 1, once: true, title: '이사',
    text: '이사를 가게 됐다. {c}는 전학을 가야 한다.',
    choices: [
      { label: '전학 간다', outcome: { text: '첫날, 새 짝꿍에게 소시지를 나눠 줬다. 작전 성공.', stats: { social: -2, indep: 4 } } },
      { label: '멀어도 다니던 학교로 (💰-6)', requires: { money: 6 }, outcome: { text: '버스로 40분. 등굣길이 길어졌다.', money: -6, stats: { social: 2, happy: 2, health: -1 } } },
    ],
  },
  {
    id: 'grandma_sick', kind: 'random', emoji: '🏥', ageMin: 8, ageMax: 19, weight: 1, once: true, title: '할머니 입원',
    text: '할머니가 입원하셨다. 병문안 가는 길.',
    choices: [
      { label: '{c}와 같이 죽 도시락을 싼다', outcome: { text: '할머니가 한 숟갈 뜨고 우셨다. "우리 강아지 다 컸네."', stats: { bond: 3, indep: 2, happy: 1 }, flags: { cook: 1 } } },
      { label: '혼자 다녀온다', outcome: { text: '{c}는 그날 밤 할머니께 긴 문자를 보냈다고 한다.', stats: { indep: 2 } } },
    ],
  },
  {
    id: 'pet_sick', kind: 'random', emoji: '🐈', ageMin: 8, ageMax: 19, weight: 3, once: true, title: '고양이 "도시락"이 아프다',
    when: (s) => f(s, 'cat') >= 1,
    text: '고양이 "도시락"이 밥을 먹지 않는다. {c}가 밤새 옆을 지켰다.',
    choices: [
      { label: '큰 동물병원으로 (💰-8)', requires: { money: 8 }, outcome: { text: '수술은 잘 됐다. {c}가 수의사 선생님을 오래 바라봤다.', money: -8, stats: { happy: 3, smarts: 2 }, flags: { cat: 1 } } },
      { label: '집에서 돌본다', outcome: { text: '조금씩 다시 먹기 시작했다. 둘 다 부쩍 컸다.', stats: { bond: 2, indep: 2 } } },
    ],
  },

  {
    id: 'grandma_nag', kind: 'random', emoji: '🧓', ageMin: 1, ageMax: 19, weight: 8, once: true, title: '할머니의 잔소리',
    when: (s) => f(s, 'grandma') >= 2,
    text: '할머니: "반찬값은 아끼고 있는 거냐? 애 도시락은 내가 싸 주랴?"',
    choices: [
      { label: '가계부를 쓰기 시작한다', outcome: { text: '가계부 첫 줄: 「계란 한 판」. 할머니가 흐뭇해하신다.', money: 4, stats: { indep: 1 }, flags: { thrift: 1 } } },
      { label: '할머니께 반찬 비법을 배운다', outcome: { text: '{c}도 옆에서 같이 배웠다. 할머니 장조림 맛이 집에 생겼다.', stats: { bond: 2, happy: 2 }, flags: { cook: 1, grandmaLove: 1 } } },
      { label: '"이제 제가 알아서 할게요"', outcome: { text: '할머니가 서운한 얼굴로 돌아가셨다. 그래도 봉투는 두고 가셨다.', money: 6, stats: { bond: -1 } } },
    ],
  },

  {
    id: 'cast', kind: 'random', emoji: '🦴', ageMin: 6, ageMax: 19, weight: 12, once: true, title: '깁스',
    when: (s) => f(s, 'injury') >= 1,
    text: '{c}의 깁스에 친구들이 낙서를 잔뜩 해 왔다. 한쪽 구석에 작게: 「그날 왜 안 왔어?」',
    choices: [
      { label: '"미안해. 무서워서 못 움직였어."', outcome: { text: '{c}가 한참 보더니 깁스 위에 썼다. 「괜찮아. 다음엔 와.」', stats: { bond: 3, happy: 2 } } },
      { label: '"혼자 이겨내라고 그랬지."', outcome: { text: '{c}가 대답 없이 낙서를 지웠다.', stats: { bond: -3, indep: 2 } } },
      { label: '깁스에 도시락 그림을 그려 준다', outcome: { text: '반에서 제일 멋진 깁스가 됐다. 그래도 그 낙서는 남아 있다.', stats: { happy: 3, social: 2 } } },
    ],
  },

  // ───────── 학교 ─────────
  {
    id: 'trip', kind: 'random', emoji: '🚌', ageMin: 12, ageMax: 17, weight: 2, once: true, title: '수학여행',
    text: '내일은 수학여행. 버스에서 먹을 간식 도시락이 필요하다.',
    choices: [
      { label: '반 전체 나눠 먹을 만큼 (💰-4)', requires: { money: 4 }, outcome: { text: '버스 뒷자리의 왕이 되었다.', money: -4, stats: { social: 5, happy: 3 } } },
      { label: '용돈만 쥐여 준다', outcome: { text: '휴게소 호두과자로 버텼다고 한다.', stats: { indep: 2, happy: 1 } } },
      { label: '렌터카로 몰래 따라간다', requires: { followMin: 2 }, outcome: { text: '숙소 앞에서 선생님과 마주쳤다. 전교에 전설이 됐다.', stats: { bond: -4, social: -5, indep: -3 } } },
    ],
  },
  {
    id: 'president', kind: 'random', emoji: '🗳️', ageMin: 9, ageMax: 15, weight: 2, once: true, title: '반장 선거',
    when: (s) => s.stats.social >= 42,
    text: '{c}가 반장 선거에 나간다! 공약은 "급식에 계란말이".',
    choices: [
      { label: '선거 도시락 파티 (💰-5)', requires: { money: 5 }, outcome: { text: '압도적 표 차이로 당선! …매수 논란은 덤.', money: -5, stats: { social: 5, happy: 3 }, flags: { lie: 1 } } },
      { label: '연설문만 같이 다듬는다', outcome: (s): Outcome => (s.stats.social >= 55 ? { text: '당선! 소감: "부모님께 감사드립니다."', stats: { social: 5, indep: 2, bond: 2 } } : { text: '2표 차 낙선. 그래도 끝까지 웃었다.', stats: { indep: 3, happy: -1 } }) },
    ],
  },
  {
    id: 'diet_obsess', kind: 'random', emoji: '⚖️', ageMin: 14, ageMax: 18, weight: 2, once: true, title: '그대로 돌아오는 도시락',
    when: (s) => s.stats.happy < 48,
    text: '도시락이 일주일째 그대로 돌아온다. {c}가 체중계에 자주 오른다.',
    choices: [
      { label: '같이 병원에 간다 (💰-4)', requires: { money: 4 }, outcome: { text: '상담 선생님 앞에서 처음으로 울었다. 조금씩 다시 먹는다.', money: -4, stats: { health: 4, happy: 2, bond: 2 } } },
      { label: '작고 예쁘게 싸 준다', outcome: { text: '한입 크기 주먹밥 세 개. 하나씩 줄어서 돌아온다.', stats: { health: 2, happy: 1 } } },
      { label: '"그럼 먹지 마"', outcome: { text: '정말 먹지 않았다.', stats: { health: -5, bond: -3 } } },
    ],
  },
  {
    id: 'ramen', kind: 'random', emoji: '🍜', ageMin: 12, ageMax: 19, weight: 2, title: '새벽 1시의 라면',
    text: '새벽 1시, 부엌에서 라면 끓는 소리가 난다.',
    choices: [
      { label: '"나도 하나만"', outcome: { text: '둘이 냄비째 먹었다. 오랜만에 시시콜콜한 이야기를 했다.', stats: { bond: 4, health: -1, happy: 2 } } },
      { label: '"몸에 안 좋아!"', outcome: { text: '불이 꺼졌다. 라면 봉지는 다음 날 쓰레기통에서 발견됐다.', stats: { health: 1, bond: -1 }, flags: { lie: 1 } } },
    ],
  },
  {
    id: 'note_reply', kind: 'random', emoji: '📝', ageMin: 7, ageMax: 15, weight: 2, once: true, title: '도시락 속 쪽지',
    when: (s) => s.stats.bond >= 55,
    text: '빈 도시락통 안에 쪽지가 들어 있다. 「내일은 소시지 많이. 사랑해(?)」',
    choices: [
      { label: '답장을 넣는다', outcome: { text: '그날부터 도시락통은 우리 둘의 우체통이 됐다.', stats: { bond: 4, happy: 3 } } },
      { label: '냉장고에 붙여 둔다', outcome: { text: '"그걸 왜 붙여!" 떼려다가 그냥 뒀다.', stats: { bond: 3, happy: 1 } } },
    ],
  },
];
