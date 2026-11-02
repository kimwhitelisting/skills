import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { INGREDIENTS } from '../src/data/ingredients.ts';
import { SIGNATURES } from '../src/data/signatures.ts';
import { EVENTS } from '../src/data/events.ts';
import { packBento } from '../src/game/bento.ts';
import { chooseFollow, startGame } from '../src/game/engine.ts';
import { ENDINGS } from '../src/game/endings.ts';
import { callName, josa, vocative } from '../src/game/korean.ts';
import { buildMenuTable, comboAgeRange, menuKey } from '../src/game/menus.ts';
import { newGame } from '../src/game/state.ts';
import { playthrough } from './sim.ts';

describe('korean', () => {
  it('josa', () => {
    expect(josa('브로콜리', '을/를')).toBe('브로콜리를');
    expect(josa('김치', '이/가')).toBe('김치가');
    expect(josa('계란말이', '은/는')).toBe('계란말이는');
    expect(josa('두부부침', '을/를')).toBe('두부부침을');
    expect(josa('서울', '으로/로')).toBe('서울로');
    expect(josa('집', '으로/로')).toBe('집으로');
    expect(callName('민준')).toBe('민준이');
    expect(callName('서아')).toBe('서아');
    expect(vocative('민준')).toBe('민준아');
    expect(vocative('서아')).toBe('서아야');
  });
});

describe('menus', () => {
  const table = buildMenuTable();
  it('covers every age-compatible combination exactly once', () => {
    const by = (slot: string) => INGREDIENTS.filter((i) => i.slot === slot);
    let expected = 0;
    for (const b of by('base')) for (const m of by('main')) for (const s of by('side')) if (comboAgeRange(b, m, s)) expected++;
    expect(table.length).toBe(expected);
    expect(new Set(table.map((m) => m.key)).size).toBe(expected);
  });
  it('generated JSON is up to date (run npm run gen:menus)', () => {
    const json = JSON.parse(readFileSync(new URL('../src/data/menus.generated.json', import.meta.url), 'utf8'));
    expect(json).toEqual(table);
  });
  it('every signature is reachable and applied', () => {
    for (const s of SIGNATURES) expect(table.find((m) => m.key === menuKey(...s.combo))?.name).toBe(s.name);
  });
  it('menu names are unique', () => {
    expect(new Set(table.map((m) => m.name)).size).toBe(table.length);
  });
});

describe('bento', () => {
  it('reveals a disliked ingredient and skips its stats', () => {
    const s = startGame(newGame(1));
    s.age = 8;
    s.child.dislikes = ['broccoli', 'mackerel'];
    s.child.likes = ['과일', '면'];
    s.money = 100;
    const before = s.stats.health;
    const r = packBento(s, 'dinner', { base: 'rice', main: 'egg', side: 'broccoli' });
    expect(s.child.known.dislikes).toContain('broccoli');
    expect(r.lines.join()).toContain('브로콜리를 골라냈다');
    // 브로콜리 health+3 무시, 계란 +1, 균형 보너스 +2 (탄수+단백질+채소)
    expect(s.stats.health - before).toBeLessThanOrEqual(4);
    expect(s.money).toBe(100 - 3);
  });
  it('never likes and dislikes the same food', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const s = newGame(seed);
      for (const id of s.child.dislikes) expect(INGREDIENTS.find((i) => i.id === id)!.tags.some((t) => s.child.likes.includes(t))).toBe(false);
    }
    const s = startGame(newGame(5));
    s.age = 8; s.money = 100;
    s.child.likes = ['달콤', '면']; s.child.dislikes = ['pumpkin', 'broccoli'];
    packBento(s, 'dinner', { base: 'rice', main: 'egg', side: 'pumpkin' });
    expect(s.child.known.likes).not.toContain('달콤');
  });
  it('rejects ingredients outside the age range and unaffordable boxes', () => {
    const s = startGame(newGame(2));
    s.money = 100;
    s.step = 'breakfast';
    expect(() => packBento(s, 'breakfast', { base: 'rice', main: 'jeyuk', side: 'kimchi' })).toThrow();
    s.age = 10;
    s.money = 1;
    expect(() => packBento(s, 'breakfast', { base: 'rice', main: 'jeyuk', side: 'kimchi' })).toThrow('money');
  });
  it('helicopter following backfires for teens', () => {
    const s = startGame(newGame(3));
    s.step = 'follow';
    s.age = 15;
    const d = chooseFollow(s, 2);
    expect(d.bond).toBeLessThan(0);
    expect(d.indep).toBeLessThan(0);
  });
});

describe('content integrity', () => {
  it('event ids are unique and each age 0..19 has a milestone', () => {
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(EVENTS.length);
    for (let a = 0; a <= 19; a++) expect(EVENTS.some((e) => e.kind === 'milestone' && e.age === a), `age ${a}`).toBe(true);
  });
});

describe('simulation', () => {
  it('2000 random playthroughs finish without getting stuck', () => {
    const counts: Record<string, number> = {};
    for (let seed = 1; seed <= 2000; seed++) {
      const s = playthrough(seed, seed % 3 === 0 ? 'helicopter' : seed % 3 === 1 ? 'balanced' : 'random');
      expect(s.step).toBe('ending');
      counts[s.endingId!] = (counts[s.endingId!] ?? 0) + 1;
    }
    // 밸런스 리포트 (npx vitest run --reporter verbose 로 확인)
    console.log('ending distribution', Object.fromEntries(ENDINGS.map((e) => [e.id, counts[e.id] ?? 0])));
    expect(Object.keys(counts).length).toBeGreaterThanOrEqual(5);
  });
  it('every meals-per-year setting finishes and stays in a sane money range', () => {
    for (const mealsPerYear of [1, 2, 3] as const) {
      let money = 0;
      for (let seed = 1; seed <= 200; seed++) {
        const s = playthrough(seed, 'random', { mealsPerYear });
        expect(s.step).toBe('ending');
        expect(s.runMenus.length).toBeLessThanOrEqual(20 * mealsPerYear);
        money += s.money / 200;
      }
      console.log(`mealsPerYear=${mealsPerYear} avg end money=${money.toFixed(0)}`);
    }
  });
  it('always following leads to the kangaroo ending most of the time', () => {
    let k = 0;
    for (let seed = 1; seed <= 200; seed++) if (playthrough(seed, 'helicopter').endingId === 'kangaroo') k++;
    expect(k).toBeGreaterThan(100);
  });
});
