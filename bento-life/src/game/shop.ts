/**
 * 하트 상점 — 등굣길에서 모은 ♥로 산다. 지갑과 산 물건은 판이 끝나도 남는다 (도감과 같이 저장).
 *   옷 색 · 모자: 한 번 사면 계속 (입고 벗기 자유)
 *   변장 도구: 등굣길 미니게임에 들고 간다
 *   선물: 지금 키우는 아이에게, 한 해에 한 번씩
 */
import type { HatId } from '../pixel/child.ts';
import type { Delta } from './types.ts';

export type ShopKind = 'story' | 'theme' | 'hat' | 'tool' | 'gift';
export interface ShopItem { id: string; kind: ShopKind; name: string; emoji: string; price: number; desc: string; theme?: [string, string]; hat?: HatId; gift?: Delta }

export const SHOP: ShopItem[] = [
  // 이야기 꾸러미: 사면 새 이벤트가 나오기 시작한다 (산 판부터) — 전용 엔딩이 있는 것도
  { id: 'story-puppy', kind: 'story', name: '강아지 입양', emoji: '🐶', price: 500, desc: '보호소의 강아지 · 산책 당번 · 늙은 강아지 — 엔딩 하나' },
  { id: 'story-piano', kind: 'story', name: '중고 피아노', emoji: '🎹', price: 450, desc: '거실의 피아노 · 발표회 — 엔딩 하나' },
  { id: 'story-garden', kind: 'story', name: '텃밭 화분', emoji: '🌱', price: 300, desc: '베란다 텃밭 — 싫어하던 채소를 먹게 될지도 · 엔딩 하나' },
  { id: 'story-camera', kind: 'story', name: '필름 카메라', emoji: '📷', price: 400, desc: '첫 필름 · 사진 공모전 — 엔딩 하나' },
  { id: 'story-bike', kind: 'story', name: '자전거', emoji: '🚲', price: 250, desc: '보조 바퀴 떼는 날' },
  { id: 'story-camping', kind: 'story', name: '캠핑 장비', emoji: '⛺', price: 350, desc: '주말 캠핑 (여러 번)' },
  { id: 'theme-mint', kind: 'theme', name: '민트 옷', emoji: '🌿', price: 200, desc: '윗옷이 민트색 (교복 시기 빼고)', theme: ['#bfe6cf', '#97cfb0'] },
  { id: 'theme-berry', kind: 'theme', name: '딸기 옷', emoji: '🍓', price: 200, desc: '윗옷이 딸기우유색', theme: ['#f3b6c4', '#e08ea2'] },
  { id: 'theme-sky', kind: 'theme', name: '하늘 옷', emoji: '☁️', price: 200, desc: '윗옷이 하늘색', theme: ['#bcdcf2', '#94c2e3'] },
  { id: 'theme-lemon', kind: 'theme', name: '레몬 옷', emoji: '🍋', price: 250, desc: '윗옷이 레몬색', theme: ['#ffe27a', '#e8c24a'] },
  { id: 'theme-grape', kind: 'theme', name: '포도 옷', emoji: '🍇', price: 300, desc: '윗옷이 포도색', theme: ['#c9a7e0', '#a783c4'] },
  { id: 'theme-tomato', kind: 'theme', name: '토마토 옷', emoji: '🍅', price: 300, desc: '윗옷이 도시락 보자기색', theme: ['#f08a70', '#d0664e'] },
  { id: 'hat-cap', kind: 'hat', name: '빨간 모자', emoji: '🧢', price: 250, desc: '어디서나 쓰고 다닌다', hat: 'cap' },
  { id: 'hat-raincap', kind: 'hat', name: '노란 우비 모자', emoji: '☔', price: 250, desc: '비가 안 와도 쓴다', hat: 'raincap' },
  { id: 'hat-chef', kind: 'hat', name: '요리사 모자', emoji: '👨‍🍳', price: 400, desc: '도시락은 내가 싼다(?)', hat: 'chef' },
  { id: 'hat-shades', kind: 'hat', name: '선글라스', emoji: '🕶️', price: 500, desc: '왠지 삐딱해 보인다', hat: 'shades' },
  { id: 'hat-crown', kind: 'hat', name: '왕관', emoji: '👑', price: 800, desc: '매일이 생일', hat: 'crown' },
  { id: 'tool-news', kind: 'tool', name: '신문지', emoji: '📰', price: 300, desc: '등굣길 한 판에 한 번, 어디서든 2초 숨기' },
  { id: 'tool-pot', kind: 'tool', name: '화분 모자', emoji: '🪴', price: 700, desc: '등굣길에서 멈춰 있으면 의심이 절반만 찬다' },
  { id: 'gift-icecream', kind: 'gift', name: '아이스크림', emoji: '🍦', price: 80, desc: '행복 +2 · 한 해에 한 번', gift: { happy: 2 } },
  { id: 'gift-outing', kind: 'gift', name: '주말 나들이', emoji: '🧺', price: 250, desc: '행복 +3 · 유대감 +3 · 한 해에 한 번', gift: { happy: 3, bond: 3 } },
];
export const SHOP_BY_ID: Record<string, ShopItem> = Object.fromEntries(SHOP.map((i) => [i.id, i]));
/** 등굣길에 넘길 도구 id ('news', 'pot') */
export const toolIds = (owned: string[]) => owned.filter((id) => id.startsWith('tool-')).map((id) => id.slice(5));
