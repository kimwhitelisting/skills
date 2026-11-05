import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { INGREDIENTS } from '../src/data/ingredients.ts';
import { SIGNATURES } from '../src/data/signatures.ts';
import { EVENTS } from '../src/data/events.ts';
import { packBento } from '../src/game/bento.ts';
import { chooseLeave, endDay, finishCommute, leaveOptions, packToday, startGame } from '../src/game/engine.ts';
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
    expect(() => packBento(s, 'breakfast', { base: 'rice', main: 'jeyuk', side: 'kimchi' })).toThrow();
    s.age = 10;
    s.money = 1;
    expect(() => packBento(s, 'breakfast', { base: 'rice', main: 'jeyuk', side: 'kimchi' })).toThrow('money');
  });
});

describe('day loop', () => {
  const toDay = (seed: number, age: number) => {
    const s = startGame(newGame(seed));
    s.age = age; s.money = 200; s.step = 'day'; s.active = undefined; s.dayIndex = 0;
    s.today = { reqs: ['pe'], forgot: false, phase: 'morning' };
    return s;
  };
  it('infants skip the see-off and go straight to evening', () => {
    const s = toDay(4, 1);
    s.today!.reqs = [];
    packToday(s, { base: 'porridge', main: 'egg', side: 'banana' });
    expect(s.today!.phase).toBe('evening');
    expect(leaveOptions(s)).toEqual([]);
    endDay(s);
    expect(s.step).not.toBe('day');
  });
  it('preschoolers can be escorted, school kids followed; forgot days force following', () => {
    const s = toDay(5, 4);
    packToday(s, { base: 'rice', main: 'bulgogi', side: 'broccoli' });
    expect(leaveOptions(s)).toEqual(['escort', 'trust']);
    const e = chooseLeave(s, 'escort')!;
    expect(e.delta.bond).toBeGreaterThan(0);
    const k = toDay(6, 8);
    k.today!.forgot = true;
    packToday(k, { base: 'rice', main: 'bulgogi', side: 'broccoli' });
    expect(leaveOptions(k)).toEqual(['follow']);
    expect(() => chooseLeave(k, 'trust')).toThrow();
  });
  it('a meaty lunch on PE day earns stars and the request line', () => {
    const s = toDay(7, 8);
    s.child.likes = ['과일', '면']; s.child.dislikes = ['mackerel', 'kimchi'];
    const p = packToday(s, { base: 'rice', main: 'chicken', side: 'anchovy' });
    expect(p.reqScore).toBe(2);
    const e = chooseLeave(s, 'trust')!;
    expect(e.lunch).toBeGreaterThanOrEqual(2);
    expect(e.says.join()).toContain('달리기');
  });
  it('holding back in real danger can mean an injury', () => {
    const s = toDay(9, 8);
    packToday(s, { base: 'rice', main: 'bulgogi', side: 'broccoli' });
    chooseLeave(s, 'follow');
    const h = s.stats.health;
    const e = finishCommute(s, { over: 'school', delivered: false, score: 80, bond: -2, indep: 1, happy: -4, injury: true, momentKind: 'danger-hurt' });
    expect(s.stats.health).toBeLessThan(h - 5);
    expect(s.flags.injury).toBe(1);
    expect(e.extra.join()).toContain('깁스');
  });
  it('following a teen backfires and makes them warier', () => {
    const s = toDay(3, 15);
    packToday(s, { base: 'rice', main: 'bulgogi', side: 'broccoli' });
    chooseLeave(s, 'follow');
    const e = finishCommute(s, { over: 'caught', delivered: false, score: 40, bond: -2, indep: -2, happy: -1 });
    expect(e.delta.bond ?? 0).toBeLessThan(0);
    expect(e.delta.indep ?? 0).toBeLessThan(0);
    expect(s.vigilance).toBeGreaterThan(0.1);
    expect(s.hearts).toBe(40);
  });
});

