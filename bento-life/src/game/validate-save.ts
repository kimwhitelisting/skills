import { INGREDIENTS } from '../data/ingredients.ts';
import { EVENT_BY_ID } from '../data/events.ts';
import { ENDING_BY_ID } from './endings.ts';
import { REQUEST_BY_ID } from '../data/requests.ts';
export const object = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
export const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string');
const list = (v: unknown, check: (x: any) => boolean) => Array.isArray(v) && v.every(check);
const optional = (v: unknown, check: (x: any) => boolean) => v === undefined || check(v);
const text = (v: unknown) => typeof v === 'string';
const stats = (v: unknown) => object(v) && ['health', 'smarts', 'happy', 'fitness', 'social', 'indep', 'bond'].every(k => finite(v[k]));
const delta = (v: unknown) => object(v) && Object.values(v).every(finite);
const lunch = (v: unknown) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 3;
const ingredientIds = (v: unknown) => strings(v) && v.every(id => INGREDIENTS.some(i => i.id === id));
const ingredientId = (v: unknown) => typeof v === 'string' && INGREDIENTS.some(i => i.id === v);
const known = (v: unknown) => object(v) && strings(v.likes) && ingredientIds(v.dislikes) && typeof v.talent === 'boolean';
const selection = (v: unknown) => object(v) && ['base', 'main', 'side'].every(slot => INGREDIENTS.some(i => i.id === v[slot] && i.slot === slot));
const photo = (v: unknown) => object(v) && ['id', 'expr', 'caption', 'name'].every(k => text(v[k])) && finite(v.age) && ['boy', 'girl'].includes(v.gender) && optional(v.theme, text) && optional(v.hat, text);
const active = (v: unknown) => object(v) && !!EVENT_BY_ID[v.id] && ['emoji', 'title', 'text'].every(k => text(v[k])) && list(v.choices, c => object(c) && text(c.label) && typeof c.enabled === 'boolean' && optional(c.hint, text));
export const validTuning = (v: unknown) => object(v) && Object.entries(v).every(([k, x]) => ['daysPerYear', 'incomeBase', 'incomePerDay', 'priceMult'].includes(k) && finite(x) && (k === 'daysPerYear' ? [1, 2, 3].includes(x) : k === 'priceMult' ? x > 0 : x >= 0));
function today(v: unknown): boolean {
    if (!object(v) || !strings(v.reqs) || !v.reqs.every(id => !!REQUEST_BY_ID[id]) || typeof v.forgot !== 'boolean' || !['morning', 'leave', 'commute', 'evening'].includes(v.phase))
        return false;
    if (v.phase !== 'morning') {
        const p = v.pack;
        if (!object(p) || !selection(p.sel) || !lunch(p.lunch) || !['happy', 'neutral', 'grumpy'].includes(p.mood) || !object(p.meal) || !object(p.meal.menu) || !text(p.meal.menu.key) || !text(p.meal.menu.name) || !strings(p.meal.lines))
            return false;
        if (!optional(p.liked, ingredientId) || !optional(p.disliked, ingredientId))
            return false;
    }
    if (v.phase === 'evening' && (!object(v.evening) || !lunch(v.evening.lunch) || !strings(v.evening.says) || !strings(v.evening.extra) || !delta(v.evening.delta)))
        return false;
    if (!optional(v.commute, c => object(c) && ['school', 'caught', 'lost'].includes(c.over) && typeof c.delivered === 'boolean' && ['score', 'bond', 'indep', 'happy'].every(k => finite(c[k])) && optional(c.moment, text) && optional(c.momentKind, text) && optional(c.log, strings) && optional(c.injury, x => typeof x === 'boolean')))
        return false;
    return optional(v.notice, text);
}
/** Validate shapes consumed by rendering/engine before accepting a save. Additive old v2 fields remain optional. */
export function validRun(v: unknown): boolean {
    if (!object(v) || v.version !== 2 || !Number.isInteger(v.age) || v.age < 0 || v.age > 19 || !['milestone', 'day', 'random', 'summary', 'ending'].includes(v.step))
        return false;
    const c = v.child;
    if (!object(c) || !text(c.name) || !['boy', 'girl'].includes(c.gender) || !strings(c.nameOptions) || !strings(c.likes) || !ingredientIds(c.dislikes) || !known(c.known) || !['sport', 'study', 'art', 'cook', 'people'].includes(c.talent))
        return false;
    if (!stats(v.stats) || !stats(v.yearStart) || !['rng', 'money', 'follow', 'dayIndex', 'hearts', 'vigilance'].every(k => finite(v[k])) || !delta(v.flags) || !object(v.lastMeals))
        return false;
    if (!['eventQueue', 'seenEvents', 'recentMenus', 'runMenus'].every(k => strings(v[k])) || !v.eventQueue.every((id: string) => !!EVENT_BY_ID[id]))
        return false;
    if (!list(v.album, d => object(d) && finite(d.age) && text(d.menu) && lunch(d.lunch) && optional(d.moment, text) && optional(d.momentKind, text)) || !list(v.log, l => object(l) && finite(l.age) && text(l.text)))
        return false;
    if (!optional(v.photos, x => list(x, photo)) || !optional(v.eventLog, x => list(x, e => object(e) && finite(e.age) && text(e.id) && text(e.expr) && text(e.caption) && ['milestone', 'random'].includes(e.kind))))
        return false;
    if (!optional(v.active, active) || !optional(v.today, today) || !optional(v.yearKnown, known) || !optional(v.lastSel, selection) || !optional(v.tuning, validTuning) || !optional(v.unlocks, strings) || !optional(v.wear, strings))
        return false;
    return (v.step !== 'day' || !!v.today) && (v.step !== 'ending' || !!ENDING_BY_ID[v.endingId]);
}
export function validDex(v: unknown): boolean {
    if (!object(v))
        return false;
    return ['menus', 'endings', 'events', 'owned'].every(k => optional(v[k], strings)) && ['plays', 'hearts'].every(k => optional(v[k], x => finite(x) && x >= 0)) && optional(v.equip, x => object(x) && optional(x.theme, text) && optional(x.hat, text)) && optional(v.photos, x => object(x) && Object.values(x).every(photo));
}
export function validPrefs(v: unknown): boolean {
    return object(v) && ['sound', 'haptics', 'music', 'seenIntro', 'seenDragHint'].every(k => optional(v[k], x => typeof x === 'boolean')) && optional(v.seenTips, strings) && optional(v.tuning, validTuning);
}
