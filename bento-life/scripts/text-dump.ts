// 게임 안의 모든 글을 한 파일로 뽑는다 (문장 점검용):  npm run text:dump → art-src/text-dump.md
// 이벤트는 받침 있는 이름(민준)·없는 이름(서아), 스탯 높음/낮음 상태로 각각 돌려 갈래 문장까지 모은다
import { writeFileSync } from 'node:fs';
import { EVENTS } from '../src/data/events.ts';
import { REQUESTS } from '../src/data/requests.ts';
import { ENDINGS } from '../src/game/endings.ts';
import { newGame } from '../src/game/state.ts';
import { fmt } from '../src/game/text.ts';
import type { GameEvent, GameState, StatKey } from '../src/game/types.ts';

const STATS: StatKey[] = ['health', 'happy', 'social', 'smarts', 'fitness', 'indep', 'bond'];
function state(name: string, gender: 'boy' | 'girl', age: number, level: number): GameState {
  const s = newGame(7);
  s.child.name = name; s.child.gender = gender; s.age = age;
  for (const k of STATS) s.stats[k] = level;
  s.lastMenu = undefined;
  return s;
}
const variants = (age: number) => [state('서아', 'girl', age, 75), state('민준', 'boy', age, 25)];
const out: string[] = ['# 게임 글 모음', ''];
const seen = new Set<string>();
const line = (t: string) => { if (!seen.has(t)) { seen.add(t); out.push(t); } };
for (const e of EVENTS as GameEvent[]) {
  const age = e.age ?? e.ageMin ?? 6;
  out.push(`## ${e.id} — ${e.emoji} ${e.title}  (코드 나이 ${e.age ?? `${e.ageMin ?? 0}~${e.ageMax ?? 19}`}${e.shop ? ` · 상점 ${e.shop}` : ''})`);
  seen.clear();
  for (const s of variants(age)) {
    try {
      line(`> ${fmt(typeof e.text === 'function' ? e.text(s) : e.text, s).replaceAll('\n', ' / ')}`);
      const cs = typeof e.choices === 'function' ? e.choices(s) : e.choices;
      for (const c of cs) {
        const o = typeof c.outcome === 'function' ? c.outcome(s) : c.outcome;
        line(`- [${fmt(c.label, s)}] → ${fmt(o.text, s).replaceAll('\n', ' / ')}`);
      }
    } catch (err) { line(`!! ${String(err)}`); }
  }
  out.push('');
}
out.push('# 엔딩', '');
for (const e of ENDINGS) {
  const s = state('서아', 'girl', 19, 50), b = state('민준', 'boy', 19, 50);
  out.push(`## ${e.id} — ${e.emoji} ${e.title} (${e.tone}${e.early ? ` · ${e.early.min}~${e.early.max}` : ''})`);
  out.push(`> ${fmt(e.text, s)}`, `> (민준) ${fmt(e.text, b)}`, `- 힌트: ${fmt(e.hint, s)}`);
  if (e.later) out.push(`- 10년 후: ${fmt(e.later, s)}`);
  out.push('');
}
out.push('# 아침 요청', '');
for (const r of REQUESTS) out.push(`- ${r.id} (${r.minAge}~, ${r.ages.join('/')}) ${JSON.stringify(r).slice(0, 400)}`);
writeFileSync(new URL('../art-src/text-dump.md', import.meta.url), out.join('\n'));
console.log('art-src/text-dump.md', out.length, '줄');
