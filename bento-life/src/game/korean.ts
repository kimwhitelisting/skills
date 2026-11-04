/** 한국어 조사 처리 */
export function hasBatchim(word: string): boolean {
  const c = word.charCodeAt(word.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return false;
  return (c - 0xac00) % 28 !== 0;
}

const isRieul = (word: string) => {
  const c = word.charCodeAt(word.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 === 8;
};

export type JosaPair = '이/가' | '은/는' | '을/를' | '과/와' | '아/야' | '으로/로' | '이랑/랑';

export function josa(word: string, pair: JosaPair): string {
  const [withB, withoutB] = pair.split('/');
  if (pair === '으로/로') return word + (hasBatchim(word) && !isRieul(word) ? withB : withoutB);
  return word + (hasBatchim(word) ? withB : withoutB);
}

/** 부르는 이름: "민준" → "민준이", "서아" → "서아" (항상 받침 없이 끝남) */
export const callName = (name: string) => (hasBatchim(name) ? name + '이' : name);
/** 호격: "민준아", "서아야" */
export const vocative = (name: string) => josa(name, '아/야');
