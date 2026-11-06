/** Game state only: auth tokens and sync journals use separate stores/keys. */
let prefix = '';
export function accountPrefix(owner?: string): string {
  if (!owner) return '';
  if (!/^[0-9a-f-]{36}$/i.test(owner)) throw Error('Invalid account');
  return `bento-account:${owner}:`;
}
export function configureSaveScope(owner?: string): void { prefix = accountPrefix(owner); }
export const scopedStorage = {
  getItem: (key: string) => localStorage.getItem(prefix + key),
  setItem: (key: string, value: string) => localStorage.setItem(prefix + key, value),
  removeItem: (key: string) => localStorage.removeItem(prefix + key),
  get length(): number {
    if (!prefix) return localStorage.length;
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) if (localStorage.key(i)?.startsWith(prefix)) count++;
    return count;
  },
  key(index: number): string | null {
    if (!prefix) return localStorage.key(index);
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) keys.push(key.slice(prefix.length));
    }
    return keys[index] ?? null;
  },
};
