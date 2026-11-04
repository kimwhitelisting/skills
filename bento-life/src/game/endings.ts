import { tuningOf } from './config.ts';
import type { GameState } from './types.ts';

/**
 * 엔딩
 *  tone  : happy 해피 · bitter 씁쓸 · twisted 삐딱 · bad 배드
 *  early : 스무 살 전에 끝나는 엔딩 — 해마다 결산이 끝날 때 나이 범위 안에서 검사한다
 *  warn  : 조기 엔딩이 다가올 때 결산에 붉은 경고를 띄우는 조건 (갑자기 끝나지 않도록)
 *  hint  : 결산의 "이대로라면…" 방향 힌트 ({c} = 아이 이름)
 *  later : 10년 뒤 한 줄 (에필로그)
 */
export type Tone = 'happy' | 'bitter' | 'twisted' | 'bad';
export interface Ending {
  id: string; emoji: string; title: string; text: string; hint: string; tone: Tone;
  later?: string;
  early?: { min: number; max: number };
  warn?: (s: GameState) => boolean;
  test: (s: GameState) => boolean;
}

export const TONE_LABEL: Record<Tone, string> = { happy: '해피', bitter: '씁쓸', twisted: '삐딱', bad: '배드' };

const st = (s: GameState) => s.stats;
const f = (s: GameState, k: string) => s.flags[k] ?? 0;
const variety = (s: GameState, perDay: number) => s.runMenus.length >= perDay * tuningOf(s).daysPerYear;

/** 스무 살 전에 끝나는 엔딩 (위에서부터) */
const EARLY: Ending[] = [
  {
    id: 'runaway', emoji: '🎒', tone: 'bad', title: '쪽지 한 장', early: { min: 14, max: 18 },
    text: '"찾지 마." 식탁 위엔 쪽지와, 손도 안 댄 도시락통이 놓여 있었다.',
    later: '몇 년 뒤, 모르는 번호로 문자가 왔다. "…밥은 먹고 다녀."',
    hint: '{c}가 요즘 집에 잘 안 들어온다…',
    warn: (s) => s.age >= 13 && (f(s, 'runaway') >= 1 || f(s, 'rebel') >= 3 || (st(s).bond < 25 && st(s).happy < 45)),
    test: (s) => f(s, 'runaway') >= 2 || (f(s, 'runaway') >= 1 && st(s).bond < 28) || (f(s, 'rebel') >= 4 && st(s).bond < 35) || (st(s).bond < 15 && st(s).happy < 35),
  },
  {
    id: 'dropout', emoji: '🧾', tone: 'bad', title: '자퇴서', early: { min: 16, max: 18 },
    text: '자퇴서에 도장을 찍었다. 이제 도시락은 학교가 아니라 알바하는 가게로 싸 간다.',
    later: '검정고시 합격 날, {c}가 처음으로 먼저 전화를 걸어왔다. "…오늘 저녁 뭐야?"',
    hint: '{c}가 학교 이야기를 하지 않는다. 결석 문자가 늘었다.',
    warn: (s) => s.age >= 15 && f(s, 'rebel') + f(s, 'lie') >= 3 && st(s).smarts < 45,
    test: (s) => f(s, 'rebel') + f(s, 'lie') >= 5 && st(s).smarts < 42,
  },
  {
    id: 'idol', emoji: '🎤', tone: 'happy', title: '데뷔조', early: { min: 15, max: 18 },
    text: '연습생 생활 끝에 데뷔 무대에 섰다. 숙소 규칙 1조: 외부 도시락 금지. …몰래 반입은 계속된다.',
    later: '월드 투어 대기실 사진에 낯익은 보자기가 찍혀 있었다.',
    hint: '{c}가 거울 앞에서 안무 연습을 멈추지 않는다.',
    test: (s) => f(s, 'idolDebut') >= 1,
  },
  {
    id: 'abroad', emoji: '✈️', tone: 'bitter', title: '이른 유학', early: { min: 13, max: 17 },
    text: '공항에서 마지막 도시락을 건넸다. 출국장 너머로 손이 작게 흔들렸다.',
    later: '영상 통화 너머 {c}가 말한다. "여기 도시락은 다 차가워."',
    hint: '{c}가 영어 단어장을 끼고 산다.',
    test: (s) => f(s, 'abroad') >= 1,
  },
  {
    id: 'sportsSchool', emoji: '🏅', tone: 'happy', title: '체육고 기숙사', early: { min: 14, max: 17 },
    text: '스카우트 제의를 받고 체육고에 갔다. 주말마다 도시락 세 통을 싸서 기숙사 앞에 간다.',
    later: '전국체전 결승선, 관중석의 보자기를 향해 손을 번쩍 들었다.',
    hint: '{c}의 기록이 눈에 띄게 좋아지고 있다.',
    test: (s) => f(s, 'scout') >= 1 && st(s).fitness >= 60,
  },
  {
    id: 'prodigy', emoji: '🎓', tone: 'twisted', title: '최연소 대학생', early: { min: 14, max: 17 },
    text: '월반에 월반을 거듭해 대학생이 됐다. 학식이 맛없다며 매일 점심시간에 전화가 온다.',
    later: '스물다섯에 교수가 됐다. 연구실 냉장고엔 아직 부모님 반찬통이 있다.',
    hint: '{c}의 문제집이 또래보다 몇 학년 앞서 있다.',
    test: (s) => f(s, 'skip') >= 1 && st(s).smarts >= 85,
  },
];

