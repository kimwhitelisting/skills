export type StatKey = 'health' | 'smarts' | 'happy' | 'fitness' | 'social' | 'indep' | 'bond';
export type Stats = Record<StatKey, number>;
export type Delta = Partial<Stats>;

export type Slot = 'base' | 'main' | 'side';
export type MealTime = 'breakfast' | 'lunch' | 'dinner';
export type FollowLevel = 0 | 1 | 2;

export type Tag =
  | '탄수' | '단백질' | '채소' | '과일' | '고기' | '생선' | '우유'
  | '달콤' | '매운' | '정크' | '튀김' | '두뇌' | '칼슘' | '발효' | '면' | '건강';

export interface Ingredient {
  id: string;
  slot: Slot;
  name: string;
  emoji: string;
  minAge: number;
  maxAge: number;
  cost: number;
  stats: Delta;
  tags: Tag[];
  /** 아이들 사이 인기도 (-3~3). 점심 도시락 사회성에 영향 */
  appeal: number;
  /** 메뉴 이름 조합용 조각 (기본값: name) */
  frag?: string;
  /** base 전용: 메뉴 이름의 요리 형태 (예: 김밥, 샌드위치) */
  dish?: string;
}

export interface Menu {
  key: string;
  base: string;
  main: string;
  side: string;
  name: string;
  signature?: boolean;
  desc?: string;
  bonus?: Delta;
  flags?: Record<string, number>;
}

export type Talent = 'sport' | 'study' | 'art' | 'cook' | 'people';
export type Gender = 'boy' | 'girl';

export interface Child {
  name: string;
  gender: Gender;
  nameOptions: string[];
  likes: Tag[];
  dislikes: string[];
  talent: Talent;
  known: { likes: Tag[]; dislikes: string[]; talent: boolean };
}

export type Step = 'milestone' | 'follow' | MealTime | 'random' | 'summary' | 'ending';

export interface LogEntry { age: number; text: string }

export interface GameState {
  version: 1;
  rng: number;
  age: number;
  step: Step;
  child: Child;
  stats: Stats;
  money: number;
  follow: FollowLevel;
  flags: Record<string, number>;
  eventQueue: string[];
  seenEvents: string[];
  recentMenus: string[];
  runMenus: string[];
  lastMeals: Partial<Record<MealTime, string>>;
  /** 가장 최근에 먹인 메뉴 (끼니 수와 무관) */
  lastMenu?: string;
  yearStart: Stats;
  log: LogEntry[];
  /** 이 판의 실험 조정값 (없으면 기본값) */
  tuning?: Partial<import('./config.ts').Tuning>;
  active?: ActiveEvent;
  endingId?: string;
}

/** 화면에 띄운 이벤트 (텍스트 계산은 한 번만 — 부수효과/난수 보호) */
export interface ActiveEvent {
  id: string;
  emoji: string;
  title: string;
  text: string;
  choices: { label: string; enabled: boolean; hint?: string }[];
}

export interface Outcome {
  text: string;
  stats?: Delta;
  money?: number;
  flags?: Record<string, number>;
  apply?: (s: GameState) => void;
}

export interface Requirement {
  followMin?: number;
  followMax?: number;
  money?: number;
  stat?: [StatKey, number];
  flag?: string;
}

export interface Choice {
  label: string;
  requires?: Requirement;
  outcome: Outcome | ((s: GameState) => Outcome);
}

export interface GameEvent {
  id: string;
  kind: 'milestone' | 'random';
  emoji: string;
  age?: number;
  ageMin?: number;
  ageMax?: number;
  weight?: number;
  once?: boolean;
  when?: (s: GameState) => boolean;
  title: string;
  text: string | ((s: GameState) => string);
  choices: Choice[] | ((s: GameState) => Choice[]);
}
