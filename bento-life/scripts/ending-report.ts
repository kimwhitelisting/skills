// 엔딩 분포 리포트 (정책별 자동 플레이): npm run endings
import { ENDINGS } from '../src/game/endings.ts';
import { playthrough, type Policy } from '../tests/sim.ts';
import { SHOP } from '../src/game/shop.ts';
const ALL_SHOP = { unlocks: SHOP.map((i) => i.id), wear: ['hat-chef'] };
const tot: Record<string, number> = {};
const by: Record<string, Record<string, number>> = {};
const policies: (Policy | 'random+shop')[] = ['random', 'balanced', 'helicopter', 'focus:smarts', 'focus:fitness', 'focus:social', 'focus:bond', 'random+shop'];
for (const p of policies) {
  const N = p.startsWith('focus') ? 30 : 1500;
  by[p] = {};
  for (let i = 1; i <= N; i++) { const s = p === 'random+shop' ? playthrough(i * 13 + 7, 'random', undefined, ALL_SHOP) : playthrough(i * 13 + 7, p); tot[s.endingId!] = (tot[s.endingId!] ?? 0) + 1; by[p][s.endingId!] = (by[p][s.endingId!] ?? 0) + 1; }
}
for (const p of policies) console.log(p.padEnd(14), Object.entries(by[p]).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' '));
console.log('\nnever:', ENDINGS.filter((e) => !tot[e.id]).map((e) => e.id).join(', '));
const tone: Record<string, number> = {};
for (const e of ENDINGS) tone[e.tone] = (tone[e.tone] ?? 0) + (tot[e.id] ?? 0);
console.log('tone', tone, 'reached', ENDINGS.filter((e) => tot[e.id]).length, '/', ENDINGS.length);
