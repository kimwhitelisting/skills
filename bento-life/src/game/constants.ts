import type { FollowLevel, MealTime, StatKey, Stats, Talent } from './types.ts';

export const FINAL_AGE = 19;

export const STAT_INFO: Record<StatKey, { label: string; emoji: string }> = {
  health: { label: '건강', emoji: '❤️' },
  smarts: { label: '지능', emoji: '📘' },
  happy: { label: '행복', emoji: '😊' },
  fitness: { label: '체력', emoji: '💪' },
  social: { label: '사회성', emoji: '🤝' },
  indep: { label: '자립심', emoji: '🦋' },
  bond: { label: '유대감', emoji: '💞' },
};
export const STAT_KEYS = Object.keys(STAT_INFO) as StatKey[];

export const START_STATS: Stats = { health: 50, smarts: 20, happy: 60, fitness: 25, social: 20, indep: 5, bond: 50 };
export const START_MONEY = 30;

export const TALENT_INFO: Record<Talent, { label: string; stat: StatKey }> = {
  sport: { label: '운동', stat: 'fitness' },
  study: { label: '공부', stat: 'smarts' },
  art: { label: '예술', stat: 'happy' },
  cook: { label: '요리', stat: 'health' },
  people: { label: '사람', stat: 'social' },
};

export const NAMES: Record<'boy' | 'girl', string[]> = {
  boy: ['민준', '서준', '도윤', '하준', '은우', '시우', '지호', '이안', '선우', '유준', '건우', '우진'],
  girl: ['서아', '하윤', '지안', '하린', '이서', '지우', '아린', '서윤', '채아', '수아', '유나', '다인'],
};

export interface Stage { id: string; name: string; min: number; max: number; avatar: [string, string]; meals: Record<MealTime, string> }

export const STAGES: Stage[] = [
  { id: 'infant', name: '영아기', min: 0, max: 1, avatar: ['👶', '👶'], meals: { breakfast: '아침 이유식', lunch: '점심 이유식', dinner: '저녁 이유식' } },
  { id: 'toddler', name: '유아기', min: 2, max: 6, avatar: ['🧒', '🧒'], meals: { breakfast: '아침밥', lunch: '점심 도시락', dinner: '저녁밥' } },
  { id: 'child', name: '초등학생', min: 7, max: 12, avatar: ['👦', '👧'], meals: { breakfast: '등교 전 아침', lunch: '학교 도시락', dinner: '저녁밥' } },
  { id: 'teen', name: '중학생', min: 13, max: 15, avatar: ['🧑', '👩'], meals: { breakfast: '등교 전 아침', lunch: '학교 도시락', dinner: '학원 가기 전 저녁' } },
  { id: 'high', name: '고등학생', min: 16, max: 18, avatar: ['🧑', '👩'], meals: { breakfast: '0교시 아침', lunch: '학교 도시락', dinner: '야자 도시락' } },
  { id: 'adult', name: '스무 살 문턱', min: 19, max: 99, avatar: ['🧑‍🎓', '👩‍🎓'], meals: { breakfast: '마지막 아침', lunch: '마지막 도시락', dinner: '집밥' } },
];
export const stageOf = (age: number) => STAGES.find((s) => age >= s.min && age <= s.max)!;

export const MEAL_TIMES: MealTime[] = ['breakfast', 'lunch', 'dinner'];
export const MEAL_EMOJI: Record<MealTime, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' };

export interface FollowOption { level: FollowLevel; title: string; emoji: string; desc: (age: number) => string }
export const FOLLOW_OPTIONS: FollowOption[] = [
  { level: 0, emoji: '🏠', title: '믿고 보내기', desc: () => '도시락만 들려 보낸다. 자립심이 쑥쑥, 대신 사고가 나도 모른다.' },
  { level: 1, emoji: '🔭', title: '멀찍이 지켜보기', desc: () => '눈에 안 띄게 한 발짝 뒤에서. 적당한 균형.' },
  {
    level: 2, emoji: '🍱', title: '도시락 싸들고 졸졸',
    desc: (age) => (age < 10 ? '따끈한 도시락을 직접 배달! 유대감 상승, 사고 예방.'
      : age < 13 ? '아직은 반가워한다… 아마도. 친구들 시선이 조금 신경 쓰이는 나이.'
        : '"제발 학교에 오지 마…" 사춘기 아이에게는 치명적일 수 있다.'),
  },
];
