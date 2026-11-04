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

/** 한 해: 나이별 이벤트 → 하루(들) → 랜덤 이벤트 → 결산 → (19살 이후) 엔딩 */
export type Step = 'milestone' | 'day' | 'random' | 'summary' | 'ending';

/** 배웅 방식: 믿고 보내기 / 같이 가기(2~5살) / 몰래 따라가기(6살~) */
export type LeaveChoice = 'trust' | 'escort' | 'follow';
/** 아침 도시락을 본 아이의 기분 → 등굣길에 뒤돌아보는 빈도 */
export type KidMood = 'happy' | 'neutral' | 'grumpy';

/** 등굣길 미니게임 결과 (화면 쪽에서 넘겨준다) */
export interface CommuteResult {
  over: 'school' | 'caught' | 'lost';
  delivered: boolean;
  score: number;
  bond: number;
  indep: number;
  happy: number;
  moment?: string;
  log?: string[];
}

/** 아침에 싼 도시락의 결과 */
export interface PackResult {
  meal: import('./bento.ts').MealResult;
  sel: { base: string; main: string; side: string };
  /** 점심 별점 0~3 */
  lunch: number;
  /** 요청 점수 0~2 (요청 없는 날은 undefined) */
  reqScore?: number;
  liked?: string;
  disliked?: string;
  late: boolean;
  mood: KidMood;
}

export interface Evening {
  lunch: number;
  /** 아이가 저녁에 하는 말 */
  says: string[];
  /** 그날 있었던 일 (내레이션) */
  extra: string[];
  /** 그날 하루 전체 스탯 변화 (도시락 + 배웅 + 점심) */
  delta: Delta;
}

export interface Today {
  reqs: string[];
  forgot: boolean;
  /** 아침에 띄울 알림 (할머니 찬스 등) */
  notice?: string;
  phase: 'morning' | 'leave' | 'commute' | 'evening';
  pack?: PackResult;
  leave?: LeaveChoice;
  commute?: CommuteResult;
  evening?: Evening;
}

/** 앨범 한 칸 (하루 기록) */
export interface DayRecord { age: number; menu: string; lunch: number; leave?: LeaveChoice; over?: CommuteResult['over']; moment?: string }

export interface LogEntry { age: number; text: string }

export interface GameState {
  version: 2;
  rng: number;
  age: number;
  step: Step;
  child: Child;
  stats: Stats;
  money: number;
  /** 가장 최근 배웅 방식 (0 믿고 보내기 · 1 같이 가기 · 2 따라가기) — 이벤트 조건에 쓰인다 */
  follow: FollowLevel;
  /** 올해 몇 번째 날인지 */
  dayIndex: number;
  today?: Today;
  /** 어제 도시락 ("어제 그거" 요청용) */
  lastSel?: { base: string; main: string; side: string };
  /** 등굣길에서 모은 하트 합계 */
  hearts: number;
  /** 사춘기 경계심 0~0.4: 따라갈수록 쌓이고, 믿고 보내면 풀린다 */
  vigilance: number;
  album: DayRecord[];
  flags: Record<string, number>;
  eventQueue: string[];
  seenEvents: string[];
  recentMenus: string[];
  runMenus: string[];
  lastMeals: Partial<Record<MealTime, string>>;
  /** 가장 최근에 먹인 메뉴 (끼니 수와 무관) */
  lastMenu?: string;
  yearStart: Stats;
  /** 하트 상점에서 산 것 (이야기 꾸러미 등) — 판 시작과 살 때 채워진다 */
  unlocks?: string[];
  /** 지금 입고 있는 옷 색·모자 (상점 id) */
  wear?: string[];
  /** 올해 초에 알고 있던 취향 (결산의 "올해 알게 된 것") */
  yearKnown?: { likes: string[]; dislikes: string[]; talent: boolean };
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
  /** 하트 상점에서 이 물건을 사야 나오는 이벤트 (이야기 꾸러미) */
  shop?: string;
  /** 이 모자/옷을 입고 있어야 나오는 이벤트 */
  wear?: string;
  title: string;
  text: string | ((s: GameState) => string);
  choices: Choice[] | ((s: GameState) => Choice[]);
}
