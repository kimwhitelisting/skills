import type { Menu } from '../game/types.ts';

type Signature = Omit<Menu, 'key' | 'base' | 'main' | 'side' | 'signature'> & { combo: [string, string, string] };

/**
 * 특별 메뉴 (시그니처). 자동 생성된 이름을 덮어쓰고 추가 보너스/플래그를 준다.
 * flags는 이벤트 조건에 쓰인다 (예: picnic → 소풍 이벤트 대성공).
 */
export const SIGNATURES: Signature[] = [
  { combo: ['porridge', 'beefpuree', 'pumpkin'], name: '생애 첫 이유식', desc: '숟가락을 꼭 쥐었다.', bonus: { bond: 2, health: 1 } },
  { combo: ['formula', 'whitefish', 'banana'], name: '꿀잠 보장 세트', desc: '먹자마자 새근새근.', bonus: { happy: 2 } },
  { combo: ['gimbap', 'egg', 'spinach'], name: '정석 소풍 김밥', desc: '소풍날 아침의 냄새.', bonus: { social: 2, happy: 2 }, flags: { picnic: 1 } },
  { combo: ['gimbap', 'sausage', 'jelly'], name: '불량 소풍 세트', desc: '어른들은 모르는 행복.', bonus: { happy: 3 }, flags: { picnic: 1 } },
  { combo: ['gimbap', 'bulgogi', 'potato'], name: '반 전체가 부러워한 김밥', desc: '뚜껑을 열자 함성이.', bonus: { social: 3 }, flags: { picnic: 1 } },
  { combo: ['rice', 'bulgogi', 'kimchi'], name: 'K-불고기 정식', desc: '외국인 친구도 반했다.', bonus: { happy: 2, bond: 1 } },
  { combo: ['rice', 'egg', 'kimchi'], name: '야매 김치계란밥', desc: '냉장고 털이의 정석.', bonus: { happy: 1 }, flags: { cook: 1 } },
  { combo: ['rice', 'tonkatsu', 'potato'], name: '왕돈까스 도시락', desc: '뚜껑이 안 닫힌다.', bonus: { happy: 3 } },
  { combo: ['rice', 'jeyuk', 'kimchi'], name: '야자 필승 제육', desc: '밤 10시를 버티는 힘.', bonus: { fitness: 2, smarts: 1 } },
  { combo: ['multigrain', 'mackerel', 'spinach'], name: '수험생 두뇌 정식', desc: '오메가3가 흐른다.', bonus: { smarts: 3 }, flags: { brain: 1 } },
  { combo: ['multigrain', 'mackerel', 'nuts'], name: '수능 대박 도시락', desc: '찍어도 맞을 것 같다.', bonus: { smarts: 4 }, flags: { brain: 1 } },
  { combo: ['multigrain', 'chicken', 'broccoli'], name: '국가대표 식단', desc: '닭.브.잡의 완성.', bonus: { fitness: 4 } },
  { combo: ['bread', 'egg', 'tomato'], name: '에그 브런치 샌드위치', desc: '카페 감성 한 스푼.', bonus: { happy: 2, social: 1 } },
  { combo: ['bread', 'chicken', 'tomato'], name: '헬스장 닭가슴살 샌드위치', desc: '단백질 30g.', bonus: { fitness: 2 } },
  { combo: ['bread', 'sausage', 'jelly'], name: '편의점 습격 세트', desc: '이게 도시락이라고?', bonus: { happy: 2, health: -1 } },
  { combo: ['udon', 'tofu', 'broccoli'], name: '초록초록 다이어트 우동', desc: '건강한 맛… 이라고 한다.', bonus: { health: 2 } },
  { combo: ['udon', 'bulgogi', 'kimchi'], name: '불고기 볶음우동 특선', desc: '분식집 사장님도 놀랄 맛.', bonus: { happy: 2 }, flags: { cook: 1 } },
  { combo: ['riceball', 'egg', 'anchovy'], name: '할머니표 멸치 주먹밥', desc: '칼슘 듬뿍, 사랑 듬뿍.', bonus: { fitness: 1, bond: 2 } },
];
