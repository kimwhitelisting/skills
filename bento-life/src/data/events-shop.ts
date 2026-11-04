// 하트 상점으로 여는 이벤트
//  shop: 이야기 꾸러미를 사야 나온다 (산 판부터, 그 뒤 모든 판)
//  wear: 그 모자를 쓰고 있어야 나온다
// 플래그 → 엔딩: dog 반려견 훈련사 · piano 피아니스트 · farm 귀농 청년 · photo 사진작가
//              fish 해양생물학자 · book 도서관 관장 · pen 외교관 · stage 배우
import { rand } from '../game/rng.ts';
import type { GameEvent, GameState, Outcome } from '../game/types.ts';

const f = (s: GameState, k: string) => s.flags[k] ?? 0;

export const SHOP_EVENTS: GameEvent[] = [
  // ───────── 🐶 강아지 입양 ─────────
  {
    id: 'puppy', kind: 'random', emoji: '🐶', ageMin: 3, ageMax: 14, weight: 6, once: true, shop: 'story-puppy', title: '보호소의 강아지',
    text: '유기견 보호소 봉사활동 날. 갈색 강아지 한 마리가 {c}의 신발 끈을 놓지 않는다.',
    choices: [
      { label: '데려온다 — 이름은 "주먹밥"', outcome: { text: '그날 밤 {c}는 강아지 옆에서 잠들었다.', stats: { happy: 6, bond: 2 }, flags: { dog: 1 } } },
      { label: '다음 주에도 봉사 오자고 약속한다', outcome: { text: '매주 토요일이 기다려지는 날이 됐다.', stats: { social: 3, indep: 2 } } },
    ],
  },
  {
    id: 'dog_walk', kind: 'random', emoji: '🦮', ageMin: 6, ageMax: 17, weight: 5, once: true, shop: 'story-puppy', title: '산책 당번',
    when: (s) => f(s, 'dog') >= 1,
    text: '"주먹밥 산책은 내가 할게!" {c}가 목줄을 들고 현관에 섰다.',
    choices: [
      { label: '혼자 다녀오게 한다', outcome: { text: '한 시간 뒤, 흙투성이 둘이 돌아왔다. 둘 다 신났다.', stats: { indep: 4, fitness: 3 }, flags: { dog: 1 } } },
      { label: '몰래 뒤따라간다', requires: { followMin: 1 }, outcome: { text: '주먹밥이 냄새로 나를 찾아냈다. 강아지는 속일 수 없다.', stats: { bond: 2, indep: -1 } } },
    ],
  },
  {
    id: 'dog_old', kind: 'random', emoji: '🐕', ageMin: 13, ageMax: 19, weight: 6, once: true, shop: 'story-puppy', title: '늙은 주먹밥',
    when: (s) => f(s, 'dog') >= 1,
    text: '주먹밥의 걸음이 느려졌다. {c}가 매일 밤 주먹밥 옆에 앉아 있다.',
    choices: [
      { label: '{c}와 같이 마지막 산책을 간다', outcome: { text: '해 질 녘, 주먹밥이 {c}의 손을 한 번 핥았다.', stats: { bond: 5, happy: -2, indep: 2 }, flags: { dog: 1 } } },
      { label: '동물병원에 다닌다 (💰-6)', requires: { money: 6 }, outcome: { text: '몇 달을 더 함께했다. {c}가 수의사 선생님께 질문을 쏟아냈다.', money: -6, stats: { smarts: 2, happy: 1 }, flags: { dog: 1, cat: 1 } } },
    ],
  },
  // ───────── 🎹 피아노 ─────────
  {
    id: 'piano', kind: 'random', emoji: '🎹', ageMin: 5, ageMax: 12, weight: 6, once: true, shop: 'story-piano', title: '거실의 피아노',
    text: '중고 피아노가 거실에 들어왔다. {c}가 건반 하나를 눌러 보고 눈이 동그래졌다.',
    choices: [
      { label: '레슨을 시작한다 (💰-5)', requires: { money: 5 }, outcome: { text: '매일 저녁 「젓가락 행진곡」이 울린다.', money: -5, stats: { smarts: 2, happy: 3 }, flags: { piano: 1 } } },
      { label: '마음대로 치게 둔다', outcome: { text: '악보 대신 도시락 노래를 지어 쳤다.', stats: { happy: 4, indep: 2 }, flags: { piano: 1, art: 1 } } },
    ],
  },
  {
    id: 'piano_recital', kind: 'random', emoji: '🎼', ageMin: 8, ageMax: 17, weight: 6, once: true, shop: 'story-piano', title: '피아노 발표회',
    when: (s) => f(s, 'piano') >= 1,
    text: '첫 발표회. 무대 뒤에서 {c}의 손이 떨린다.',
    choices: (s) => [
      { label: '응원 도시락을 건넨다', outcome: (st): Outcome => (st.stats.happy + rand(st) * 30 >= 60 ? { text: '마지막 음까지 또박또박. 박수가 쏟아졌다.', stats: { happy: 5, social: 2 }, flags: { piano: 1 } } : { text: '중간에 한 번 멈췄지만 끝까지 쳤다. 그게 더 멋있었다.', stats: { indep: 3, happy: 1 }, flags: { piano: 1 } }) },
      { label: '맨 앞줄에서 촬영한다', requires: { followMin: 2 }, outcome: { text: s.age >= 13 ? '"제발 카메라 치워." 연주보다 그 말이 더 크게 들렸다.' : '나를 보고 활짝 웃었다. 영상은 가족 단톡방의 전설이 됐다.', stats: s.age >= 13 ? { bond: -3, happy: -1 } : { bond: 3, happy: 2 }, flags: { piano: 1 } } },
    ],
  },
  // ───────── 🌱 텃밭 ─────────
  {
    id: 'garden', kind: 'random', emoji: '🌱', ageMin: 4, ageMax: 15, weight: 6, once: true, shop: 'story-garden', title: '베란다 텃밭',
    text: '베란다에 텃밭 화분을 놓았다. {c}가 매일 아침 물을 준다. 오늘 첫 수확!',
    choices: (s) => {
      const veg = s.child.dislikes.find((id) => ['broccoli', 'spinach', 'kimchi', 'pumpkin', 'tomato'].includes(id));
      return [{
        label: '수확한 채소로 도시락을 싼다',
        outcome: { text: veg ? '"내가 키운 거니까…" 싫어하던 채소를 한 입 먹었다. 이제 안 남긴다!' : '방울토마토 세 알. 도시락 맨 위에 자랑스럽게 올렸다.', stats: { health: 3, happy: 3 }, flags: { farm: 1 }, apply: (st) => { if (veg) { st.child.dislikes = st.child.dislikes.filter((d) => d !== veg); st.child.known.dislikes = st.child.known.dislikes.filter((d) => d !== veg); } } },
      }];
    },
  },
  // ───────── 📷 필름 카메라 ─────────
  {
    id: 'camera_gift', kind: 'random', emoji: '📷', ageMin: 9, ageMax: 17, weight: 6, once: true, shop: 'story-camera', title: '필름 카메라',
    text: '서랍 속 필름 카메라를 {c}에게 줬다. 첫 필름 스물네 장.',
    choices: [
      { label: '"뭐든 찍어 봐"', outcome: { text: '현상해 보니 절반이 도시락 사진이었다.', stats: { happy: 3, indep: 2 }, flags: { photo: 1, art: 1 } } },
      { label: '같이 사진 산책을 간다', outcome: { text: '서로를 찍어 줬다. 내 사진은 다 흔들렸다.', stats: { bond: 4, happy: 2 }, flags: { photo: 1 } } },
    ],
  },
  {
    id: 'photo_contest', kind: 'random', emoji: '🏆', ageMin: 12, ageMax: 19, weight: 6, once: true, shop: 'story-camera', title: '사진 공모전',
    when: (s) => f(s, 'photo') >= 1,
    text: '{c}가 사진 공모전에 낸 작품 제목은 「전봇대 뒤의 사람」.',
    choices: (s) => [{
      label: '…혹시 그거 나야?',
      outcome: s.album.filter((d) => d.leave === 'follow').length >= 4
        ? { text: '맞다. 나다. 대상을 받았다. 심사평: "보호와 감시 사이를 날카롭게 포착했다."', stats: { happy: 5, social: 3 }, flags: { photo: 2 } }
        : { text: '전봇대 뒤엔 길고양이가 있었다. 장려상.', stats: { happy: 2 }, flags: { photo: 1 } },
    }],
  },
  // ───────── 🐠 어항 ─────────
  {
    id: 'fishtank', kind: 'random', emoji: '🐠', ageMin: 4, ageMax: 12, weight: 6, once: true, shop: 'story-fish', title: '거실의 어항',
    text: '작은 어항이 거실에 들어왔다. {c}가 물고기에게 이름을 붙였다. "김밥이야."',
    choices: [
      { label: '먹이 당번을 맡긴다', outcome: { text: '매일 아침 도시락보다 먼저 김밥 밥을 챙긴다.', stats: { indep: 3, happy: 2 }, flags: { fish: 1 } } },
      { label: '같이 물고기 도감을 본다', outcome: { text: '"이건 흰동가리, 이건 블루탱!" 밤새 외웠다.', stats: { smarts: 3, bond: 2 }, flags: { fish: 1 } } },
    ],
  },
  {
    id: 'aquarium_trip', kind: 'random', emoji: '🐋', ageMin: 7, ageMax: 17, weight: 6, once: true, shop: 'story-fish', title: '아쿠아리움 견학',
    when: (s) => f(s, 'fish') >= 1,
    text: '수족관 대형 수조 앞. {c}가 꼼짝도 하지 않는다.',
    choices: [
      { label: '해설사 선생님께 질문하게 둔다', outcome: { text: '질문이 스무 개를 넘었다. 해설사 선생님이 명함을 주셨다.', stats: { smarts: 3, social: 2 }, flags: { fish: 1 } } },
      { label: '고래상어 앞에서 도시락을 먹는다', outcome: { text: '"고래도 도시락 먹을까?" 한참을 웃었다.', stats: { happy: 4, bond: 2 }, flags: { fish: 1 } } },
    ],
  },
  // ───────── 📚 도서관 카드 ─────────
  {
    id: 'library_card', kind: 'random', emoji: '📚', ageMin: 5, ageMax: 14, weight: 6, once: true, shop: 'story-library', title: '첫 도서관 카드',
    text: '{c}가 이름이 적힌 도서관 카드를 받았다. 두 손으로 꼭 쥐고 있다.',
    choices: [
      { label: '매주 토요일 같이 간다', outcome: { text: '도서관 앞 벤치가 둘의 도시락 자리가 됐다.', stats: { bond: 3, smarts: 2 }, flags: { book: 1 } } },
      { label: '혼자 다니게 한다', outcome: { text: '대출 목록이 점점 두꺼워진다. 고르는 책이 달라졌다.', stats: { indep: 3, smarts: 2 }, flags: { book: 1 } } },
    ],
  },
  {
    id: 'book_overdue', kind: 'random', emoji: '📕', ageMin: 8, ageMax: 17, weight: 6, once: true, shop: 'story-library', title: '연체 30일',
    when: (s) => f(s, 'book') >= 1,
    text: '도서관에서 문자가 왔다. 「연체 30일」. {c}가 그 책을 끌어안고 있다. "아직 다 못 읽었어."',
    choices: [
      { label: '같이 반납하고 사과한다', outcome: { text: '사서 선생님이 웃으며 같은 작가의 다른 책을 추천해 주셨다.', stats: { social: 2, indep: 2 }, flags: { book: 1 } } },
      { label: '그 책을 사 준다 (💰-3)', requires: { money: 3 }, outcome: { text: '책장에 처음으로 "내 책"이 생겼다.', money: -3, stats: { happy: 3, smarts: 1 }, flags: { book: 1 } } },
    ],
  },
  // ───────── ✉️ 해외 펜팔 ─────────
  {
    id: 'penpal', kind: 'random', emoji: '✉️', ageMin: 9, ageMax: 16, weight: 6, once: true, shop: 'story-penpal', title: '바다 건너 온 편지',
    text: '외국 펜팔 친구의 첫 편지. 사진 속 도시락엔 샌드위치와 사과 한 알.',
    choices: [
      { label: '우리 도시락 사진을 보낸다', outcome: { text: '답장: "WOW! 너희 부모님 셰프야?"', stats: { social: 3, happy: 2 }, flags: { pen: 1 } } },
      { label: '영어 사전을 사 준다 (💰-2)', requires: { money: 2 }, outcome: { text: '사전에 형광펜 줄이 하루에 열 개씩 늘어난다.', money: -2, stats: { smarts: 3 }, flags: { pen: 1 } } },
    ],
  },
  {
    id: 'penpal_visit', kind: 'random', emoji: '🛬', ageMin: 13, ageMax: 19, weight: 6, once: true, shop: 'story-penpal', title: '펜팔 친구가 온다',
    when: (s) => f(s, 'pen') >= 1,
    text: '몇 년째 편지를 주고받은 펜팔 친구가 한국에 온다!',
    choices: [
      { label: '집에 초대해 도시락을 싸 준다', outcome: { text: '친구가 김밥을 한 줄 통째로 먹었다. "이게 그 도시락이구나!"', stats: { social: 3, bond: 2, happy: 2 }, flags: { pen: 1 } } },
      { label: '공항까지 몰래 따라간다', requires: { followMin: 2 }, outcome: { text: '입국장에서 셋이 마주쳤다. 첫마디가 "Who is that?"이었다.', stats: { bond: -2, social: -2 }, flags: { pen: 1 } } },
    ],
  },
  // ───────── 🎭 연극 동아리 ─────────
  {
    id: 'theater_club', kind: 'random', emoji: '🎭', ageMin: 10, ageMax: 17, weight: 6, once: true, shop: 'story-theater', title: '연극 오디션',
    text: '{c}가 연극 동아리 오디션에 붙었다. 배역은… "아이를 몰래 미행하는 탐정".',
    choices: [
      { label: '대본 연습 상대를 해 준다', outcome: { text: '"좀 더 숨어 봐. 아니 그렇게 티 나게 말고." …왠지 찔린다.', stats: { bond: 3, happy: 2 }, flags: { stage: 1 } } },
      { label: '"연기는 나한테 배워"', outcome: { text: '시범을 보였더니 {c}가 조용히 말했다. "…진짜 잘하네. 자주 해 봤어?"', stats: { happy: 2, indep: -1 }, flags: { stage: 1 } } },
    ],
  },
  {
    id: 'stage_debut', kind: 'random', emoji: '🌹', ageMin: 12, ageMax: 19, weight: 6, once: true, shop: 'story-theater', title: '첫 공연',
    when: (s) => f(s, 'stage') >= 1,
    text: '막이 오른다. 무대 위 {c}가 전봇대 뒤에 숨는다. 객석에서 웃음이 터졌다.',
    choices: (s) => [
      { label: '꽃다발을 들고 기다린다', outcome: { text: '커튼콜 때 {c}가 객석을 향해 꾸벅 인사했다. 정확히 내 쪽으로.', stats: { happy: 4, bond: 2 }, flags: { stage: 1 } } },
      { label: '맨 앞줄에서 크게 웃는다', requires: { followMin: 1 }, outcome: { text: s.age >= 13 ? '"제일 크게 웃은 사람, 다 들렸어." …그래도 싫지 않은 눈치다.' : '무대 위에서 나를 보고 손을 흔들었다. 연출 선생님이 한숨을 쉬었다.', stats: { bond: 2, social: 1 }, flags: { stage: 1 } } },
    ],
  },
  // ───────── 🚲 자전거 · ⛺ 캠핑 ─────────
  {
    id: 'bike', kind: 'random', emoji: '🚲', ageMin: 4, ageMax: 9, weight: 6, once: true, shop: 'story-bike', title: '보조 바퀴 떼는 날',
    text: '오늘 보조 바퀴를 뗀다. {c}가 핸들을 꼭 쥐었다.',
    choices: [
      { label: '뒤에서 잡아 주다가 슬쩍 놓는다', outcome: { text: '"잡고 있지? 잡고 있지?!" …혼자 열 미터를 갔다.', stats: { indep: 5, happy: 4 } } },
      { label: '끝까지 잡아 준다', outcome: { text: '넘어지지 않았다. 대신 혼자 타는 건 내년으로.', stats: { bond: 3, indep: -2 } } },
    ],
  },
  {
    id: 'camping', kind: 'random', emoji: '⛺', ageMin: 5, ageMax: 17, weight: 4, shop: 'story-camping', title: '주말 캠핑',
    text: '텐트를 쳤다. 밤하늘에 별이 많다. 저녁은 코펠에 끓인 라면.',
    choices: (s) => [{
      label: '모닥불 앞에서 이야기한다',
      outcome: s.age >= 13 ? { text: '휴대폰이 안 터지자 {c}가 먼저 말을 걸었다. 몇 년 만의 긴 대화.', stats: { bond: 5, happy: 2 } } : { text: '별똥별에 소원을 빌었다. "내일도 캠핑!"', stats: { happy: 5, bond: 3 } },
    }],
  },
  // ───────── 모자를 쓰고 있으면 ─────────
  {
    id: 'shades_day', kind: 'random', emoji: '🕶️', ageMin: 10, ageMax: 18, weight: 5, once: true, wear: 'hat-shades', title: '선글라스 등교',
    text: '{c}가 선글라스를 끼고 등교하겠다고 한다. "이게 내 스타일이야."',
    choices: [
      { label: '"멋있다!" 보내 준다', outcome: { text: '반에서 별명이 생겼다. 「요원」.', stats: { social: 3, happy: 2 }, flags: { rebel: 1 } } },
      { label: '"교실에선 벗어야지"', outcome: { text: '교문 앞에서 벗어 가방에 넣었다. 하교할 땐 다시 꼈다.', stats: { indep: 2 } } },
    ],
  },
  {
    id: 'little_chef', kind: 'random', emoji: '👨‍🍳', ageMin: 5, ageMax: 14, weight: 5, once: true, wear: 'hat-chef', title: '꼬마 셰프',
    text: '요리사 모자를 쓴 {c}가 부엌을 점령했다. "오늘 도시락은 셰프 특선이에요."',
    choices: [
      { label: '보조 셰프가 된다', outcome: { text: '계란 껍질이 조금 씹혔다. 셰프는 자랑스러워했다.', stats: { happy: 4, indep: 2 }, flags: { cook: 1 } } },
      { label: '"불은 위험해" 말린다', outcome: { text: '셰프는 시무룩하게 모자를 벗었다.', stats: { happy: -2 } } },
    ],
  },
  {
    id: 'crown_day', kind: 'random', emoji: '👑', ageMin: 3, ageMax: 9, weight: 5, once: true, wear: 'hat-crown', title: '왕관을 쓴 날',
    text: '{c}가 왕관을 벗지 않겠다고 버틴다. "나는 오늘 왕이야!"',
    choices: [
      { label: '왕의 행차를 허락한다', outcome: { text: '반 친구들이 줄을 서서 신하가 되었다. 점심엔 왕의 도시락 시식회.', stats: { social: 4, happy: 3 } } },
      { label: '"왕은 왕관을 집에 두고 다니는 거야"', outcome: { text: '그럴듯한지 고개를 끄덕였다. 왕관은 현관에서 기다린다.', stats: { indep: 2, bond: 1 } } },
    ],
  },
];
