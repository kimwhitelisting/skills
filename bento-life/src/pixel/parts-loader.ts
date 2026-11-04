/**
 * 사람이 고친 부품 PNG 불러오기 (브라우저).
 * src/assets/pixel/parts/<키>.png 가 있으면 코드 그림 대신 그 그림을 쓴다.
 * 키 형식은 art-src/pixel-parts/ 에 뽑아 둔 원본 파일 이름과 같다 (예: front-7-girl-hair.png).
 */
import { PART_OVERRIDES } from './child.ts';
import { Grid } from './grid.ts';

const files = import.meta.glob<string>('../assets/pixel/parts/*.png', { eager: true, query: '?url', import: 'default' });

const hex = (n: number) => n.toString(16).padStart(2, '0');

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((ok, fail) => { const im = new Image(); im.onload = () => ok(im); im.onerror = fail; im.src = url; });
}

/** 부품 PNG를 모두 읽어 PART_OVERRIDES에 넣는다. 읽은 개수를 돌려준다 */
export async function loadPartOverrides(): Promise<number> {
  let n = 0;
  await Promise.all(Object.entries(files).map(async ([path, url]) => {
    const key = path.split('/').pop()!.replace(/\.png$/, '');
    try {
      const im = await loadImage(url);
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(im, 0, 0);
      const d = ctx.getImageData(0, 0, im.width, im.height).data;
      const g = new Grid(im.width, im.height);
      for (let i = 0; i < im.width * im.height; i++) {
        const a = d[i * 4 + 3];
        g.px[i] = a < 128 ? null : `#${hex(d[i * 4])}${hex(d[i * 4 + 1])}${hex(d[i * 4 + 2])}`;
      }
      PART_OVERRIDES.set(key, g);
      n++;
    } catch { /* 깨진 파일은 무시하고 코드 그림 사용 */ }
  }));
  return n;
}
