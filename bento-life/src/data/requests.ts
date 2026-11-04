// 아침 요청(그날의 상황) 데이터. 아이는 7살 말투(어린 아이) / 15살 말투(사춘기) 두 가지로 말한다.
// minAge: 이 나이부터 나오는 요청
import type { Ingredient, Slot, Tag } from '../game/types.ts';

export type Age = 7 | 15;
export type Sel = Record<Slot, string>;
export interface Ctx { age: Age; likes: Tag[]; dislikes: string[]; yesterday?: Sel }
export interface Request {
  id: string;
  /** 이 나이부터 등장 */
  minAge: number; emoji: string; day: string; say: Record<Age, string>;
  /** 0~2: 요청을 얼마나 맞췄나 */
  judge: (items: Ingredient[], c: Ctx) => number;
  /** 못 맞췄을 때 아이가 저녁에 하는 말 (다음에 쓸 힌트) */
  miss: Record<Age, string>;
  ok: Record<Age, string>;
  ages: Age[];
}
export const sum = (items: Ingredient[], k: 'fitness' | 'smarts' | 'health' | 'happy') => items.reduce((a, i) => a + Math.max(0, i.stats[k] ?? 0), 0);
export const has = (items: Ingredient[], t: Tag) => items.some((i) => i.tags.includes(t));
export const appeal = (items: Ingredient[]) => items.reduce((a, i) => a + i.appeal, 0);

