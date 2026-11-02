// 재료 아이콘을 SVG로 그린다 (크레파스 질감).
//   npm run draw:ingredients  →  src/assets/art/ingredients/<id>.svg
// 색·모양을 고치려면 아래 DRAW에서 해당 재료만 수정하고 다시 실행.
import { mkdirSync, writeFileSync } from 'node:fs';
import { INGREDIENTS } from '../src/data/ingredients.ts';

const INK = '#4a3b30';
const C = {
  rice: '#fdf8ee', nori: '#34402f', egg: '#f6c445', eggDark: '#d9912a', green: '#6f9e4f', greenDark: '#4f7a37',
  greenLight: '#b9d68a', red: '#e0573f', redDark: '#b63a2a', orange: '#ef9a3c', brown: '#a8693a', brownDark: '#7a4626',
  bowl: '#e9eef4', bowlBand: '#7ea6c8', pink: '#f2a7a0', cream: '#f6e7c8', fish: '#f5efe4', blue: '#6f8fae', gold: '#e9b04a',
  yellow: '#f7d64a', purple: '#9b6aa8', white: '#ffffff',
};

/** 손떨림(윤곽 흔들림) + 약한 종이 결 */
const DEFS = `<defs><filter id="r" x="-10%" y="-10%" width="120%" height="120%">
<feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" result="n"/>
<feDisplacementMap in="SourceGraphic" in2="n" scale="5" result="d"/>
<feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="9" result="g"/>
<feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.7 1.3" result="ga"/>
<feComposite in="d" in2="ga" operator="in"/></filter></defs>`;

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">${DEFS}<g filter="url(#r)" stroke="${INK}" stroke-width="8" stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>\n`;

// ── 작은 도구들 ──
const dots = (pts: [number, number][], r: number, fill: string) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="none"/>`).join('');
const shine = (d: string, w = 9) => `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="${w}" opacity=".75"/>`;
/** 그릇: 몸통 + 테두리 안 내용물 */
const bowl = (content: string, inner = '') =>
  `<path d="M34 118 Q38 218 128 218 Q218 218 222 118Z" fill="${C.bowl}"/>` +
  `<path d="M60 168 Q128 186 196 168" fill="none" stroke="${C.bowlBand}" stroke-width="7"/>` +
  `<ellipse cx="128" cy="118" rx="94" ry="30" fill="${content}"/>${inner}`;

const DRAW: Record<string, string> = {
  // ─── 주식 ───
  formula:
    `<rect x="92" y="26" width="72" height="34" rx="14" fill="${C.pink}"/>` +
    `<rect x="78" y="56" width="100" height="26" rx="10" fill="${C.bowlBand}"/>` +
    `<path d="M84 82 L172 82 L176 210 Q176 230 156 230 L100 230 Q80 230 80 210Z" fill="${C.white}"/>` +
    `<path d="M82 140 L174 140 L176 210 Q176 230 156 230 L100 230 Q80 230 80 210Z" fill="${C.cream}"/>` +
    `<path d="M150 104 L166 104 M150 128 L166 128 M150 152 L166 152" stroke-width="5"/>` + shine('M98 98 L98 200'),
  porridge: bowl('#f1e2c0', `<path d="M96 112 Q112 100 128 112 Q144 124 160 112" fill="none" stroke="#fbf3e0" stroke-width="7"/>` +
    `<path d="M150 44 L172 110" stroke="#c9a26b" stroke-width="12"/><ellipse cx="146" cy="38" rx="18" ry="13" fill="#e0be8a"/>` +
    `<path d="M88 70 Q80 54 92 40 M112 66 Q104 50 116 36" fill="none" stroke="#b5aa9c" stroke-width="5" opacity=".7"/>`),
  rice: bowl(C.rice,
    `<path d="M44 118 Q60 52 128 50 Q196 52 212 118Z" fill="${C.rice}"/>` +
    dots([[96, 84], [128, 72], [160, 86], [110, 104], [146, 104], [178, 106], [78, 106]], 5, '#e6dccb') + shine('M76 98 Q90 70 116 62', 8)),
  riceball:
    `<path d="M128 30 C152 30 228 160 224 196 C221 224 196 228 128 228 C60 228 35 224 32 196 C28 160 104 30 128 30Z" fill="${C.rice}"/>` +
    `<path d="M82 156 L174 156 L178 228 L78 228Z" fill="${C.nori}"/>` +
    dots([[110, 96], [142, 110], [122, 128], [152, 84]], 5, '#d8cbb0') + shine('M66 150 Q78 118 96 100'),
  multigrain: bowl('#efe3d0',
    `<path d="M44 118 Q60 52 128 50 Q196 52 212 118Z" fill="#efe3d0"/>` +
    dots([[96, 84], [128, 72], [160, 86], [110, 104], [146, 102], [178, 106], [78, 106], [140, 88]], 6, C.purple) +
    dots([[118, 90], [168, 98], [92, 98], [150, 70]], 5, C.brownDark)),
  bread:
    `<path d="M50 96 Q34 40 92 36 Q128 18 164 36 Q222 40 206 96 L206 214 Q206 226 194 226 L62 226 Q50 226 50 214Z" fill="${C.gold}"/>` +
    `<path d="M70 104 Q58 60 100 58 Q128 44 156 58 Q198 60 186 104 L186 204 L70 204Z" fill="#fbecc8" stroke-width="0"/>` +
    dots([[100, 120], [140, 150], [120, 180], [160, 110], [96, 166]], 4, '#e8cf9a'),
  udon: bowl('#e9c27a',
    `<path d="M52 122 Q76 100 100 122 Q124 144 148 122 Q172 100 204 120" fill="none" stroke="#fff6dc" stroke-width="14"/>` +
    `<path d="M64 108 Q88 90 112 108 Q136 126 160 106 Q180 92 196 104" fill="none" stroke="#fff6dc" stroke-width="14"/>` +
    `<circle cx="162" cy="104" r="20" fill="#ffffff" stroke-width="5"/><path d="M154 104 a8 8 0 1 1 8 8" fill="none" stroke="#ef8ea0" stroke-width="5"/>` +
    `<path d="M76 100 L100 94 M88 132 L108 128" stroke="${C.greenDark}" stroke-width="7"/>`),
  gimbap: ([[74, 90], [182, 90], [128, 178]] as [number, number][]).map(([x, y]) =>
    `<circle cx="${x}" cy="${y}" r="56" fill="${C.nori}"/><circle cx="${x}" cy="${y}" r="44" fill="${C.rice}" stroke-width="0"/>` +
    `<rect x="${x - 22}" y="${y - 18}" width="18" height="16" fill="${C.yellow}" stroke-width="4"/>` +
    `<rect x="${x + 2}" y="${y - 20}" width="16" height="16" fill="${C.orange}" stroke-width="4"/>` +
    `<rect x="${x - 14}" y="${y + 2}" width="16" height="16" fill="${C.green}" stroke-width="4"/>` +
    `<rect x="${x + 6}" y="${y + 2}" width="14" height="14" fill="${C.pink}" stroke-width="4"/>`).join(''),

  // ─── 메인 ───
  beefpuree: bowl('#c98a74', `<path d="M90 116 Q110 100 128 114 Q146 128 166 112" fill="none" stroke="#e3b2a0" stroke-width="7"/>` +
    `<path d="M150 40 L176 108" stroke="${C.bowlBand}" stroke-width="12"/><ellipse cx="146" cy="34" rx="16" ry="12" fill="${C.bowlBand}"/>`),
  whitefish: `<path d="M30 150 Q60 80 140 82 Q206 84 230 130 Q214 180 140 186 Q66 190 30 150Z" fill="${C.fish}"/>` +
    `<path d="M80 110 Q96 134 82 166 M120 98 Q138 132 122 178 M162 100 Q178 132 164 172" fill="none" stroke="#ddcdb3" stroke-width="7"/>` +
    `<path d="M174 170 L222 170 A24 24 0 0 1 174 170Z" fill="${C.yellow}" stroke-width="6"/><path d="M198 172 L198 186 M186 172 L180 182 M210 172 L216 182" stroke="#e2b93a" stroke-width="4"/>`,
  egg:
    `<rect x="20" y="70" width="106" height="122" rx="22" fill="${C.egg}"/><rect x="132" y="62" width="106" height="122" rx="22" fill="${C.egg}"/>` +
    [[73, 131], [185, 123]].map(([x, y]) => `<path d="M${x - 28} ${y} a28 30 0 1 0 56 0 a20 22 0 1 0 -40 0 a12 13 0 1 0 24 0" fill="none" stroke="${C.eggDark}" stroke-width="7"/>`).join('') +
    dots([[52, 98], [102, 166], [166, 88], [214, 158]], 6, C.green),
  tofu: `<rect x="26" y="64" width="100" height="100" rx="12" fill="#e2a94a"/><rect x="132" y="92" width="100" height="100" rx="12" fill="#e2a94a"/>` +
    `<rect x="42" y="80" width="68" height="68" rx="8" fill="#fff3d6" stroke-width="0"/><rect x="148" y="108" width="68" height="68" rx="8" fill="#fff3d6" stroke-width="0"/>` +
    `<path d="M62 104 L84 96 M168 134 L190 126" stroke="${C.green}" stroke-width="8"/>` + dots([[90, 128], [64, 130], [196, 154], [176, 160]], 4, '#c9a26b'),
  chicken: [0, 1, 2, 3].map((i) => `<path d="M${40 + i * 44} 70 Q${70 + i * 44} 62 ${84 + i * 44} 84 L${84 + i * 44} 196 Q${62 + i * 44} 210 ${40 + i * 44} 196Z" fill="#f0cf9e"/>` +
      `<path d="M${48 + i * 44} 92 L${76 + i * 44} 84 M${48 + i * 44} 128 L${76 + i * 44} 120 M${48 + i * 44} 164 L${76 + i * 44} 156" stroke="#b27a3e" stroke-width="6"/>` +
      `<path d="M${52 + i * 44} 80 L${52 + i * 44} 190" stroke="#fbeedb" stroke-width="0"/>`).join('') +
    `<path d="M190 208 Q206 196 222 208 L216 226 L196 226Z" fill="${C.greenLight}" stroke-width="6"/>`,
  bulgogi:
    `<path d="M30 170 Q40 96 128 92 Q216 96 226 170 Q200 214 128 216 Q56 214 30 170Z" fill="${C.brown}"/>` +
    `<path d="M66 150 Q96 126 124 152 M118 128 Q150 108 182 136 M84 186 Q118 164 150 190 M152 170 Q180 156 200 176" fill="none" stroke="${C.brownDark}" stroke-width="9"/>` +
    `<path d="M70 120 Q90 108 104 124 M160 182 Q176 168 190 184" fill="none" stroke="#f5e6c4" stroke-width="7"/>` +
    `<path d="M100 104 L120 96 M150 112 L170 106" stroke="${C.green}" stroke-width="8"/>` + dots([[110, 160], [168, 150], [136, 196]], 4, '#f5e6c4'),
  mackerel: `<path d="M24 132 Q70 70 150 76 Q200 80 214 128 L246 98 L240 168 L214 144 Q198 188 140 190 Q66 192 24 132Z" fill="${C.blue}"/>` +
    `<path d="M50 132 Q100 112 200 124 Q120 170 50 132Z" fill="#d7c3a4" stroke-width="5"/>` +
    `<path d="M80 96 Q96 110 110 94 M120 88 Q136 104 150 88 M160 92 Q172 104 184 96" fill="none" stroke="#3f5a74" stroke-width="6"/>` +
    dots([[56, 118]], 7, C.white) + `<path d="M120 188 L176 188 A28 28 0 0 1 120 188Z" fill="${C.yellow}" stroke-width="6"/>`,
  sausage: ([[78, 100], [176, 104], [128, 176]] as [number, number][]).map(([x, y]) =>
    `<path d="M${x - 40} ${y + 6} Q${x - 40} ${y - 46} ${x} ${y - 46} Q${x + 40} ${y - 46} ${x + 40} ${y + 6}` +
    ` L${x + 36} ${y + 40} L${x + 22} ${y + 10} L${x + 12} ${y + 44} L${x} ${y + 12} L${x - 12} ${y + 44} L${x - 22} ${y + 10} L${x - 36} ${y + 40}Z" fill="${C.red}"/>` +
    dots([[x - 12, y - 14], [x + 12, y - 14]], 5, INK) + shine(`M${x - 24} ${y - 26} Q${x - 18} ${y - 36} ${x - 6} ${y - 38}`, 6)).join(''),
  tonkatsu: [0, 1, 2, 3].map((i) => `<path d="M${28 + i * 50} ${72 + i * 8} L${78 + i * 50} ${72 + i * 8} L${82 + i * 50} ${198 - i * 2} L${30 + i * 50} ${198 - i * 2}Z" fill="#d99a3a"/>` +
      `<path d="M${40 + i * 50} ${86 + i * 8} L${66 + i * 50} ${86 + i * 8} L${70 + i * 50} ${184 - i * 2} L${42 + i * 50} ${184 - i * 2}Z" fill="#f6e6c6" stroke-width="0"/>`).join('') +
    dots([[42, 78], [66, 76], [96, 86], [120, 84], [146, 94], [170, 92], [196, 102], [220, 100], [50, 192], [150, 190]], 4, '#a7672a') +
    `<path d="M40 132 L64 116 L88 136 L112 120 L136 142 L160 126 L184 146 L208 130 L226 146" fill="none" stroke="${C.brownDark}" stroke-width="9"/>`,
  jeyuk:
    `<path d="M30 170 Q40 96 128 92 Q216 96 226 170 Q200 214 128 216 Q56 214 30 170Z" fill="${C.red}"/>` +
    `<path d="M66 150 Q96 126 124 152 M118 128 Q150 108 182 136 M84 186 Q118 164 150 190 M152 170 Q180 156 200 176" fill="none" stroke="${C.redDark}" stroke-width="9"/>` +
    `<path d="M70 122 Q90 110 104 126 M160 184 Q176 170 190 186" fill="none" stroke="#f5e6c4" stroke-width="7"/>` +
    `<path d="M96 106 L114 98 M150 112 L168 104 M126 184 L142 178" stroke="${C.green}" stroke-width="8"/>` + dots([[110, 162], [170, 150]], 4, '#f5e6c4'),

  // ─── 반찬 ───
  pumpkin: [0, 1, 2].map((i) => `<path d="M${36 + i * 62} 200 Q${44 + i * 62} 80 ${96 + i * 62} 60 L${104 + i * 62} 70 Q${64 + i * 62} 120 ${74 + i * 62} 206Z" fill="${C.orange}"/>` +
    `<path d="M${36 + i * 62} 200 Q${44 + i * 62} 80 ${96 + i * 62} 60" fill="none" stroke="${C.greenDark}" stroke-width="12"/>`).join(''),
  banana:
    `<path d="M40 70 Q60 196 196 190 Q220 186 222 172 Q120 168 84 64 Q70 52 52 56Z" fill="${C.yellow}"/>` +
    `<path d="M40 70 L30 52 L52 46" fill="${C.brownDark}" stroke-width="6"/><path d="M196 190 L214 196" stroke="${C.brownDark}" stroke-width="10"/>` +
    `<path d="M76 104 Q100 166 180 176" fill="none" stroke="#e2b93a" stroke-width="6"/>` + shine('M58 84 Q66 124 92 152', 7),
  broccoli:
    `<path d="M108 140 L96 224 Q128 234 160 224 L148 140Z" fill="${C.greenLight}"/>` +
    `<g fill="${C.green}"><circle cx="80" cy="110" r="42"/><circle cx="176" cy="110" r="42"/><circle cx="128" cy="74" r="48"/><circle cx="128" cy="132" r="38"/></g>` +
    dots([[110, 66], [150, 88], [74, 118], [182, 122], [130, 140], [96, 92]], 7, C.greenDark) + shine('M98 54 Q112 40 130 38', 8),
  spinach:
    `<path d="M30 180 Q60 110 128 104 Q196 110 226 180 Q190 214 128 214 Q66 214 30 180Z" fill="${C.greenDark}"/>` +
    `<path d="M60 170 Q90 130 120 160 M110 140 Q140 112 170 146 M150 176 Q176 150 200 172 M80 196 Q110 176 140 198" fill="none" stroke="${C.green}" stroke-width="10"/>` +
    `<path d="M120 124 L132 100 L140 122" fill="none" stroke="${C.pink}" stroke-width="8"/>` + dots([[96, 150], [150, 160], [176, 132], [120, 186]], 4, '#f5e6c4'),
  potato: ([[70, 110], [150, 92], [104, 176], [184, 166]] as [number, number][]).map(([x, y]) =>
    `<path d="M${x - 34} ${y - 26} L${x + 30} ${y - 32} L${x + 36} ${y + 28} L${x - 28} ${y + 34}Z" fill="#d79b55"/>` +
    shine(`M${x - 22} ${y - 16} L${x + 10} ${y - 20}`, 6)).join('') + dots([[120, 136], [64, 160]], 4, '#f5e6c4'),
  tomato: ([[88, 130], [170, 150]] as [number, number][]).map(([x, y]) =>
    `<circle cx="${x}" cy="${y}" r="56" fill="${C.red}"/>` +
    `<path d="M${x - 22} ${y - 56} L${x} ${y - 44} L${x + 22} ${y - 56} L${x + 10} ${y - 36} L${x} ${y - 46} L${x - 10} ${y - 36}Z" fill="${C.green}" stroke-width="5"/>` +
    shine(`M${x - 32} ${y - 14} Q${x - 30} ${y - 32} ${x - 14} ${y - 38}`)).join(''),
  anchovy:
    `<path d="M30 180 Q50 120 128 116 Q206 120 226 180 Q190 212 128 212 Q66 212 30 180Z" fill="#c78a3f"/>` +
    ([[70, 150, -10], [120, 140, 15], [170, 156, -20], [96, 184, 5], [150, 188, 25], [190, 176, -5], [110, 162, -30]] as [number, number, number][]).map(([x, y, a]) =>
      `<g transform="rotate(${a} ${x} ${y})"><path d="M${x - 26} ${y} Q${x} ${y - 10} ${x + 22} ${y} Q${x} ${y + 10} ${x - 26} ${y}Z M${x + 22} ${y} L${x + 32} ${y - 8} L${x + 32} ${y + 8}Z" fill="#e8d3a6" stroke-width="5"/>` +
      `<circle cx="${x - 16}" cy="${y - 1}" r="2.5" fill="${INK}" stroke="none"/></g>`).join('') + dots([[90, 130], [160, 132], [130, 200]], 4, '#f5e6c4'),
  jelly: ([[74, 104, C.red], [178, 100, C.yellow], [96, 186, C.green], [176, 182, C.purple]] as [number, number, string][]).map(([x, y, c]) =>
    `<circle cx="${x - 20}" cy="${y - 30}" r="12" fill="${c}"/><circle cx="${x + 20}" cy="${y - 30}" r="12" fill="${c}"/>` +
    `<path d="M${x - 30} ${y - 14} Q${x} ${y - 46} ${x + 30} ${y - 14} Q${x + 36} ${y + 34} ${x} ${y + 38} Q${x - 36} ${y + 34} ${x - 30} ${y - 14}Z" fill="${c}"/>` +
    dots([[x - 9, y - 16], [x + 9, y - 16]], 3.5, INK) + shine(`M${x - 18} ${y - 2} Q${x - 18} ${y + 14} ${x - 10} ${y + 22}`, 6)).join(''),
  nuts:
    ([[74, 96, 20], [180, 110, -25], [100, 184, -10]] as [number, number, number][]).map(([x, y, a]) =>
      `<g transform="rotate(${a} ${x} ${y})"><path d="M${x} ${y - 46} Q${x + 34} ${y - 10} ${x + 22} ${y + 24} Q${x} ${y + 40} ${x - 22} ${y + 24} Q${x - 34} ${y - 10} ${x} ${y - 46}Z" fill="#c98b4e"/>` +
      `<path d="M${x - 8} ${y - 20} Q${x - 12} ${y} ${x - 6} ${y + 18} M${x + 8} ${y - 18} Q${x + 12} ${y} ${x + 6} ${y + 16}" fill="none" stroke="#a46a34" stroke-width="5"/></g>`).join('') +
    `<path d="M150 164 Q150 140 178 142 Q206 140 206 166 Q212 196 178 204 Q144 198 150 164Z" fill="#b98352"/>` +
    `<path d="M178 146 L178 200 M160 160 Q170 170 160 186 M196 160 Q186 170 196 186" fill="none" stroke="#8a5a2e" stroke-width="5"/>`,
  kimchi:
    `<path d="M30 176 Q50 104 128 100 Q206 104 226 176 Q190 212 128 212 Q66 212 30 176Z" fill="${C.red}"/>` +
    `<path d="M60 160 Q96 120 132 150 Q160 124 196 158" fill="none" stroke="#f3d6b8" stroke-width="16"/>` +
    `<path d="M76 190 Q110 168 150 192 Q172 176 196 186" fill="none" stroke="#f3d6b8" stroke-width="12"/>` +
    `<path d="M70 132 Q96 112 120 126" fill="none" stroke="${C.redDark}" stroke-width="8"/>` + dots([[100, 176], [160, 140], [176, 176], [80, 150]], 4, C.redDark),
};

const outDir = new URL('../src/assets/art/ingredients/', import.meta.url);
mkdirSync(outDir, { recursive: true });
const missing = INGREDIENTS.filter((i) => !DRAW[i.id]).map((i) => i.id);
if (missing.length) throw new Error(`no drawing for: ${missing.join(', ')}`);
for (const i of INGREDIENTS) writeFileSync(new URL(`${i.id}.svg`, outDir), svg(DRAW[i.id]));
console.log(`drew ${INGREDIENTS.length} ingredients`);
