import { INGREDIENTS } from '../data/ingredients.ts';
import type { Delta, GameState, Slot } from './types.ts';
import type { Draft } from '../proto/bento-ui.ts';
import { finite, object } from './validate-save.ts';
export interface EventResult {
    id: string;
    emoji: string;
    title: string;
    text: string;
    delta: Delta;
    money: number;
    kind: string;
}
export interface Checkpoint {
    version: 1;
    context: string;
    morning?: {
        draft: Draft;
        tab: Slot;
        lastPick?: string;
        timer: number;
    };
    eventResult?: EventResult;
    commute?: unknown;
}
export const checkpointContext = (s: GameState) => `${s.age}:${s.dayIndex}:${s.step}:${s.today?.phase ?? ''}:${s.active?.id ?? ''}`;
export function restoreCheckpoint(s: GameState): Checkpoint | undefined {
    const c = s.checkpoint;
    if (!object(c) || c.version !== 1 || c.context !== checkpointContext(s))
        return undefined;
    const out: Checkpoint = { version: 1, context: c.context };
    if (c.morning && s.step === 'day' && s.today?.phase === 'morning' && !s.active) {
        const m = c.morning;
        if (object(m) && object(m.draft) && ['base', 'main', 'side'].includes(m.tab) && finite(m.timer) && m.timer >= 0 && m.timer <= 30 && Object.entries(m.draft).every(([slot, id]) => INGREDIENTS.some(i => i.id === id && i.slot === slot && i.minAge <= s.age && i.maxAge >= s.age)))
            out.morning = { draft: { ...m.draft }, tab: m.tab, timer: m.timer, lastPick: INGREDIENTS.some(i => i.id === m.lastPick && i.minAge <= s.age && i.maxAge >= s.age) ? m.lastPick : undefined };
    }
    const e = c.eventResult;
    if (object(e) && (['id', 'emoji', 'title', 'text', 'kind'] as const).every(k => typeof e[k] === 'string') && finite(e.money) && object(e.delta) && Object.values(e.delta).every(finite))
        out.eventResult = e as EventResult;
    if (c.commute !== undefined && s.today?.phase === 'commute')
        out.commute = c.commute;
    return out;
}
export function captureCheckpoint(s: GameState, ui: Omit<Checkpoint, 'version' | 'context'>): void {
    s.checkpoint = { version: 1, context: checkpointContext(s), ...ui };
}
