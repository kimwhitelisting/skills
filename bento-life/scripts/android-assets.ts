// 안드로이드 앱 아이콘·시작 화면·세로 고정을 android/ 폴더에 넣는다:  npm run android:assets
// (android 폴더를 새로 만든 뒤에도 이것만 다시 돌리면 같은 모습이 된다 — npm run android:reset 이 같이 돌린다)
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { childFront } from '../src/pixel/child.ts';
import { Grid } from '../src/pixel/grid.ts';
import { P } from '../src/pixel/palette.ts';
import { bentoLid } from '../src/pixel/scenes.ts';
import { gridToPng } from './png.ts';

const RES = new URL('../android/app/src/main/res/', import.meta.url);
if (!existsSync(RES)) throw new Error('android 폴더가 없습니다. 먼저 npx cap add android');
const BG = '#f6e7cf';

/** 작은 도시락 (보자기 매듭) */
function miniBento(w: number, h: number): Grid {
  const g = new Grid(w, h + 3).rect(0, 3, w, h, P.tomato);
  for (let i = -h; i < w; i += 3) for (let j = 0; j < h; j++) g.set(i + j, 3 + j, P.tomatoDark);
  const cx = Math.floor(w / 2);
  g.rect(cx - 3, 4, 6, 4, P.mustard).set(cx - 4, 2, P.mustard).set(cx - 5, 1, P.mustard).set(cx + 3, 2, P.mustard).set(cx + 4, 1, P.mustard).rect(cx - 1, 5, 2, 2, P.mustardDark);
  return g.outline(P.ink);
}
/** 아이 얼굴만 (보자기 뒤로 빼꼼) */
function kidHead(): Grid {
  const kid = childFront({ age: 7, gender: 'girl' }, 'happy', { plain: true });
  return new Grid(24, 18).draw(kid, 0, -9);
}

/** 아이콘 그림: size칸 정사각형, 내용은 가운데 inner칸 안에 */
function iconArt(size: number, inner: number, bg: string | null): Grid {
  const g = new Grid(size, size);
  if (bg) g.rect(0, 0, size, size, bg);
  const off = Math.floor((size - inner) / 2);
  const bw = Math.round(inner * 0.8), bh = Math.round(inner * (inner >= 30 ? 0.42 : 0.3));
  const head = kidHead();
  const hx = off + Math.floor((inner - head.w) / 2), hy = off + Math.round(inner * 0.08);
  if (inner >= 30) g.draw(head, hx, hy);
  else g.draw(new Grid(16, 12).draw(head, -4, 0), off + Math.floor((inner - 16) / 2), off);
  g.draw(miniBento(bw, bh), off + Math.floor((inner - bw) / 2), off + inner - bh - 3);
  return g;
}
const circle = (g: Grid) => { const r = g.w / 2; g.px.forEach((_, i) => { const x = i % g.w, y = Math.floor(i / g.w); if ((x + 0.5 - r) ** 2 + (y + 0.5 - r) ** 2 > r * r) g.px[i] = null; }); return g; };
const DPI: [string, number][] = [['mdpi', 2], ['hdpi', 3], ['xhdpi', 4], ['xxhdpi', 6], ['xxxhdpi', 8]];

// 1) 예전 방식 아이콘 48dp (24칸 × 배율) — 네모·동그라미
for (const [d, k] of DPI) {
  writeFileSync(new URL(`mipmap-${d}/ic_launcher.png`, RES), gridToPng(iconArt(24, 22, BG), k));
  writeFileSync(new URL(`mipmap-${d}/ic_launcher_round.png`, RES), gridToPng(circle(iconArt(24, 20, BG)), k));
  // 2) 적응형 아이콘 앞면 108dp (54칸) — 안전 영역 66dp(33칸) 안에
  writeFileSync(new URL(`mipmap-${d}/ic_launcher_foreground.png`, RES), gridToPng(iconArt(54, 34, null), k));
}
writeFileSync(new URL('values/ic_launcher_background.xml', RES), `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG.toUpperCase()}</color>\n</resources>\n`);
const vector = new URL('drawable-v24/ic_launcher_foreground.xml', RES);
if (existsSync(vector)) rmSync(vector);

// 3) 시작 화면: 크림색 바탕 + 보자기 도시락 + 아이 (정수 배율로)
function splash(w: number, h: number): Grid {
  const lid = bentoLid(), kid = childFront({ age: 7, gender: 'girl' }, 'happy', { plain: true }), kid2 = childFront({ age: 7, gender: 'boy' }, 'happy', { plain: true });
  const art = new Grid(120, 52).draw(kid, 2, 12).draw(lid, 31, 12).draw(kid2, 94, 12);
  const k = Math.max(1, Math.floor(Math.min(w * 0.7 / art.w, h * 0.5 / art.h)));
  const g = new Grid(w, h).rect(0, 0, w, h, BG);
  const ox = Math.floor((w - art.w * k) / 2), oy = Math.floor((h - art.h * k) / 2);
  for (let y = 0; y < art.h; y++) for (let x = 0; x < art.w; x++) { const c = art.get(x, y); if (c) g.rect(ox + x * k, oy + y * k, k, k, c); }
  return g;
}
const PORT: [string, number, number][] = [['mdpi', 320, 480], ['hdpi', 480, 800], ['xhdpi', 720, 1280], ['xxhdpi', 960, 1600], ['xxxhdpi', 1280, 1920]];
for (const [d, w, h] of PORT) {
  writeFileSync(new URL(`drawable-port-${d}/splash.png`, RES), gridToPng(splash(w, h)));
  writeFileSync(new URL(`drawable-land-${d}/splash.png`, RES), gridToPng(splash(h, w)));
}
writeFileSync(new URL('drawable/splash.png', RES), gridToPng(splash(480, 800)));

// 4) 세로 고정
const manifest = new URL('../AndroidManifest.xml', RES);
let m = readFileSync(manifest, 'utf8');
if (!m.includes('android:screenOrientation')) m = m.replace('android:name=".MainActivity"', 'android:name=".MainActivity"\n            android:screenOrientation="portrait"');
writeFileSync(manifest, m);
console.log('android 아이콘·시작 화면·세로 고정 완료');
