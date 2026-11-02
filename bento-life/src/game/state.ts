import { DEFAULT_TUNING, type Tuning } from './config.ts';
import { NAMES, START_MONEY, START_STATS } from './constants.ts';
import { pick, pickN } from './rng.ts';
import type { GameState, Gender, Tag, Talent } from './types.ts';
import { INGREDIENTS } from '../data/ingredients.ts';

const LIKE_POOL: Tag[] = ['달콤', '고기', '생선', '채소', '과일', '면', '매운', '튀김'];
const TALENTS: Talent[] = ['sport', 'study', 'art', 'cook', 'people'];

export function newGame(seed = Math.floor(Math.random() * 2 ** 31), tuning?: Partial<Tuning>): GameState {
  const s = { rng: seed } as GameState;
  const gender: Gender = pick(s, ['boy', 'girl'] as const);
  const nameOptions = pickN(s, NAMES[gender], 3);
  const likes = pickN(s, LIKE_POOL, 2);
  // 좋아하는 맛과 겹치는 재료는 싫어하지 않는다 (모순 방지)
  const dislikePool = INGREDIENTS.filter((i) => i.slot !== 'base' && i.appeal <= 1 && !i.tags.some((t) => likes.includes(t))).map((i) => i.id);
  Object.assign(s, {
    version: 1,
    age: 0,
    step: 'milestone',
    child: {
      name: nameOptions[0],
      gender,
      nameOptions,
      likes,
      dislikes: pickN(s, dislikePool, 2),
      talent: pick(s, TALENTS),
      known: { likes: [], dislikes: [], talent: false },
    },
    stats: { ...START_STATS },
    money: START_MONEY,
    follow: 1,
    flags: {},
    eventQueue: [],
    seenEvents: [],
    recentMenus: [],
    runMenus: [],
    lastMeals: {},
    tuning: { ...DEFAULT_TUNING, ...tuning },
    yearStart: { ...START_STATS },
    log: [],
  } satisfies Omit<GameState, 'rng'>);
  return s;
}