describe('content integrity', () => {
  it('event ids are unique and each age 0..19 has a milestone', () => {
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(EVENTS.length);
    for (let a = 0; a <= 19; a++) expect(EVENTS.some((e) => e.kind === 'milestone' && e.age === a), `age ${a}`).toBe(true);
  });
  it('every event has its own pixel scene', async () => {
    const { hasEventScene, EVENT_SCENE_IDS } = await import('../src/pixel/event-scenes.ts');
    for (const e of EVENTS) expect(hasEventScene(e.id), e.id).toBe(true);
    for (const id of EVENT_SCENE_IDS) expect(EVENTS.some((e) => e.id === id), `unused scene ${id}`).toBe(true);
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
  it('every days-per-year setting finishes and stays in a sane money range', () => {
    for (const daysPerYear of [1, 2, 3] as const) {
      let money = 0;
      for (let seed = 1; seed <= 200; seed++) {
        const s = playthrough(seed, 'random', { daysPerYear });
        expect(s.step).toBe('ending');
        expect(s.runMenus.length).toBeLessThanOrEqual(20 * daysPerYear);
        money += s.money / 200;
      }
      console.log(`daysPerYear=${daysPerYear} avg end money=${money.toFixed(0)}`);
    }
  });
  it('always following leads to the kangaroo ending most of the time', () => {
    let k = 0;
    for (let seed = 1; seed <= 200; seed++) if (playthrough(seed, 'helicopter').endingId === 'kangaroo') k++;
    expect(k).toBeGreaterThan(100);
  });
});

describe('endings', () => {
  it('ids are unique and every ending has its own scene', async () => {
    const { hasEndingScene } = await import('../src/pixel/event-scenes.ts');
    expect(new Set(ENDINGS.map((e) => e.id)).size).toBe(ENDINGS.length);
    for (const e of ENDINGS) expect(hasEndingScene(e.id), e.id).toBe(true);
    for (const tone of ['happy', 'bitter', 'twisted', 'bad']) expect(ENDINGS.filter((e) => e.tone === tone).length, tone).toBeGreaterThanOrEqual(5);
  });
  it('an early ending ends the run before twenty, with a warning the year before', async () => {
    const { advanceYear } = await import('../src/game/engine.ts');
    const { earlyWarning } = await import('../src/game/endings.ts');
    const s = startGame(newGame(21));
    s.step = 'summary'; s.active = undefined; s.age = 15;
    s.flags.runaway = 1; s.stats.bond = 40;
    expect(earlyWarning(s)?.id).toBe('runaway');
    s.flags.runaway = 2;
    advanceYear(s);
    expect(s.step).toBe('ending');
    expect(s.endingId).toBe('runaway');
    expect(s.age).toBe(15);
  });
  it('study abroad ends the run at the end of that year', async () => {
    const { advanceYear } = await import('../src/game/engine.ts');
    const s = startGame(newGame(22));
    s.step = 'summary'; s.active = undefined; s.age = 14; s.flags.abroad = 1;
    advanceYear(s);
    expect(s.endingId).toBe('abroad');
  });
});

describe('money and hearts', () => {
  it('grandma bails you out when you cannot afford a lunchbox, and it counts', async () => {
    const { advanceYear } = await import('../src/game/engine.ts');
    const s = startGame(newGame(41));
    s.step = 'summary'; s.active = undefined; s.age = 5; s.money = 0;
    s.tuning = { ...s.tuning, incomeBase: 0, incomePerDay: 0 };
    advanceYear(s);
    const { chooseEventOption, continueAfterEvent } = await import('../src/game/engine.ts');
    for (let a = s.active as { choices: { enabled: boolean }[] } | undefined; a; a = s.active) { chooseEventOption(s, a.choices.findIndex((c) => c.enabled)); continueAfterEvent(s); }
    expect(s.step).toBe('day');
    expect(s.flags.grandma).toBe(1);
    expect(s.today?.notice).toContain('할머니');
    expect(s.money).toBeGreaterThanOrEqual(15);
  });
  it('shop items are unique and tools map to the commute tools', async () => {
    const { SHOP, toolIds } = await import('../src/game/shop.ts');
    expect(new Set(SHOP.map((i) => i.id)).size).toBe(SHOP.length);
    expect(toolIds(['tool-news', 'hat-cap', 'tool-pot'])).toEqual(['news', 'pot']);
    for (const i of SHOP) expect(i.price, i.id).toBeGreaterThan(0);
  });
});

describe('shop stories', () => {
  it('story events only appear after buying the pack, and their endings become reachable', async () => {
    const { SHOP } = await import('../src/game/shop.ts');
    const stories = SHOP.filter((i) => i.kind === 'story').map((i) => i.id);
    let without = 0, withPack = 0;
    const ends = new Set<string>();
    for (let seed = 1; seed <= 300; seed++) {
      without += playthrough(seed, 'random').seenEvents.filter((id) => EVENTS.find((e) => e.id === id)?.shop).length;
      const s = playthrough(seed, 'random', undefined, { unlocks: stories, wear: ['hat-chef'] });
      withPack += s.seenEvents.filter((id) => EVENTS.find((e) => e.id === id)?.shop || EVENTS.find((e) => e.id === id)?.wear).length;
      ends.add(s.endingId!);
    }
    expect(without).toBe(0);
    expect(withPack).toBeGreaterThan(300);
    for (const id of ['pianist', 'dogTrainer', 'farmer', 'photographer', 'marineBio', 'librarian', 'diplomat', 'actor']) expect(ends.has(id), id).toBe(true);
  });
});

describe('photo album', () => {
  it('every photo kind draws at every growth stage', async () => {
    const { photoScene, COMMUTE_PHOTO_IDS, DAILY_PHOTO_IDS, EV_W, EV_H } = await import('../src/pixel/event-scenes.ts');
    const { PX_AGES } = await import('../src/pixel/child.ts');
    const ids = [...COMMUTE_PHOTO_IDS.map((k) => `c-${k}`), ...DAILY_PHOTO_IDS.map((k) => `d-${k}`), ...EVENTS.map((e) => `e-${e.id}`)];
    for (const age of PX_AGES) for (const id of ids) {
      const g = photoScene(id, { age, gender: age % 2 ? 'girl' : 'boy' });
      expect(g.w, id).toBe(EV_W); expect(g.h, id).toBe(EV_H);
    }
  });
});

describe('music', () => {
  it('every track parses and its parts line up bar for bar', async () => {
    const { TRACK_IDS, trackOf, parse, stepsOf, freq } = await import('../src/ui/music.ts');
    expect(Math.round(freq('A4'))).toBe(440);
    expect(Math.round(freq('C4'))).toBe(262);
    for (const id of TRACK_IDS) {
      const t = trackOf(id);
      const n = stepsOf(t);
      expect(n % 8, id).toBe(0);
      const count = (s: string) => s.split(/\s+/).filter((x) => x && x !== '|').length;
      expect(count(t.bass), `${id} bass`).toBe(n);
      if (t.drum) expect(count(t.drum), `${id} drum`).toBe(n);
      expect(parse(t.lead).length, id).toBeGreaterThan(4);
    }
  });
});

describe('pixel parts', () => {
  it('every layer the generator draws can be overridden by a part with the same key', async () => {
    const { childFront, childLayers, partKey, PART_OVERRIDES } = await import('../src/pixel/child.ts');
    const look = { age: 7 as const, gender: 'girl' as const };
    const layers = childLayers('front', look);
    expect(Object.keys(layers)).toContain('hair');
    const before = childFront(look).px.join();
    const hair = layers.hair.clone();
    hair.px.forEach((c, i) => { if (c) hair.px[i] = '#00ff00'; });
    PART_OVERRIDES.set(partKey('front', look, 'hair'), hair);
    const after = childFront(look);
    PART_OVERRIDES.clear();
    expect(after.px.join()).not.toBe(before);
    expect(after.px).toContain('#00ff00');
  });
});
