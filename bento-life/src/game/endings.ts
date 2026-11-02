import type { GameState } from './types.ts';

export interface Ending { id: string; emoji: string; title: string; text: string; test: (s: GameState) => boolean }

const st = (s: GameState) => s.stats;

/** 위에서부터 먼저 만족하는 엔딩 하나가 선택된다 */
export const ENDINGS: Ending[] = [
  { id: 'kangaroo', emoji: '🦘', title: '평생 도시락 받는 어른', text: '서른이 되어도 매일 아침 도시락을 받으러 온다. …이게 맞나?', test: (s) => st(s).indep < 25 },
  { id: 'chef', emoji: '👨‍🍳', title: '스타 셰프', text: '"제 요리의 뿌리는 부모님의 도시락입니다." 첫 레스토랑 메뉴판 1번은 그 도시락이었다.', test: (s) => (s.flags.cook ?? 0) >= 3 && s.runMenus.length >= 30 },
  { id: 'doctor', emoji: '🩺', title: '명의', text: '환자들에게 늘 말한다. "밥은 꼭 챙겨 드세요."', test: (s) => st(s).smarts >= 80 && st(s).health >= 60 },
  { id: 'athlete', emoji: '🥇', title: '국가대표', text: '금메달 인터뷰: "도시락 덕분입니다!" 전국에 도시락 열풍이 불었다.', test: (s) => st(s).fitness >= 75 && st(s).health >= 60 },
  { id: 'star', emoji: '🌟', title: '모두의 인기인', text: '어딜 가나 사람이 모인다. 점심시간 반찬 교환 시장에서 배운 협상력 덕분일지도.', test: (s) => st(s).social >= 80 && st(s).happy >= 60 },
  { id: 'artist', emoji: '🎨', title: '예술가', text: '첫 개인전의 제목은 「도시락 뚜껑을 열 때」.', test: (s) => (s.flags.art ?? 0) >= 3 && st(s).happy >= 55 },
  { id: 'scholar', emoji: '🔬', title: '연구자', text: '밤새 연구실에 있어도 견과류 한 봉지는 꼭 챙긴다.', test: (s) => st(s).smarts >= 75 },
  { id: 'traveler', emoji: '🌍', title: '세계 여행가', text: '엽서가 온다. "여기 도시락은 엄마아빠 것만 못해."', test: (s) => st(s).indep >= 80 && st(s).happy >= 55 },
  { id: 'bestie', emoji: '🤗', title: '부모와 베스트 프렌드', text: '독립해서도 주말마다 같이 장을 본다. 이번엔 아이가 도시락을 싸 준다.', test: (s) => st(s).bond >= 80 && st(s).indep >= 40 },
  { id: 'fragile', emoji: '🤧', title: '잔병치레 어른', text: '맛있는 건 많이 먹었는데… 비타민은 챙겨 먹자.', test: (s) => st(s).health < 30 },
  { id: 'happy', emoji: '☀️', title: '평범하지만 행복한 어른', text: '특별하진 않아도 매일이 괜찮다. 그거면 충분하다.', test: (s) => st(s).happy >= 65 },
  { id: 'tired', emoji: '🫠', title: '조금 지친 어른', text: '어른이 되는 건 생각보다 어렵다. 그래도 가끔 도시락 냄새가 그립다.', test: () => true },
];

export const ENDING_BY_ID: Record<string, Ending> = Object.fromEntries(ENDINGS.map((e) => [e.id, e]));
export const decideEnding = (s: GameState): Ending => ENDINGS.find((e) => e.test(s))!;
