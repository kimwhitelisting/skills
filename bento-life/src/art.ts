/**
 * 일러스트 연결부.
 * src/assets/art/ 아래에 정해진 이름으로 파일을 넣으면 자동으로 게임에 반영되고,
 * 파일이 없으면 이모지로 대신 표시된다. 파일 이름 규칙은 docs/art-assets.csv 참고.
 */
import { stageOf } from './game/constants.ts';
import type { GameState } from './game/types.ts';

const files = import.meta.glob<string>('./assets/art/**/*.{webp,png,jpg,svg}', { eager: true, query: '?url', import: 'default' });

const byName = new Map<string, string>();
for (const [path, url] of Object.entries(files)) {
  const name = path.replace('./assets/art/', '').replace(/\.(webp|png|jpg|svg)$/, '');
  if (!byName.has(name) || path.endsWith('.webp')) byName.set(name, url); // 같은 이름이면 webp 우선
}

export type Expression = 'neutral' | 'happy' | 'sad' | 'yuck';

export const art = (name: string): string | undefined => byName.get(name);

/** 아이 초상화: characters/{시기}-{성별}-{표정}. 해당 표정이 없으면 neutral로 */
export function characterArt(s: GameState, expr: Expression = 'neutral'): string | undefined {
  const base = `characters/${stageOf(s.age).id}-${s.child.gender}`;
  return art(`${base}-${expr}`) ?? art(`${base}-neutral`);
}
export const ingredientArt = (id: string) => art(`ingredients/${id}`);
/** 성별별 그림(events/picnic-girl)이 있으면 우선, 없으면 공용(events/picnic) */
export const eventArt = (id: string, s: GameState) => art(`events/${id}-${s.child.gender}`) ?? art(`events/${id}`);
export const endingArt = (id: string, s: GameState) => art(`endings/${id}-${s.child.gender}`) ?? art(`endings/${id}`);

/** 평소 표정: 행복 스탯 기준 */
export function idleExpression(s: GameState): Expression {
  return s.stats.happy >= 70 ? 'happy' : s.stats.happy < 35 ? 'sad' : 'neutral';
}
