/** 재료 도트 아이콘 (16×16). 글자 하나가 한 칸, '.'은 빈칸 */
import { Grid, type Color } from './grid.ts';
import { P } from './palette.ts';

const pal: Record<string, Color> = {
  w: P.rice, s: P.riceShade, B: P.sky, b: P.cream, l: P.skyDark, d: P.creamDark,
  n: P.nori, N: P.noriHi, Y: P.egg, E: P.eggDark, G: P.green, g: P.greenDark, L: P.greenLight,
  R: P.red, r: P.redDark, e: P.eye, p: P.pink, o: P.mustard, h: P.white,
};

const MAPS: Record<string, string[]> = {
  rice: [
    '................',
    '.....whwwww.....',
    '...wwhwwwswww...',
    '..wwwwwswwwwww..',
    '..wswwwwwwwsww..',
    '.BBBBBBBBBBBBBB.',
    '.bbbbbbbbbbbbbb.',
    '..bllllllllllb..',
    '..bbbbbbbbbbbb..',
    '...bbbbbbbbbb...',
    '....bbbbbbbb....',
    '.....dddddd.....',
  ],
  riceball: [
    '.......ww.......',
    '......whww......',
    '.....whwwww.....',
    '....wwwwwwsw....',
    '....wwswwwww....',
    '...wwwwwwwwww...',
    '...wwwwwwwsww...',
    '..wwwwwwwwwwww..',
    '..wwwwnnnnwwww..',
    '.wwwwnnNnnnwwww.',
    '.wwwwnnnnnnwwww.',
    '.swwwnnnnnnwwws.',
    '..ssnnnnnnnnss..',
  ],
  egg: [
    '................',
    '..EEEEEEEEEEEE..',
    '..EYYYYYYYYYYE..',
    '..EYhEEEEEEEYE..',
    '..EYEYYYYYYEYE..',
    '..EYEYEEEEYEYE..',
    '..EYEYEYYEYEYE..',
    '..EYEYEEEEYEYE..',
    '..EYEYYYYYYEYE..',
    '..EYEEEEEEEEYE..',
    '..EYYYYYYYYYYE..',
    '..EEEEEEEEEEEE..',
  ],
  broccoli: [
    '......GG.GG.....',
    '....GGGGGGGGG...',
    '...GGLGGGGGGGG..',
    '..GGGGGGgGGLGGG.',
    '..GGgGGGGGGGGGG.',
    '.GGGGGLGGGgGGGG.',
    '..GGGGGGGGGGGG..',
    '...gGGgGGGgGG...',
    '.....gLLLLg.....',
    '......LLLL......',
    '......LLLL......',
    '.....LLLLLL.....',
    '......LLLL......',
  ],
  sausage: [
    '................',
    '.....RRRRRR.....',
    '....RRhRRRRR....',
    '...RRhRRRRRRR...',
    '...RReRRRReRR...',
    '...RRRRppRRRR...',
    '...RRRRRRRRRR...',
    '...rRRRRRRRRr...',
    '...RRrRRRRrRR...',
    '...R.R.RR.R.R...',
    '..R..R.RR.R..R..',
    '..r.r..rr..r.r..',
  ],
  gimbap: [
    '.....nnnnnn.....',
    '...nnNnnnnnnn...',
    '..nnwwwwwwwwnn..',
    '..nwwwwwwwwwwn..',
    '.nnwwYYGGGwwwnn.',
    '.nwwwYYGGGwwwwn.',
    '.nwwwoopRRwwwwn.',
    '.nwwwoopRRwwwwn.',
    '.nnwwwwwwwwwwnn.',
    '..nwwwswwwwwwn..',
    '..nnwwwwwwwwnn..',
    '...nnnnnnnnnn...',
    '.....nnnnnn.....',
  ],
};

export const PX_FOODS = Object.keys(MAPS);

export function food(id: string): Grid {
  const g = new Grid(16, 16);
  const rows = MAPS[id];
  g.stamp(rows, 0, Math.floor((16 - rows.length) / 2) + 1, pal);
  return g.outline(P.ink);
}
