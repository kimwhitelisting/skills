/**
 * 배경음악 — 파일 없이 WebAudio로 연주하는 8비트 음악 (곡은 모두 이 파일에 직접 쓴 창작곡).
 *
 * 악보 표기 (한 칸 = 8분음표):  'E5' 음 · '-' 앞 음 이어서 · '.' 쉼 · '|' 마디 구분(무시)
 * 드럼: 'k' 킥 · 's' 스네어 · 'x' 하이햇 · '.' 쉼
 * 장면이 바뀌면 짧게 줄였다가 다음 곡으로 넘어간다. 탭/클릭 한 번 뒤부터 소리가 난다 (브라우저 자동 재생 규칙).
 */
import { audioCtx } from './feedback.ts';

export type TrackId = 'title' | 'morning' | 'commute' | 'evening' | 'event' | 'growth' | 'end-happy' | 'end-bitter' | 'end-twisted' | 'end-bad';
interface Track { bpm: number; lead: string; bass: string; drum?: string; leadWave: OscillatorType; staccato?: boolean; vol?: number }

const TRACKS: Record<TrackId, Track> = {
  // 타이틀: 통통 튀는 C장조
  title: {
    bpm: 108, leadWave: 'square',
    lead: 'E5 - G5 . E5 D5 C5 - | D5 - E5 . G5 - . . | A5 - G5 . E5 D5 C5 - | D5 E5 D5 . C5 - - .',
    bass: 'C3 . G3 . C3 . G3 . | G2 . D3 . G2 . D3 . | A2 . E3 . F2 . C3 . | G2 . G2 . C3 . . .',
    drum: 'k . x . s . x . | k . x . s . x . | k . x . s . x . | k . x . s . x x',
  },
  // 아침 부엌: 조금 바쁜 G장조
  morning: {
    bpm: 128, leadWave: 'square', vol: 0.85,
    lead: 'G5 . A5 B5 D6 . B5 . | A5 . G5 . E5 . D5 . | G5 . A5 B5 C6 . B5 A5 | G5 - - . D5 . . .',
    bass: 'G2 . D3 . G2 . D3 . | C3 . G3 . D3 . A2 . | E2 . B2 . C3 . D3 . | G2 . D3 . G2 . . .',
    drum: 'k . x x s . x x | k . x x s . x x | k . x x s . x x | k . x x s s x x',
  },
  // 등굣길: 살금살금 A단조, 짧게 끊어서
  commute: {
    bpm: 132, leadWave: 'square', staccato: true, vol: 0.7,
    lead: 'A4 . . C5 . . E5 . | D5 . . B4 . . G4 . | A4 . . C5 . . E5 . | F5 . E5 . D5 . B4 .',
    bass: 'A2 . E2 . A2 . E2 . | G2 . D2 . G2 . D2 . | F2 . C3 . F2 . C3 . | E2 . B2 . E2 . G#2 .',
    drum: 'k . . x . . x . | k . . x . . x . | k . . x . . x . | k . . x . x x .',
  },
  // 저녁: 자장가 F장조
  evening: {
    bpm: 84, leadWave: 'triangle', vol: 1.2,
    lead: 'C5 - A4 - F4 - A4 - | Bb4 - G4 - E4 - G4 - | A4 - C5 - F5 - E5 - | D5 - - - C5 - - -',
    bass: 'F2 - - - C3 - - - | G2 - - - C3 - - - | F2 - - - A2 - - - | Bb2 - - - C3 - - -',
  },
  // 이벤트: 무슨 일이지? D도리안
  event: {
    bpm: 96, leadWave: 'triangle', vol: 1.1,
    lead: 'D5 . F5 . A5 - G5 . | F5 . E5 . D5 - - . | C5 . E5 . G5 - F5 . | E5 . D5 . C5 - - .',
    bass: 'D3 . A2 . D3 . A2 . | Bb2 . F2 . Bb2 . F2 . | C3 . G2 . C3 . G2 . | A2 . E2 . A2 . . .',
    drum: 'k . . . x . . . | k . . . x . . . | k . . . x . . . | k . . . x . x .',
  },
  // 키 재기 결산: 오르골
  growth: {
    bpm: 92, leadWave: 'triangle', vol: 1.2,
    lead: 'C6 . G5 . E5 . G5 . | A5 . F5 . D5 . F5 . | G5 . E5 . C5 . E5 . | D5 . G4 . C5 - - .',
    bass: 'C3 - - - - - - - | F2 - - - - - - - | C3 - - - - - - - | G2 - - - C3 - - -',
  },
  'end-happy': {
    bpm: 100, leadWave: 'square',
    lead: 'C5 - E5 - G5 - C6 - | B5 - G5 - A5 - - . | F5 - A5 - G5 - E5 - | D5 - G5 - C5 - - -',
    bass: 'C3 . G2 . C3 . G2 . | G2 . D3 . F2 . C3 . | F2 . C3 . C3 . G2 . | G2 . G2 . C3 - - -',
    drum: 'k . x . s . x . | k . x . s . x . | k . x . s . x . | k x s x k . . .',
  },
  'end-bitter': {
    bpm: 76, leadWave: 'triangle', vol: 1.2,
    lead: 'E5 - - C5 B4 - A4 - | F5 - - E5 D5 - - - | C5 - - B4 A4 - G#4 - | A4 - - - - - - -',
    bass: 'A2 - - - E3 - - - | D3 - - - - - - - | A2 - - - E2 - - - | A2 - - - - - - -',
  },
  'end-twisted': {
    bpm: 116, leadWave: 'square', staccato: true, vol: 0.8,
    lead: 'E5 . G5 . F#5 . . E5 | D5 . E5 . B4 . . . | E5 . G5 . A#5 . A5 . | G5 . F#5 . E5 . . .',
    bass: 'E2 . E3 . E2 . E3 . | D2 . D3 . D2 . D3 . | C2 . C3 . C2 . C3 . | B1 . B2 . B1 . D#3 .',
    drum: 'k . s . k k s . | k . s . k k s . | k . s . k k s . | k . s s k . s .',
  },
  'end-bad': {
    bpm: 66, leadWave: 'triangle', vol: 1.1,
    lead: 'D5 - - - . . A4 - | F4 - - - . . E4 - | D4 - - - - - - - | . . . . . . . .',
    bass: 'D2 - - - - - - - | Bb1 - - - - - - - | A1 - - - - - - - | D2 - - - - - - -',
  },
};
export const TRACK_IDS = Object.keys(TRACKS) as TrackId[];

