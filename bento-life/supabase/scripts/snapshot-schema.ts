/** Generate the reviewable v1 server schema. Applied migrations remain immutable. */
import { writeFileSync } from 'node:fs';
import { INGREDIENTS } from '../../src/data/ingredients.ts';
import { EVENTS } from '../../src/data/events.ts';
import { REQUESTS } from '../../src/data/requests.ts';
import { ENDINGS } from '../../src/game/endings.ts';
type S = Record<string, unknown>;
const str = (maxLength = 4096): S => ({ type: 'string', maxLength });
const num: S = { type: 'number', minimum: -1e12, maximum: 1e12 };
const bool: S = { type: 'boolean' };
const enumeration = (values: unknown[]): S => ({ enum: values });
const obj = (properties: Record<string, S>, required = Object.keys(properties)): S => ({ type: 'object', properties, required, additionalProperties: false });
const arr = (items: S, maxItems = 4096): S => ({ type: 'array', items, maxItems });
const map = (value: S, maxProperties = 4096): S => ({ type: 'object', additionalProperties: value, maxProperties, propertyNames: str(128) });
const ref = (name: string): S => ({ $ref: `#/$defs/${name}` });
const textArray = arr(str(256));
const ingredient = enumeration(INGREDIENTS.map(x => x.id));
const selection = obj(Object.fromEntries(['base', 'main', 'side'].map(slot => [slot, enumeration(INGREDIENTS.filter(i => i.slot === slot).map(i => i.id))])));
const stats = obj(Object.fromEntries(['health', 'smarts', 'happy', 'fitness', 'social', 'indep', 'bond'].map(k => [k, num])));
const delta = { ...stats, required: [] };
const known = obj({ likes: textArray, dislikes: arr(ingredient, 32), talent: bool });
const photo = obj({ id: str(128), age: { type: 'integer', minimum: 0, maximum: 19 }, gender: enumeration(['boy', 'girl']), expr: str(128), caption: str(), name: str(128), theme: str(128), hat: str(128) }, ['id', 'age', 'gender', 'expr', 'caption', 'name']);
const tuning = obj({ daysPerYear: enumeration([1, 2, 3]), incomeBase: { ...num, minimum: 0 }, incomePerDay: { ...num, minimum: 0 }, priceMult: { ...num, exclusiveMinimum: 0 } }, []);
const lunch = { type: 'integer', minimum: 0, maximum: 3 };
const leave = enumeration(['trust', 'escort', 'follow']);
const over = enumeration(['school', 'caught', 'lost']);
const menu = obj({ key: str(256), base: ingredient, main: ingredient, side: ingredient, name: str(), signature: bool, desc: str(), bonus: delta, flags: map(num) }, ['key', 'base', 'main', 'side', 'name']);
// MealResult fields mirror the existing engine; no paid entitlement lives in this schema.
const meal = obj({ menu: ref('menu'), isNew: bool, firstEver: bool, lines: textArray, delta, mood: enumeration(['happy', 'neutral', 'sad', 'yuck']) });
const pack = obj({ meal: ref('meal'), sel: selection, lunch, reqScore: num, liked: str(256), disliked: str(256), late: bool, mood: enumeration(['happy', 'neutral', 'grumpy']) }, ['meal', 'sel', 'lunch', 'late', 'mood']);
const commute = obj({ over, delivered: bool, score: num, bond: num, indep: num, happy: num, moment: str(), momentKind: str(128), injury: bool, log: textArray }, ['over', 'delivered', 'score', 'bond', 'indep', 'happy']);
const today = obj({ reqs: arr(enumeration(REQUESTS.map(x => x.id)), 32), forgot: bool, notice: str(), phase: enumeration(['morning', 'leave', 'commute', 'evening']), pack: ref('pack'), leave, commute: ref('commute'), evening: obj({ lunch, says: textArray, extra: textArray, delta }) }, ['reqs', 'forgot', 'phase']);
today.allOf = [
  { if: { properties: { phase: { enum: ['leave', 'commute', 'evening'] } } }, then: { required: ['pack'] } },
  { if: { properties: { phase: { const: 'evening' } } }, then: { required: ['evening'] } },
];
const active = obj({ id: enumeration(EVENTS.map(x => x.id)), emoji: str(128), title: str(), text: str(), choices: arr(obj({ label: str(), enabled: bool, hint: str() }, ['label', 'enabled']), 16) });
const crisis = obj({ at: num, emoji: str(128), text: str(), saved: str(), alone: str(), hurt: str(), done: bool, danger: bool }, ['at', 'emoji', 'text', 'saved', 'alone', 'hurt']);
const followProps: Record<string, S> = Object.fromEntries(['t', 'px', 'kx', 'lastMoveT', 'slow', 'kidTimer', 'nextLook', 'sus', 'lostFor', 'score', 'nearMiss', 'crisisLeft', 'bond', 'indep', 'happy', 'deliverLeft', 'newsLeft', 'heartAcc', 'stepAcc'].map(k => [k, num]));
Object.assign(followProps, { phase: enumeration(['intro', 'run', 'deliver', 'over']), walking: bool, dashTo: num, kidState: enumeration(['walk', 'tele', 'look', 'pause']), fakeOut: bool, covers: arr(obj({ x: num, e: str(128) }), 128), crisis, crises: arr(crisis, 128), dangerSaved: bool, injury: bool, log: textArray, over, delivered: bool, events: arr(obj({ at: num, kind: enumeration(['neighbor', 'dog', 'friend']), done: bool }, ['at', 'kind']), 128), neighbor: obj({ x: num, left: num }), dog: obj({ left: num, bark: num }), friend: obj({ x: num, state: enumeration(['walk', 'tele', 'look']), timer: num, next: num, left: num }), newsUsed: bool, moment: obj({ rank: num, kind: str(128), text: str() }) });
const follow = obj(followProps, Object.keys(followProps).filter(k => !['dashTo', 'crisis', 'dangerSaved', 'injury', 'over', 'delivered', 'neighbor', 'dog', 'friend'].includes(k)));
const checkpoint = obj({ version: { const: 1 }, context: str(256), morning: obj({ draft: { ...selection, required: [] }, tab: enumeration(['base', 'main', 'side']), lastPick: ingredient, timer: { type: 'number', minimum: 0, maximum: 30 } }, ['draft', 'tab', 'timer']), eventResult: obj({ id: str(128), emoji: str(128), title: str(), text: str(), delta, money: num, kind: str(128) }), commute: obj({ version: { const: 1 }, age: enumeration([6, 10, 15]), state: follow }) }, ['version', 'context']);
const run = obj({ version: { const: 2 }, rng: num, age: { type: 'integer', minimum: 0, maximum: 19 }, step: enumeration(['milestone', 'day', 'random', 'summary', 'ending']), child: obj({ name: str(128), gender: enumeration(['boy', 'girl']), nameOptions: arr(str(128), 32), likes: textArray, dislikes: arr(ingredient, 32), talent: enumeration(['sport', 'study', 'art', 'cook', 'people']), known }), stats, money: num, follow: num, dayIndex: num, today: ref('today'), lastSel: selection, hearts: num, vigilance: num, album: arr(obj({ age: num, menu: str(256), lunch, leave, over, moment: str(), momentKind: str(128) }, ['age', 'menu', 'lunch']), 128), photos: arr(ref('photo'), 128), eventLog: arr(obj({ age: num, id: str(128), expr: str(128), caption: str(), kind: enumeration(['milestone', 'random']) }), 1024), flags: map(num), eventQueue: arr(enumeration(EVENTS.map(x => x.id)), 256), seenEvents: textArray, recentMenus: textArray, runMenus: textArray, lastMeals: obj({ breakfast: str(256), lunch: str(256), dinner: str(256) }, []), lastMenu: str(256), yearStart: stats, unlocks: textArray, wear: textArray, yearKnown: known, log: arr(obj({ age: num, text: str() })), tuning, active: ref('active'), endingId: enumeration(ENDINGS.map(x => x.id)), checkpoint }, ['version', 'rng', 'age', 'step', 'child', 'stats', 'money', 'follow', 'dayIndex', 'hearts', 'vigilance', 'album', 'flags', 'eventQueue', 'seenEvents', 'recentMenus', 'runMenus', 'lastMeals', 'yearStart', 'log']);
run.allOf = [{ if: { properties: { step: { const: 'day' } } }, then: { required: ['today'] } }, { if: { properties: { step: { const: 'ending' } } }, then: { required: ['endingId'] } }];
const dex = obj({ menus: textArray, endings: textArray, events: textArray, plays: { ...num, minimum: 0 }, hearts: { ...num, minimum: 0 }, owned: textArray, equip: obj({ theme: str(128), hat: str(128) }, []), photos: map(ref('photo'), 1024) }, []);
const prefs = obj({ sound: bool, haptics: bool, music: bool, seenTips: textArray, tuning, seenIntro: bool, seenDragHint: bool }, []);
export const schema = { $schema: 'https://json-schema.org/draft/2020-12/schema', ...obj({ version: { const: 1 }, run: ref('run'), dex, prefs }, ['version', 'dex', 'prefs']), $defs: { photo, menu, meal, pack, commute, today, active, run } };
if (process.argv.includes('--write')) writeFileSync(new URL('../snapshot.schema.json', import.meta.url), JSON.stringify(schema, null, 2) + '\n');
