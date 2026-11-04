/** 효과음(외부 파일 없이 WebAudio로 합성)과 진동 */
import type { Prefs } from './prefs.ts';

let ctx: AudioContext | undefined;
let prefs: Pick<Prefs, 'sound' | 'haptics'> = { sound: true, haptics: true };
export const setFeedbackPrefs = (p: Pick<Prefs, 'sound' | 'haptics'>) => { prefs = p; };

function tone(freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; to?: number; delay?: number } = {}) {
  if (!ctx) return;
  const t0 = ctx.currentTime + (opts.delay ?? 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(opts.vol ?? 0.12, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export type Sfx = 'pop' | 'pack' | 'ding' | 'chime' | 'tap';

export function sfx(name: Sfx): void {
  if (!prefs.sound) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch { return; }
  switch (name) {
    case 'tap': tone(660, 0.05, { type: 'triangle', vol: 0.05 }); break;
    case 'pop': tone(420, 0.09, { type: 'triangle', vol: 0.14, to: 840 }); break;
    case 'pack': tone(392, 0.1, { type: 'triangle', vol: 0.12 }); tone(587, 0.16, { type: 'triangle', vol: 0.12, delay: 0.08 }); break;
    case 'ding': tone(988, 0.18, { vol: 0.1 }); tone(1319, 0.28, { vol: 0.1, delay: 0.1 }); break;
    case 'chime': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, { vol: 0.08, delay: i * 0.09 })); break;
  }
}

export function haptic(ms = 12): void {
  if (!prefs.haptics) return;
  try { navigator.vibrate?.(ms); } catch { /* 미지원 */ }
}