export const REQUESTS: Request[] = [
  { id: 'pe', minAge: 4, emoji: '🏃', day: '체육 있는 날', ages: [7, 15],
    say: { 7: '오늘 체육 있어! 힘나는 거 싸 줘!', 15: '오늘 체육 두 시간 연속이래.' },
    judge: (it) => (sum(it, 'fitness') >= 5 ? 2 : sum(it, 'fitness') >= 3 ? 1 : 0),
    ok: { 7: '고기 먹고 달리기 1등 했어!', 15: '덕분에 안 쓰러지고 버텼다.' },
    miss: { 7: '체육 시간에 배고파서 힘들었어… 고기 같은 거 넣어 주지.', 15: '체육 끝나고 배고파 죽는 줄. 단백질 좀.' } },
  { id: 'test', minAge: 7, emoji: '📝', day: '시험날', ages: [7, 15],
    say: { 7: '받아쓰기 시험이야… 머리 좋아지는 거!', 15: '오늘 시험이야. 졸리면 끝이야.' },
    judge: (it) => (has(it, '두뇌') || sum(it, 'smarts') >= 3 ? 2 : sum(it, 'smarts') >= 1 ? 1 : 0),
    ok: { 7: '생선 먹어서 그런가 다 맞았어!', 15: '머리가 맑았어. 잘 본 것 같아.' },
    miss: { 7: '시험 볼 때 머리가 멍했어… 생선이나 견과류 먹으면 좋대.', 15: '점심 먹고 졸려서 망함. 생선 같은 게 낫대.' } },
  { id: 'swap', minAge: 5, emoji: '🔄', day: '반찬 교환의 날', ages: [7, 15],
    say: { 7: '친구랑 반찬 바꿔 먹기로 했어! 인기 많은 걸로!', 15: '애들이 도시락 구경한대. 이상한 거 싸지 마.' },
    judge: (it) => (appeal(it) >= 6 ? 2 : appeal(it) >= 3 ? 1 : 0),
    ok: { 7: '내 반찬 제일 먼저 없어졌어!', 15: '애들이 다 한 입씩 뺏어 먹음. ㅋ' },
    miss: { 7: '아무도 안 바꿔 줬어… 소시지나 돈까스 같은 거!', 15: '아무도 안 쳐다봄. 다음엔 좀 인기 있는 걸로.' } },
  { id: 'tummy', minAge: 2, emoji: '🤢', day: '배탈 기운', ages: [7, 15],
    say: { 7: '배가 좀 아파…', 15: '어제부터 속이 안 좋아.' },
    judge: (it) => (has(it, '매운') || has(it, '튀김') || has(it, '정크') ? 0 : it.some((i) => ['porridge', 'tofu', 'banana', 'udon', 'rice', 'whitefish', 'pumpkin'].includes(i.id)) ? 2 : 1),
    ok: { 7: '부드러운 거라 배가 안 아팠어.', 15: '속 편했어. 고마워.' },
    miss: { 7: '먹고 나서 배가 더 아팠어… 맵거나 튀긴 건 싫어.', 15: '기름진 거 먹고 하루 종일 고생함.' } },
  { id: 'picnic', minAge: 4, emoji: '🧺', day: '소풍날', ages: [7],
    say: { 7: '오늘 소풍이야!! 소풍엔 뭐 먹는지 알지?', 15: '' },
    judge: (it) => (it[0].id === 'gimbap' ? 2 : it[0].id === 'riceball' ? 1 : 0),
    ok: { 7: '돗자리에서 김밥 먹었어! 최고의 소풍!', 15: '' },
    miss: { 7: '다들 김밥 싸 왔는데 나만 아니었어…', 15: '' } },
  { id: 'spicy', minAge: 13, emoji: '🌶️', day: '매운 게 당기는 날', ages: [15],
    say: { 7: '', 15: '아 매운 거 땡긴다.' },
    judge: (it) => (has(it, '매운') ? 2 : 0),
    ok: { 7: '', 15: '이거지. 스트레스 풀렸다.' },
    miss: { 7: '', 15: '매운 거 먹고 싶다니까… 제육이나 김치라도.' } },
  { id: 'diet', minAge: 14, emoji: '🥗', day: '다이어트 선언', ages: [15],
    say: { 7: '', 15: '나 다이어트 할 거야. 진짜로.' },
    judge: (it, c) => (has(it, '정크') || has(it, '튀김') ? 0 : has(it, '채소') ? (it.some((i) => i.tags.some((t) => c.likes.includes(t))) ? 2 : 1) : 0),
    ok: { 7: '', 15: '건강한데 맛있네? 이건 계속 먹을 수 있어.' },
    miss: { 7: '', 15: '다이어트 한다니까 왜… 아니면 채소만 있어서 너무 맛없었거나.' } },
  { id: 'whatever', minAge: 13, emoji: '🤷', day: '사춘기', ages: [15],
    say: { 7: '', 15: '…아무거나.' },
    judge: (it, c) => (it.some((i) => i.tags.some((t) => c.likes.includes(t))) && !it.some((i) => c.dislikes.includes(i.id)) ? 2 : 0),
    ok: { 7: '', 15: '…맛있었어. (아무거나가 아니었다)' },
    miss: { 7: '', 15: '…. (아무거나는 아무거나가 아니었다. 좋아하는 걸 원했던 것 같다)' } },
  { id: 'again', minAge: 3, emoji: '🔁', day: '어제 그거', ages: [7, 15],
    say: { 7: '어제 그 반찬 또 먹고 싶어!', 15: '어제 그 메인, 또 해 줘.' },
    judge: (it, c) => (c.yesterday && it[1].id === c.yesterday.main ? 2 : 0),
    ok: { 7: '또 먹어도 맛있어!', 15: '역시.' },
    miss: { 7: '어제 거랑 달라… 어제 메인 반찬이 좋았는데.', 15: '어제 거 해 달라니까.' } },
  { id: 'rain', minAge: 2, emoji: '🌧️', day: '비 오는 날', ages: [7, 15],
    say: { 7: '비 와서 추워… 따뜻한 거!', 15: '비 오니까 국물 땡긴다.' },
    judge: (it) => (['udon', 'porridge'].includes(it[0].id) ? 2 : it[1].id === 'bulgogi' || it[1].id === 'jeyuk' ? 1 : 0),
    ok: { 7: '따끈해서 몸이 녹았어!', 15: '국물 최고.' },
    miss: { 7: '도시락이 다 식어서 추웠어… 우동 같은 거!', 15: '비 오는 날엔 국물이지…' } },
];


/** 나이 → 말투 그룹 (어린 아이 7 / 사춘기 15) */
export const voiceAge = (age: number): Age => (age < 10 ? 7 : 15);

export const REQUEST_BY_ID: Record<string, Request> = Object.fromEntries(REQUESTS.map((r) => [r.id, r]));

/** 그 나이에 나올 수 있는 요청 */
export const requestsFor = (age: number): Request[] => REQUESTS.filter((r) => age >= r.minAge && r.ages.includes(voiceAge(age)));
