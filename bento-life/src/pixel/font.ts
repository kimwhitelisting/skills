// 도트 글꼴(갈무리, OFL-1.1)을 페이지에 등록한다
import g11 from 'galmuri/dist/Galmuri11.woff2?url';
import g11b from 'galmuri/dist/Galmuri11-Bold.woff2?url';

let loaded = false;
export function loadPixelFont(): void {
  if (loaded) return;
  loaded = true;
  for (const [src, weight] of [[g11, '400'], [g11b, '700']] as const) {
    new FontFace('Galmuri11', `url(${src})`, { weight }).load().then((f) => document.fonts.add(f)).catch(() => { /* 기본 글꼴로 */ });
  }
}
