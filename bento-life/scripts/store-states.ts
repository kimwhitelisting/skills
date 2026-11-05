// 스토어 스크린샷용 저장 상태를 만든다 (store-shots.cjs가 이걸 불러와 화면을 찍는다)
import { mkdirSync, writeFileSync } from 'node:fs';
import { EVENT_BY_ID } from '../src/data/events.ts';
import { available, ingredientCost, selectionCost } from '../src/game/bento.ts';
import { advanceYear, chooseEventOption, chooseLeave, continueAfterEvent, endDay, finishCommute, leaveOptions, packToday, startGame } from '../src/game/engine.ts';
import { newGame } from '../src/game/state.ts';
import type { GameState, Photo } from '../src/game/types.ts';
import { pxAgeOf } from '../src/pixel/child.ts';
import { commuteCaption, dailyCaption } from '../src/pixel/event-scenes.ts';
import { simCommute } from '../tests/sim.ts';

const s = startGame(newGame(2024));
const r = { rng: 11 };
const kinds = ['deliver', 'nearmiss', 'crisis-alone', 'danger-saved', 'dog', 'neighbor-ok', 'crisis-run'];
const pick = (slot: 'base' | 'main' | 'side', i: number) => { const l = available(s, slot); return l[i % l.length].id; };
const cheap = (slot: 'base' | 'main' | 'side') => [...available(s, slot)].sort((a, b) => ingredientCost(s, a.id) - ingredientCost(s, b.id))[0].id;
const lunch = () => { const sel = { base: pick('base', s.age), main: pick('main', s.age * 3), side: pick('side', s.age * 7) }; return selectionCost(s, sel) <= s.money ? sel : { base: cheap('base'), main: cheap('main'), side: cheap('side') }; };
const photos: Photo[] = [];
const out: Record<string, unknown> = {};
const snap = (k: string) => { out[k] = structuredClone(s); };
for (let i = 0; i < 6000 && s.step !== 'ending'; i++) {
  if (s.active) { const id = s.active.id; chooseEventOption(s, s.active.choices.findIndex((c) => c.enabled)); continueAfterEvent(s); (s.eventLog ??= []).push({ age: s.age, id, expr: 'happy', caption: EVENT_BY_ID[id].title.replace('{c}', s.child.name), kind: EVENT_BY_ID[id].kind }); continue; }
  if (s.step === 'summary') {
    const day = s.album.find((d) => d.age === s.age && d.momentKind);
    const ev = (s.eventLog ?? []).filter((e) => e.age === s.age && !photos.some((p) => p.id === `e-${e.id}`)).pop();
    photos.push({ id: day ? `c-${day.momentKind}` : ev ? `e-${ev.id}` : `d-${pxAgeOf(s.age)}`, age: s.age, gender: s.child.gender, expr: 'happy', caption: day?.momentKind ? commuteCaption(day.momentKind) : ev ? ev.caption : dailyCaption(pxAgeOf(s.age)), name: s.child.name });
    s.photos = [...photos];
    if (s.age === 9) snap('summary');
    if (s.age === 19) { snap('final'); }
    advanceYear(s); continue;
  }
  const t = s.today!;
  if (t.phase === 'morning') { if (s.age === 8 && !out.morning) snap('morning'); packToday(s, lunch()); continue; }
  if (t.phase === 'leave') { if (s.age === 8 && !out.leave) snap('leave'); const o = leaveOptions(s); chooseLeave(s, o.includes('follow') ? 'follow' : o[0]); continue; }
  if (t.phase === 'commute') { const k = kinds[s.age % kinds.length]; finishCommute(s, { ...simCommute(s, r, s.age < 10), moment: commuteCaption(k), momentKind: k }); continue; }
  if (t.phase === 'evening' && s.age === 10 && !out.evening) snap('evening');
  endDay(s);
}
// 이벤트 화면: 15살 「형광 분홍 머리」
const ev = structuredClone(out.summary as GameState);
const e = EVENT_BY_ID.dye;
ev.age = 15; ev.step = 'random';
ev.active = { id: e.id, emoji: e.emoji, title: e.title, text: (e.text as string).replace('{c}', ev.child.name + (/[가-힣]$/.test(ev.child.name) ? '' : '')), choices: (e.choices as { label: string }[]).map((c) => ({ label: c.label, enabled: true })) };
out.event = ev;
out.dexPhotos = Object.fromEntries(photos.map((p) => [p.id, p]));
mkdirSync(new URL('../art-src/store/', import.meta.url), { recursive: true });
writeFileSync(new URL('../art-src/store/.states.json', import.meta.url), JSON.stringify(out));
console.log('states:', Object.keys(out).join(', '));