/** 스무 살 엔딩 (위에서부터 먼저 맞는 것 하나) */
const FINAL: Ending[] = [
  { id: 'kangaroo', emoji: '🦘', tone: 'twisted', title: '평생 도시락 받는 어른', text: '서른이 되어도 매일 아침 도시락을 받으러 온다. …이게 맞나?', later: '마흔, 회사 동기들이 묻는다. "그 도시락 누가 싸 줘?"', hint: '{c}는 아직 혼자서는 아무것도 못 하는 것 같다…', test: (s) => st(s).indep < 25 },
  { id: 'hikikomori', emoji: '🚪', tone: 'bad', title: '닫힌 방', text: '방문은 아직 닫혀 있다. 도시락은 문 앞에 둔다. 가끔, 빈 통이 나와 있다.', later: '어느 날 빈 통 위에 쪽지가 있었다. "내일은 계란말이."', hint: '{c}가 방 밖으로 잘 나오지 않는다.', test: (s) => st(s).social < 30 && st(s).happy < 48 },
  { id: 'fragile', emoji: '🤧', tone: 'bad', title: '잔병치레 어른', text: '맛있는 건 많이 먹었는데… 비타민은 챙겨 먹자.', later: '건강검진 결과지를 들고 왔다. "이제부터 도시락은 채소로 부탁해."', hint: '{c}가 요즘 자주 아프다. 식단을 돌아보자.', test: (s) => st(s).health < 36 },
  { id: 'debt', emoji: '💳', tone: 'bad', title: '카드값 인생', text: '코인과 현질의 끝. 월급날이 되면 통장은 3초 만에 비워진다.', later: '서른에 겨우 다 갚았다. 축하 도시락을 싸 줬다.', hint: '{c}의 휴대폰에서 결제 알림이 끊이지 않는다.', test: (s) => f(s, 'coinWin') < 1 && (f(s, 'debt') >= 2 || (f(s, 'debt') >= 1 && st(s).smarts < 45)) },
  { id: 'conartist', emoji: '🎩', tone: 'twisted', title: '말빨로 먹고사는 어른', text: '명함이 매달 바뀐다. 직업은 "컨설턴트". 무슨 컨설팅인지는 아무도 모른다.', later: '뉴스에 나왔다. 다행히 피해자는 아니고 증인으로.', hint: '{c}의 말은 그럴듯한데 어딘가 미심쩍다.', test: (s) => st(s).social >= 52 && st(s).bond < 50 && f(s, 'lie') >= 2 },
  { id: 'grandmaRestaurant', emoji: '🍲', tone: 'happy', title: '할매 도시락', text: '할머니 장조림 비법으로 차린 한식당 「할매 도시락」. 3대째 이어지는 손맛이다.', later: '벽에 걸린 할머니 사진 아래, 매일 아침 첫 장조림 한 그릇이 놓인다.', hint: '{c}가 할머니 반찬 맛을 똑같이 낸다.', test: (s) => f(s, 'grandmaLove') >= 1 && f(s, 'cook') >= 2 },
  { id: 'grandmaKid', emoji: '🧓', tone: 'bitter', title: '할머니가 키운 아이', text: '{c}가 제일 그리워하는 집밥은… 할머니 장조림이다. 도시락 반찬값은 늘 할머니 몫이었다.', later: '할머니 기일마다 {c}가 직접 장조림을 만든다. 맛이 똑같다.', hint: '{c}가 요즘 할머니 댁에 자주 간다.', test: (s) => f(s, 'grandma') >= 2 && f(s, 'thrift') < 1 },
  { id: 'coinRich', emoji: '🪙', tone: 'twisted', title: '스무 살 건물주', text: '코인이 터졌다. 건물을 샀다. 그런데 아직도 부모님 도시락을 배달시킨다 (배달비 포함).', later: '건물 1층에 도시락 가게를 냈다. 사장님은 부모님이다.', hint: '{c}가 차트를 보며 중얼거린다.', test: (s) => f(s, 'coinWin') >= 1 },
  { id: 'idolFail', emoji: '🪩', tone: 'bitter', title: '데뷔하지 못한 연습생', text: '연습생 5년, 데뷔는 무산됐다. 그래도 노래방에선 아직 전설이다.', later: '댄스 학원 원장이 됐다. 수강생들 도시락까지 싸 들고 간다.', hint: '{c}가 연습실에서 밤을 새운다.', test: (s) => f(s, 'idolFail') >= 1 && f(s, 'idolDebut') < 1 },
  { id: 'doctor', emoji: '🩺', tone: 'happy', title: '명의', text: '환자들에게 늘 말한다. "밥은 꼭 챙겨 드세요."', later: '야간 당직 날마다 응급실 앞으로 보온 도시락이 배달된다.', hint: '{c}는 책을 놓지 않고, 감기도 잘 안 걸린다.', test: (s) => st(s).smarts >= 80 && st(s).health >= 60 },
  { id: 'athlete', emoji: '🥇', tone: 'happy', title: '국가대표', text: '금메달 인터뷰: "도시락 덕분입니다!" 전국에 도시락 열풍이 불었다.', later: '은퇴 후 유소년 코치. 훈련 끝엔 꼭 도시락 시간.', hint: '{c}는 뛰어다니느라 하루가 짧다.', test: (s) => st(s).fitness >= 75 && st(s).health >= 60 },
  { id: 'star', emoji: '🌟', tone: 'happy', title: '모두의 인기인', text: '어딜 가나 사람이 모인다. 점심시간 반찬 교환 시장에서 배운 협상력 덕분일지도.', later: '결혼식 하객이 500명. 답례품은 도시락.', hint: '{c} 주변엔 늘 친구들이 북적인다.', test: (s) => st(s).social >= 80 && st(s).happy >= 60 },
  { id: 'bestie', emoji: '🤗', tone: 'happy', title: '부모와 베스트 프렌드', text: '독립해서도 주말마다 같이 장을 본다. 이번엔 아이가 도시락을 싸 준다.', later: '여행 사진 속 둘이 똑같은 포즈로 브이를 하고 있다.', hint: '{c}와 수다 떠는 시간이 제일 즐겁다.', test: (s) => st(s).bond >= 80 && st(s).indep >= 40 },
  { id: 'traveler', emoji: '🌍', tone: 'happy', title: '세계 여행가', text: '엽서가 온다. "여기 도시락은 엄마아빠 것만 못해."', later: '여행 책을 냈다. 챕터마다 그 나라 도시락 사진.', hint: '{c}는 혼자서도 어디든 갈 수 있을 것 같다.', test: (s) => st(s).indep >= 72 && st(s).happy >= 55 },
  { id: 'topToKitchen', emoji: '🔪', tone: 'twisted', title: '의대 대신 조리학교', text: '수능 전 과목 1등급. 그리고 원서는… 조리학교에 냈다. 담임 선생님이 세 번 전화하셨다.', later: '레스토랑 메뉴판 한쪽: 「수능 날 아침 도시락」. 제일 비싼 메뉴다.', hint: '{c}가 문제집 대신 요리책을 펼쳐 놓고 있다.', test: (s) => f(s, 'examTop') >= 1 && f(s, 'cook') >= 2 },
  { id: 'pianist', emoji: '🎹', tone: 'happy', title: '피아니스트', text: '첫 독주회 앙코르 곡은 「도시락 노래」. 그 옛날 거실에서 지어 친 곡이다.', later: '공연이 끝나면 대기실로 보온 도시락이 배달된다. 보낸 사람은 매번 같다.', hint: '{c}의 손가락이 식탁 위에서도 건반을 친다.', test: (s) => f(s, 'piano') >= 2 && st(s).happy >= 50 },
  { id: 'photographer', emoji: '📷', tone: 'twisted', title: '사진작가', text: '첫 사진집 「뒤에서 본 부모」. 전봇대·나무·편의점 뒤에서 찍힌 사람은 전부 같은 사람이다.', later: '사진전 마지막 벽에 걸린 건 도시락을 싸는 뒷모습이었다.', hint: '{c}가 늘 카메라를 목에 걸고 다닌다.', test: (s) => f(s, 'photo') >= 2 },
  { id: 'dogTrainer', emoji: '🦮', tone: 'happy', title: '반려견 훈련사', text: '"기다려"를 제일 잘 가르치는 훈련사. 주먹밥이 첫 제자였다.', later: '훈련소 마당 한편에 작은 비석: 「주먹밥, 우리 집 첫 도시락 친구」.', hint: '{c}가 동네 강아지들과 다 친구다.', test: (s) => f(s, 'dog') >= 2 && st(s).bond >= 45 },
  { id: 'farmer', emoji: '🧑‍🌾', tone: 'happy', title: '귀농 청년', text: '스물셋에 시골로 내려갔다. 택배 상자에 쪽지: "도시락 반찬은 이제 내가 키운 걸로."', later: '「졸졸농장」 방울토마토가 동네 초등학교 급식에 나온다.', hint: '{c}가 베란다 화분을 하나씩 늘리고 있다.', test: (s) => f(s, 'farm') >= 1 && st(s).health >= 55 && st(s).indep >= 45 },
  { id: 'marineBio', emoji: '🐋', tone: 'happy', title: '해양생물학자', text: '남극 연구선에 탔다. 도시락은 꽁꽁 얼었지만 엽서는 따뜻하다. "김밥(물고기) 잘 있어?"', later: '새로 발견한 심해어에 이름을 붙였다. 학명 끝에 「gimbap」.', hint: '{c}가 물속 생물 이야기만 나오면 눈이 반짝인다.', test: (s) => f(s, 'fish') >= 2 && st(s).smarts >= 55 },
  { id: 'librarian', emoji: '📖', tone: 'happy', title: '동네 도서관 관장', text: '작은 도서관의 관장이 됐다. 도서관 규칙 1조: "도시락 반입 환영."', later: '토요일 아침, 도서관 앞 벤치에서 아이들이 도시락을 먹는다. 그때 그 자리다.', hint: '{c}의 가방은 늘 책 때문에 무겁다.', test: (s) => f(s, 'book') >= 2 && st(s).smarts >= 50 && st(s).indep >= 45 },
  { id: 'diplomat', emoji: '🌐', tone: 'happy', title: '외교관', text: '외교관이 됐다. 첫 공식 만찬 메뉴에 김밥을 넣었다. 각국 대사들이 레시피를 물었다.', later: '은퇴한 펜팔 친구와 지금도 편지를 쓴다. 이번엔 손주들 도시락 사진.', hint: '{c}의 책상엔 외국 우표가 붙은 편지가 쌓여 있다.', test: (s) => f(s, 'pen') >= 2 && st(s).social >= 55 && st(s).smarts >= 50 },
  { id: 'actor', emoji: '🎬', tone: 'twisted', title: '배우', text: '배우가 됐다. 인생 연기라 불린 배역은 「아이를 미행하는 부모」. 연기 비결은 묻지 않기로 했다.', later: '시상식 소감: "이 역할은… 집에서 매일 보고 배웠습니다." 객석의 누군가가 고개를 숙였다.', hint: '{c}가 거울 앞에서 표정 연습을 한다.', test: (s) => f(s, 'stage') >= 2 && st(s).social >= 48 },
  { id: 'chef', emoji: '👨‍🍳', tone: 'happy', title: '스타 셰프', text: '"제 요리의 뿌리는 부모님의 도시락입니다." 첫 레스토랑 메뉴판 1번은 그 도시락이었다.', later: '미슐랭 별을 받던 날, 주방 구석에서 계란말이를 부쳤다.', hint: '{c}가 요즘 부엌을 자주 기웃거린다.', test: (s) => f(s, 'cook') >= 4 && variety(s, 15) },
  { id: 'bentoShop', emoji: '🏪', tone: 'happy', title: '동네 도시락 가게 사장', text: '간판은 「졸졸 도시락」. 학교 앞 아이들이 줄을 선다. 부모 동반 금지.', later: '2호점, 3호점. 메뉴판 1번은 늘 그 도시락.', hint: '{c}가 친구들 도시락까지 싸 주겠다고 한다.', test: (s) => f(s, 'cook') >= 3 && st(s).social >= 58 },
  { id: 'valedictorian', emoji: '🎖️', tone: 'happy', title: '수석 입학', text: '수석 입학. 입학식 축사 첫 줄: "오늘 아침에도 도시락을 싸 주신 분께."', later: '축사 영상이 퍼졌다. 그해 대학가 앞 도시락 가게들이 줄을 섰다.', hint: '{c}가 시험 날 아침에도 웃는다.', test: (s) => f(s, 'examTop') >= 1 && st(s).smarts >= 68 && st(s).happy >= 50 },
  { id: 'vet', emoji: '🐾', tone: 'happy', title: '고양이 의사', text: '그때 그 길고양이 "도시락"이 첫 환자였다. 지금은 동네 동물병원 원장.', later: '병원 고양이가 열두 마리가 됐다. 사료 도시락도 싼다.', hint: '{c}가 동물 도감을 끼고 산다.', test: (s) => f(s, 'cat') >= 1 && st(s).smarts >= 55 && st(s).bond >= 45 },
  { id: 'firefighter', emoji: '🚒', tone: 'happy', title: '소방관', text: '불길 속으로 먼저 뛰어든다. 남을 쫓아가 지키는 건 집안 내력인가 보다.', later: '소방서 식구들 몫까지 도시락을 싸는 게 주말 일과가 됐다.', hint: '{c}가 다친 친구를 업고 보건실에 갔다고 한다.', test: (s) => st(s).fitness >= 62 && st(s).social >= 52 && st(s).bond >= 50 },
  { id: 'esports', emoji: '🕹️', tone: 'happy', title: '프로게이머', text: '세계 대회 결승. 경기 전 루틴은 부모님 계란말이 한 입.', later: '해설자가 됐다. 방송 중 도시락 먹방이 더 유명하다.', hint: '{c}의 손이 키보드 위에서 보이지 않는다.', test: (s) => f(s, 'gamer') >= 2 && st(s).smarts >= 40 && st(s).indep >= 35 },
  { id: 'bandStar', emoji: '🎸', tone: 'twisted', title: '인디 밴드 보컬', text: '부모 도시락을 디스하는 노래 「또 계란말이」로 인디 차트 1위. 가사는 전부 사실이다.', later: '앙코르 곡은 늘 같은 노래. 객석 맨 앞줄엔 보자기를 든 사람이 있다.', hint: '{c}의 방에서 기타 소리가 새어 나온다.', test: (s) => f(s, 'band') >= 2 && st(s).happy >= 50 },
  { id: 'youtuber', emoji: '📹', tone: 'twisted', title: '도시락 리뷰 유튜버', text: '구독자 80만 「오늘의 부모 도시락」. 메인 출연자는 부모. 출연료는 없다.', later: '실버 버튼 옆에 부모님 이름이 적혀 있다. …작게.', hint: '{c}가 도시락을 먹기 전에 꼭 사진부터 찍는다.', test: (s) => f(s, 'tuber') >= 2 && st(s).social >= 50 },
  { id: 'artist', emoji: '🎨', tone: 'happy', title: '예술가', text: '첫 개인전의 제목은 「도시락 뚜껑을 열 때」.', later: '작품 하나가 미술관에 걸렸다. 제목: 「계란말이, 2009」.', hint: '{c}의 공책은 낙서로 가득하다.', test: (s) => f(s, 'art') >= 3 && st(s).happy >= 55 },
  { id: 'novelist', emoji: '📖', tone: 'twisted', title: '스릴러 작가', text: '데뷔작 「쫓아오는 사람」이 베스트셀러. 주인공을 미행하는 부모가 이상하게 낯익다.', later: '드라마로 만들어졌다. 부모 역 배우가 인터뷰에서 말했다. "실존 인물이 있대요."', hint: '{c}가 밤마다 무언가를 쓴다.', test: (s) => f(s, 'art') >= 2 && st(s).smarts >= 55 && s.album.filter((d) => d.leave === 'follow').length >= 6 },
  { id: 'teacher', emoji: '🧑‍🏫', tone: 'happy', title: '선생님', text: '교문 앞에서 서성이는 학부모를 보면 웃음이 난다. 예전의 누군가가 생각나서.', later: '제자들이 졸업식 날 도시락을 싸 왔다. 삐뚤빼뚤한 계란말이.', hint: '{c}가 동생들에게 숙제를 가르쳐 준다.', test: (s) => st(s).social >= 60 && st(s).smarts >= 55 && st(s).bond >= 55 },
  { id: 'scholar', emoji: '🔬', tone: 'happy', title: '연구자', text: '밤새 연구실에 있어도 견과류 한 봉지는 꼭 챙긴다.', later: '논문 감사의 글 마지막 줄: "그리고 매일의 도시락에게."', hint: '{c}는 궁금한 게 너무 많다.', test: (s) => st(s).smarts >= 75 },
  { id: 'tattoo', emoji: '🖋️', tone: 'twisted', title: '타투이스트', text: '홍대 타투샵 사장. 팔에 새긴 첫 그림은… 도시락.', later: '손님들이 가장 많이 고르는 도안: 보자기 매듭.', hint: '{c}의 반항이 어딘가 예술적이다.', test: (s) => f(s, 'rebel') >= 3 && (f(s, 'art') >= 1 || st(s).happy >= 45) },
  { id: 'estranged', emoji: '📵', tone: 'bitter', title: '연락 없는 자식', text: '잘 산다는 소식만 건너 듣는다. 명절에 문자 한 통. "잘 지내."', later: '서른다섯, 아이를 안고 찾아왔다. "이 집 계란말이 맛 가르쳐 줘."', hint: '{c}가 혼자 다 해내지만, 집에 오는 일이 줄었다.', test: (s) => st(s).bond < 40 && st(s).indep >= 50 },
  { id: 'afterThatDay', emoji: '🚑', tone: 'bitter', title: '그날 이후', text: '두 번 크게 다쳤다. 다 나았지만, 비 오는 날이면 {c}의 다리가 먼저 안다.', later: '{c}는 응급구조사가 되었다. "그때 그 구급대원처럼, 제일 먼저 달려가는 사람."', hint: '{c}가 횡단보도 앞에서 오래 멈춰 선다.', test: (s) => f(s, 'injury') >= 2 },
  { id: 'gosi', emoji: '📚', tone: 'bitter', title: '노량진 7년 차', text: '합격은 "내년에" 한다. 도시락은 여전히 택배로 간다.', later: '여덟 번째 해에 붙었다. 합격 소식보다 "도시락 이제 안 보내도 돼"가 먼저였다.', hint: '{c}가 책상 앞을 떠나지 못한다. 그런데 표정이…', test: (s) => st(s).smarts >= 58 && st(s).indep < 42 },
  { id: 'workaholic', emoji: '💼', tone: 'bitter', title: '대기업 과장님', text: '연봉은 높고 눈 밑은 검다. 점심은 책상에서 에너지바.', later: '번아웃으로 쉬던 날, 오랜만에 엄마아빠 도시락을 먹고 울었다.', hint: '{c}가 웃는 걸 본 지 오래됐다.', test: (s) => st(s).smarts >= 56 && st(s).happy < 56 },
  { id: 'married', emoji: '💍', tone: 'happy', title: '스물넷의 결혼', text: '그때 그 연애 상대와 결혼했다. 신혼집 첫 살림은 도시락통 세트.', later: '손주가 생겼다. 도시락 2인분이 3인분이 됐다.', hint: '{c}의 휴대폰 배경 화면이 늘 같은 사람이다.', test: (s) => f(s, 'couple') >= 2 && st(s).bond >= 45 && st(s).happy >= 50 },
  { id: 'hanryang', emoji: '🏖️', tone: 'twisted', title: '인생은 즐기는 것', text: '하고 싶은 건 다 해 봤다. 통장 잔고만 즐겁지 않다.', later: '마흔에 귤 농장을 차렸다. 의외로 잘된다.', hint: '{c}는 늘 즐겁다. 걱정이 없어서 걱정이다.', test: (s) => st(s).happy >= 70 && st(s).smarts < 38 && st(s).indep < 55 },
  { id: 'civil', emoji: '🏢', tone: 'happy', title: '칼퇴하는 공무원', text: '6시 땡 하면 부모님 집에서 저녁. 평범함이 이렇게 어려운 거였다.', later: '구청 점심시간, 동료들이 묻는다. "그 반찬 어디서 사요?"', hint: '{c}는 무난하게, 차근차근 해낸다.', test: (s) => st(s).smarts >= 50 && st(s).indep >= 45 && st(s).happy >= 45 && st(s).bond >= 40 },
  { id: 'jobless', emoji: '🪑', tone: 'bitter', title: '취준 3년 차', text: '이력서는 50장째. 이제 도시락은 내가 싸서 도서관에 간다.', later: '서른, 작은 회사에 붙었다. 첫 월급으로 부모님께 도시락을 샀다.', hint: '{c}가 뭘 하고 싶은지 아직 모르겠다고 한다.', test: (s) => st(s).indep < 42 && st(s).happy < 48 },
  { id: 'happy', emoji: '☀️', tone: 'happy', title: '평범하지만 행복한 어른', text: '특별하진 않아도 매일이 괜찮다. 그거면 충분하다.', later: '가끔 전화가 온다. "그냥, 생각나서."', hint: '{c}는 요즘 잘 웃는다.', test: (s) => st(s).happy >= 68 && st(s).bond >= 50 },
  { id: 'tired', emoji: '🫠', tone: 'bitter', title: '조금 지친 어른', text: '어른이 되는 건 생각보다 어렵다. 그래도 가끔 도시락 냄새가 그립다.', later: '지친 날이면 본가에 와서 말없이 밥을 먹고 간다. 그걸로 됐다.', hint: '{c}의 표정이 어딘가 지쳐 보인다.', test: () => true },
];

export const ENDINGS: Ending[] = [...EARLY, ...FINAL];
export const ENDING_BY_ID: Record<string, Ending> = Object.fromEntries(ENDINGS.map((e) => [e.id, e]));

/** 스무 살 엔딩 */
export const decideEnding = (s: GameState): Ending => FINAL.find((e) => e.test(s))!;
/** 올해 결산 뒤 바로 끝나는 조기 엔딩 */
export const earlyEnding = (s: GameState): Ending | undefined => EARLY.find((e) => s.age >= e.early!.min && s.age <= e.early!.max && e.test(s));
/** 결산 경고: 조기 엔딩이 다가오고 있다 */
export const earlyWarning = (s: GameState): Ending | undefined => EARLY.find((e) => s.age + 1 >= e.early!.min && s.age <= e.early!.max && (e.warn?.(s) ?? false) && !e.test(s));
