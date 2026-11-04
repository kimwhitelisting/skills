// 밸런스 리포트: npx vitest run tests/balance.report.test.ts  (또는 npm run balance)
import { it } from 'vitest';
import { STAT_KEYS } from '../src/game/constants.ts';
import { ENDINGS } from '../src/game/endings.ts';
import { playthrough, type Policy } from './sim.ts';

it('balance report', () => {
  for (const policy of ['random', 'balanced', 'helicopter', 'focus:smarts', 'focus:fitness', 'focus:social', 'focus:bond'] as Policy[]) {
    const N = policy.startsWith('focus') ? 12 : 400;
    const sum: Record<string, number> = {};
    const end: Record<string, number> = {};
    let menus = 0, cook = 0, art = 0;
    for (let seed = 1; seed <= N; seed++) {
      const s = playthrough(seed * 7 + 1, policy);
      for (const k of STAT_KEYS) sum[k] = (sum[k] ?? 0) + s.stats[k] / N;
      end[s.endingId!] = (end[s.endingId!] ?? 0) + 1;
      menus += s.runMenus.length / N; cook += (s.flags.cook ?? 0) / N; art += (s.flags.art ?? 0) / N;
    }
    console.log(`\n[${policy}] avg stats`, STAT_KEYS.map((k) => `${k}=${Math.round(sum[k])}`).join(' '),
      `menus=${menus.toFixed(1)} cook=${cook.toFixed(2)} art=${art.toFixed(2)}`,
      '\n endings', ENDINGS.map((e) => `${e.id}:${end[e.id] ?? 0}`).join(' '));
  }
});
