// 스토어 스크린샷 1080×1920 (360×640 화면 × 3배) → art-src/store/screen-*.png
//   npm run store:shots  (먼저 npm run build:preview 로 dist-preview/preview.single.html 을 만든다)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const file = path.join(root, 'dist-preview/preview.single.html');
const states = JSON.parse(fs.readFileSync(path.join(root, 'art-src/store/.states.json'), 'utf8'));
const out = (n) => path.join(root, `art-src/store/screen-${n}.png`);
const PREFS = { seenIntro: true, seenTips: ['baby', 'morning', 'leave-small', 'leave', 'teen', 'evening', 'summary', 'warn'], sound: false, music: false };
(async () => {
  const b = await chromium.launch();
  const open = async (run, dex) => {
    const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 });
    await ctx.addInitScript(([run, dex, prefs]) => {
      if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1');
      if (run) localStorage.setItem('bento-life:run:v2', JSON.stringify(run));
      localStorage.setItem('bento-life:prefs:v1', JSON.stringify(prefs));
      localStorage.setItem('bento-life:dex:v1', JSON.stringify({ menus: [], endings: ['happy', 'chef', 'kangaroo'], events: [], plays: 3, hearts: 1240, owned: ['theme-berry'], equip: {}, photos: dex ?? {}, ...{} }));
    }, [run, dex, PREFS]);
    const p = await ctx.newPage();
    await p.goto('file://' + file); await p.waitForSelector('[data-act=new]');
    return { ctx, p };
  };
  const shot = async (p, n) => { await p.waitForTimeout(600); await p.screenshot({ path: out(n) }); console.log('screen', n); };
  // 1 타이틀
  { const { ctx, p } = await open(null); await shot(p, '1-title'); await ctx.close(); }
  // 2 아침 부엌 (두 칸 채운 상태)
  { const { ctx, p } = await open(states.morning); await p.click('[data-act=continue]'); await p.waitForTimeout(300); await p.locator('[data-ing]').nth(0).click(); await p.locator('[data-ing]').nth(2).click(); await shot(p, '2-morning'); await ctx.close(); }
  // 3 배웅
  { const { ctx, p } = await open(states.leave); await p.click('[data-act=continue]'); await shot(p, '3-leave'); await ctx.close(); }
  // 4 등굣길 (조금 걸은 뒤)
  { const { ctx, p } = await open(states.leave); await p.click('[data-act=continue]'); await p.waitForTimeout(300);
    await p.click('[data-act=leave][data-v=follow]'); await p.waitForSelector('[data-act=start]'); await p.click('[data-act=start]');
    const hb = await (await p.$('#hold')).boundingBox(); await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    // 출발 직후 1초쯤 걸어서 아이와 딱 좋은 거리일 때 찍는다
    await p.mouse.down(); await p.waitForTimeout(1100);
    await p.mouse.up(); await p.screenshot({ path: out('4-commute') }); console.log('screen 4-commute'); await ctx.close(); }
  // 5 이벤트
  { const { ctx, p } = await open(states.event); await p.click('[data-act=continue]'); await shot(p, '5-event'); await ctx.close(); }
  // 6 결산 + 올해의 한 장면
  { const { ctx, p } = await open(states.summary, states.dexPhotos); await p.click('[data-act=continue]'); await shot(p, '6-summary'); await ctx.close(); }
  // 7 사진첩
  { const { ctx, p } = await open(states.final, states.dexPhotos); await p.click('[data-act=continue]'); await p.waitForTimeout(300); await p.click('.px-photo-card [data-act=album]'); await shot(p, '7-album'); await ctx.close(); }
  // 8 엔딩
  { const { ctx, p } = await open(states.final, states.dexPhotos); await p.click('[data-act=continue]'); await p.waitForTimeout(300); await p.click('[data-act=year]'); await shot(p, '8-ending'); await ctx.close(); }
  await b.close();
})();
