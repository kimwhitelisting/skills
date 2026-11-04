// 미리보기 페이지용 단일 HTML 만들기:  npm run build:preview  →  dist-preview/<entry>.single.html
// (claude.ai 아티팩트는 <html>/<head>/<body> 없이 내용만 쓰고, 스크립트·스타일은 안에 넣어야 한다)
import { readFileSync, writeFileSync } from 'node:fs';

const entry = process.argv[2] ?? 'preview';
const dir = new URL(`../dist-preview/${entry}/`, import.meta.url);
const html = readFileSync(new URL(`${entry}.html`, dir), 'utf8');
const title = html.match(/<title>([^<]+)<\/title>/)![1];
const cssHref = html.match(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"/)?.[1];
const jsSrc = html.match(/<script type="module"[^>]*src="\.\/(assets\/[^"]+\.js)"/)?.[1];
if (!cssHref || !jsSrc) throw new Error(`built css/js not found in ${entry}.html`);
const css = readFileSync(new URL(cssHref, dir), 'utf8');
const js = readFileSync(new URL(jsSrc, dir), 'utf8').replace(/<\/script/gi, '<\\/script');
const body = html.match(/<body>([\s\S]*?)<\/body>/)![1].trim();

const page = `<title>${title}</title>
<meta name="description" content="도시락 싸들고 졸졸 따라다니면 아이를 얼마나 잘 키울 수 있을까? — 개발 중인 미리보기">
${html.includes('fonts.googleapis.com') ? '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gaegu:wght@700&family=Gowun+Dodum&display=swap">' : ''}
<style>${css}
/* 미리보기 페이지는 바깥 틀이 이미 상하 안전 영역을 비워 준다 */
body { padding-top: 0; padding-bottom: 0; }
</style>
${body}
<script type="module">${js}</script>
`;
writeFileSync(new URL(`../${entry}.single.html`, dir), page);
console.log(`${entry}: ${(page.length / 1024).toFixed(0)} KB → dist-preview/${entry}.single.html`);
