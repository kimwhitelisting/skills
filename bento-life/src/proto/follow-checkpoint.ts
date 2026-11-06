import { finite, object, strings } from '../game/validate-save.ts';
export interface Crisis {
    at: number;
    emoji: string;
    text: string;
    saved: string;
    alone: string;
    hurt: string;
    done?: boolean;
    danger?: boolean;
}
type Moment = {
    rank: number;
    kind: string;
    text: string;
};
interface Watcher {
    x: number;
    state: 'walk' | 'tele' | 'look';
    timer: number;
    next: number;
}
export interface FollowState {
    phase: 'intro' | 'run' | 'deliver' | 'over';
    t: number;
    px: number;
    kx: number;
    walking: boolean;
    dashTo?: number;
    lastMoveT: number;
    slow: number;
    kidState: 'walk' | 'tele' | 'look' | 'pause';
    kidTimer: number;
    nextLook: number;
    fakeOut: boolean;
    sus: number;
    lostFor: number;
    score: number;
    nearMiss: number;
    covers: {
        x: number;
        e: string;
    }[];
    crisis?: Crisis;
    crises: Crisis[];
    dangerSaved?: boolean;
    injury?: boolean;
    crisisLeft: number;
    log: string[];
    bond: number;
    indep: number;
    happy: number;
    over?: 'school' | 'caught' | 'lost';
    delivered?: boolean;
    deliverLeft: number;
    events: {
        at: number;
        kind: 'neighbor' | 'dog' | 'friend';
        done?: boolean;
    }[];
    neighbor?: {
        x: number;
        left: number;
    };
    dog?: {
        left: number;
        bark: number;
    };
    friend?: Watcher & {
        left: number;
    };
    newsLeft: number;
    newsUsed: boolean;
    heartAcc: number;
    moment: Moment;
    stepAcc: number;
}
export interface FollowCheckpoint {
    version: 1;
    age: 6 | 10 | 15;
    state: FollowState;
}
const numeric = ['t', 'px', 'kx', 'lastMoveT', 'slow', 'kidTimer', 'nextLook', 'sus', 'lostFor', 'score', 'nearMiss', 'crisisLeft', 'bond', 'indep', 'happy', 'deliverLeft', 'newsLeft', 'heartAcc', 'stepAcc'];
const crisisOK = (c: unknown) => object(c) && finite(c.at) && ['emoji', 'text', 'saved', 'alone', 'hurt'].every(k => typeof c[k] === 'string') && (c.done === undefined || typeof c.done === 'boolean') && (c.danger === undefined || typeof c.danger === 'boolean');
export function captureFollow(age: 6 | 10 | 15, state: FollowState): FollowCheckpoint {
    return JSON.parse(JSON.stringify({ version: 1, age, state }));
}
/** No live references, held pointer or wall-clock time are carried across a restart. */
export function restoreFollow(value: unknown, age: 6 | 10 | 15): FollowState | undefined {
    if (!object(value) || value.version !== 1 || value.age !== age || !object(value.state))
        return undefined;
    const s = value.state;
    if (!numeric.every(k => finite(s[k])) || !['intro', 'run', 'deliver', 'over'].includes(s.phase) || !['walk', 'tele', 'look', 'pause'].includes(s.kidState))
        return undefined;
    if (!['walking', 'fakeOut', 'newsUsed'].every(k => typeof s[k] === 'boolean') || !strings(s.log))
        return undefined;
    if (!Array.isArray(s.covers) || !s.covers.every(c => object(c) && finite(c.x) && typeof c.e === 'string') || !Array.isArray(s.crises) || !s.crises.every(crisisOK))
        return undefined;
    if (s.crisis !== undefined && !crisisOK(s.crisis))
        return undefined;
    if (!Array.isArray(s.events) || !s.events.every(e => object(e) && finite(e.at) && ['neighbor', 'dog', 'friend'].includes(e.kind) && (e.done === undefined || typeof e.done === 'boolean')))
        return undefined;
    if (!object(s.moment) || !finite(s.moment.rank) || typeof s.moment.kind !== 'string' || typeof s.moment.text !== 'string')
        return undefined;
    if (s.neighbor !== undefined && (!object(s.neighbor) || !finite(s.neighbor.x) || !finite(s.neighbor.left)))
        return undefined;
    if (s.dog !== undefined && (!object(s.dog) || !finite(s.dog.left) || !finite(s.dog.bark)))
        return undefined;
    if (s.friend !== undefined && (!object(s.friend) || !['x', 'timer', 'next', 'left'].every(k => finite(s.friend[k])) || !['walk', 'tele', 'look'].includes(s.friend.state)))
        return undefined;
    if (s.dashTo !== undefined && !finite(s.dashTo))
        return undefined;
    if (s.phase === 'over' && !['school', 'caught', 'lost'].includes(s.over))
        return undefined;
    const restored = JSON.parse(JSON.stringify(s)) as FollowState;
    restored.walking = false;
    return restored;
}
