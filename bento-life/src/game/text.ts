import { callName, vocative } from './korean.ts';
import type { GameState } from './types.ts';

/**
 * 텍스트 템플릿
 *  {c}    부르는 이름 (민준이 / 서아) — 뒤에는 항상 받침 없는 조사(가/는/를/와)를 쓴다
 *  {v}    호격 (민준아 / 서아야)
 *  {name} 이름 그대로
 *  {kind} 아들 / 딸
 */
export function fmt(text: string, s: GameState): string {
  const { name, gender } = s.child;
  return text
    .replaceAll('{c}', callName(name))
    .replaceAll('{v}', vocative(name))
    .replaceAll('{name}', name)
    .replaceAll('{kind}', gender === 'boy' ? '아들' : '딸');
}
