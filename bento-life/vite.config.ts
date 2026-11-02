import { defineConfig } from 'vite';

// base './' so the build also works when wrapped by Capacitor (file:// / app scheme)
// `vite build --mode preview-page`: 미리보기 페이지용 — 모든 그림을 코드 안에 넣고 preview.html 을 진입점으로
export default defineConfig(({ mode }) => ({
  base: './',
  build: mode === 'preview-page'
    ? { outDir: 'dist-preview', assetsInlineLimit: 100_000_000, rollupOptions: { input: 'preview.html' } }
    : {},
}));
