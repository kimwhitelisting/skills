import { defineConfig } from 'vite';

// base './' so the build also works when wrapped by Capacitor (file:// / app scheme)
// `PREVIEW_ENTRY=<name> vite build --mode preview-page`: 미리보기 페이지용 — 그림을 코드 안에 넣고 <name>.html 을 진입점으로
const entry = process.env.PREVIEW_ENTRY ?? 'preview';
export default defineConfig(({ mode }) => ({
  base: './',
  build: mode === 'preview-page'
    ? { outDir: `dist-preview/${entry}`, assetsInlineLimit: 100_000_000, cssCodeSplit: false, rollupOptions: { input: `${entry}.html`, output: { inlineDynamicImports: true } } }
    : {},
}));