const NOTE: Record<string, number> = { C: -9, 'C#': -8, Db: -8, D: -7, 'D#': -6, Eb: -6, E: -5, F: -4, 'F#': -3, Gb: -3, G: -2, 'G#': -1, Ab: -1, A: 0, 'A#': 1, Bb: 1, B: 2 };
/** 'A4' → 440 */
export function freq(n: string): number {
  const m = n.match(/^([A-G][#b]?)(\d)$/);
  if (!m) throw new Error(`bad note ${n}`);
  return 440 * 2 ** ((NOTE[m[1]] + (Number(m[2]) - 4) * 12) / 12);
}
const tokens = (s: string) => s.split(/\s+/).filter((t) => t && t !== '|');

/** 악보를 (시작 칸, 길이, 음) 목록으로 */
export function parse(line: string): { at: number; len: number; f: number }[] {
  const out: { at: number; len: number; f: number }[] = [];
  tokens(line).forEach((t, i) => {
    if (t === '-') { if (out.length && out[out.length - 1].at + out[out.length - 1].len === i) out[out.length - 1].len++; return; }
    if (t === '.') return;
    out.push({ at: i, len: 1, f: freq(t) });
  });
  return out;
}
export const stepsOf = (t: Track) => tokens(t.lead).length;
export const trackOf = (id: TrackId) => TRACKS[id];

// ───────── 연주 ─────────
let enabled = true;
let current: TrackId | undefined;
let wanted: TrackId | undefined;
let master: GainNode | undefined;
let noise: AudioBuffer | undefined;
let timer = 0;
let step = 0;
let nextTime = 0;
const VOL = 0.05;

function ensure(create = false): AudioContext | undefined {
  const ctx = audioCtx(create);
  if (!ctx) return undefined;
  if (!master) { master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination); }
  if (!noise) {
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return ctx;
}

function voice(ctx: AudioContext, f: number, t0: number, dur: number, wave: OscillatorType, vol: number): void {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = wave; o.frequency.setValueAtTime(f, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.setValueAtTime(vol, t0 + Math.max(0.02, dur - 0.05));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master!);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

function drum(ctx: AudioContext, kind: string, t0: number): void {
  if (kind === 'k') {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t0); o.frequency.exponentialRampToValueAtTime(45, t0 + 0.12);
    g.gain.setValueAtTime(0.5, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
    o.connect(g).connect(master!); o.start(t0); o.stop(t0 + 0.16);
    return;
  }
  const src = ctx.createBufferSource(), g = ctx.createGain(), hp = ctx.createBiquadFilter();
  src.buffer = noise!;
  hp.type = 'highpass'; hp.frequency.value = kind === 'x' ? 7000 : 1800;
  const len = kind === 'x' ? 0.04 : 0.1;
  g.gain.setValueAtTime(kind === 'x' ? 0.12 : 0.25, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
  src.connect(hp).connect(g).connect(master!); src.start(t0); src.stop(t0 + len + 0.02);
}

// 곡마다 미리 풀어 둔 악보
const parsed = new Map<TrackId, { lead: ReturnType<typeof parse>; bass: ReturnType<typeof parse>; drum: string[]; steps: number }>();
function score(id: TrackId) {
  let p = parsed.get(id);
  if (!p) { const t = TRACKS[id]; p = { lead: parse(t.lead), bass: parse(t.bass), drum: t.drum ? tokens(t.drum) : [], steps: stepsOf(t) }; parsed.set(id, p); }
  return p;
}

function tick(): void {
  const ctx = audioCtx();
  if (!ctx || !current || !master) return;
  const t = TRACKS[current];
  const sp = score(current);
  const stepDur = 60 / t.bpm / 2;
  while (nextTime < ctx.currentTime + 0.15) {
    const s = step % sp.steps;
    const v = VOL * (t.vol ?? 1);
    for (const n of sp.lead) if (n.at === s) voice(ctx, n.f, nextTime, (t.staccato ? 0.5 : n.len) * stepDur, t.leadWave, v * 0.55);
    for (const n of sp.bass) if (n.at === s) voice(ctx, n.f, nextTime, n.len * stepDur * 0.95, 'triangle', v * 1.1);
    const d = sp.drum[s];
    if (d && d !== '.') drum(ctx, d, nextTime);
    nextTime += stepDur;
    step++;
  }
}

function start(id: TrackId): void {
  const ctx = ensure();
  if (!ctx || !master) return;
  current = id; step = 0; nextTime = ctx.currentTime + 0.08;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 0.4);
  if (!timer) timer = window.setInterval(tick, 40);
}

function stop(fade = 0.25): void {
  const ctx = audioCtx();
  if (ctx && master) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setValueAtTime(master.gain.value, ctx.currentTime); master.gain.linearRampToValueAtTime(0, ctx.currentTime + fade); }
  current = undefined;
  clearInterval(timer); timer = 0;
}

/** 지금 연주 중인 곡 (테스트·디버그용) */
export const nowPlaying = () => current;

/** 지금 장면의 곡 (같은 곡이면 그대로 이어서 연주) */
export function setTrack(id: TrackId | undefined): void {
  wanted = id;
  if (!enabled || audioCtx()?.state !== 'running' || id === current) return;
  if (!id) return stop();
  if (current) { stop(0.2); window.setTimeout(() => { if (wanted === id && enabled) start(id); }, 220); } else start(id);
}

export function setMusicEnabled(on: boolean): void {
  enabled = on;
  if (!on) stop();
  else if (wanted) setTrack(wanted);
}

/** 사용자가 처음 화면을 누른 뒤 호출 (브라우저 자동 재생 규칙) */
export function unlockMusic(): void {
  if (!enabled || current || !wanted) return;
  const ctx = ensure(true);
  if (!ctx) return;
  if (ctx.state === 'running') setTrack(wanted);
  else void ctx.resume().then(() => { if (wanted && !current) setTrack(wanted); });
}

// 앱이 뒤로 가면 멈추고 돌아오면 다시
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
  const ctx = audioCtx();
  if (!ctx) return;
  if (document.hidden) void ctx.suspend(); else void ctx.resume();
});
