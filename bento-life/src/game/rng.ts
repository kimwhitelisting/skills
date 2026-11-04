/** mulberry32 — 상태를 GameState.rng에 저장해 저장/불러오기 후에도 재현 가능 */
export function rand(s: { rng: number }): number {
  s.rng = (s.rng + 0x6d2b79f5) | 0;
  let t = s.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const chance = (s: { rng: number }, p: number) => rand(s) < p;
export const randInt = (s: { rng: number }, min: number, max: number) =>
  min + Math.floor(rand(s) * (max - min + 1));
export const pick = <T>(s: { rng: number }, arr: readonly T[]): T => arr[Math.floor(rand(s) * arr.length)];

export function pickN<T>(s: { rng: number }, arr: readonly T[], n: number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rand(s) * pool.length), 1)[0]);
  return out;
}

export function pickWeighted<T>(s: { rng: number }, items: readonly T[], weight: (t: T) => number): T | undefined {
  const total = items.reduce((a, t) => a + weight(t), 0);
  if (total <= 0) return undefined;
  let r = rand(s) * total;
  for (const t of items) {
    r -= weight(t);
    if (r < 0) return t;
  }
  return items[items.length - 1];
}

export const shuffle = <T>(s: { rng: number }, arr: readonly T[]): T[] => pickN(s, arr, arr.length);
