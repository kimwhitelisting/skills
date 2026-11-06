// 기존 스토어/Android 도트 아트로 iOS 아이콘·시작 화면을 재현한다.
// 실행: npx vite-node scripts/ios-assets.ts (Xcode나 서명 불필요)
import { existsSync, writeFileSync } from 'node:fs';
import { childFront } from '../src/pixel/child.ts';
import { Grid } from '../src/pixel/grid.ts';
import { P } from '../src/pixel/palette.ts';
import { bentoLid } from '../src/pixel/scenes.ts';
import { gridToPng } from './png.ts';

const ASSETS = new URL('../ios/App/App/Assets.xcassets/', import.meta.url);
if (!existsSync(ASSETS)) throw new Error('iOS Assets.xcassets 폴더가 없습니다');
const BG = '#f6e7cf'; // 기존 Android·스토어 아이콘과 같은 바탕

// scripts/store-art.ts의 64칸 아이콘 원본. 정수 16배로 1024px을 만든다.
const kid = childFront({ age: 7, gender: 'girl' }, 'happy', { plain: true });
const icon = new Grid(64, 64).rect(0, 0, 64, 64, BG);
icon.draw(new Grid(24, 18).draw(kid, 0, -9), 20, 18);
const lid = new Grid(44, 22).rect(0, 3, 44, 19, P.tomato);
for (let i = -22; i < 44; i += 3) for (let j = 0; j < 19; j++) lid.set(i + j, 3 + j, P.tomatoDark);
lid.rect(18, 4, 8, 5, P.mustard).set(16, 2, P.mustard).set(15, 1, P.mustard)
  .set(27, 2, P.mustard).set(28, 1, P.mustard).rect(21, 6, 2, 2, P.mustardDark);
icon.draw(lid.outline(P.ink), 10, 34);
writeFileSync(new URL('AppIcon.appiconset/AppIcon-512@2x.png', ASSETS), gridToPng(icon, 16, 'rgb'));

// scripts/android-assets.ts와 같은 아이 둘·도시락 장면. 정사각형 중앙에
// 작게 두어 세로 화면의 aspectFill 잘림에도 그림이 안전 영역 안에 남는다.
const art = new Grid(120, 52)
  .draw(childFront({ age: 7, gender: 'girl' }, 'happy', { plain: true }), 2, 12)
  .draw(bentoLid(), 31, 12)
  .draw(childFront({ age: 7, gender: 'boy' }, 'happy', { plain: true }), 94, 12);
const size = 2732, scale = 8;
const splash = new Grid(size, size).rect(0, 0, size, size, '#f3e2c6');
const ox = Math.floor((size - art.w * scale) / 2), oy = Math.floor((size - art.h * scale) / 2);
for (let y = 0; y < art.h; y++) for (let x = 0; x < art.w; x++) {
  const c = art.get(x, y);
  if (c) splash.rect(ox + x * scale, oy + y * scale, scale, scale, c);
}
const splashPng = gridToPng(splash, 1, 'rgb');
// 기존 asset catalog의 1x/2x/3x 파일 이름을 유지한다.
for (const filename of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
  writeFileSync(new URL(`Splash.imageset/${filename}`, ASSETS), splashPng);
}
console.log('iOS 불투명 RGB 아이콘 1024px·시작 화면 2732px 생성 완료');
