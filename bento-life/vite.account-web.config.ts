import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'node:path';
import { lstatSync } from 'node:fs';
import { accountWebConfig } from './scripts/account-web-config.ts';

export default defineConfig(({ mode }) => {
  const config = accountWebConfig(mode, loadEnv(mode, process.cwd(), 'BENTO_WEB_'));
  const root = resolve('account-web');
  const output = resolve(config.localOnly ? 'dist-account-web-local' : 'dist-account-web');
  try { if (lstatSync(output).isSymbolicLink()) throw new Error('웹 출력 symlink는 사용할 수 없습니다.'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  return {
    root, publicDir: false, envPrefix: 'BENTO_UNUSED_', base: './',
    define: { __BENTO_ACCOUNT_WEB_CONFIG__: JSON.stringify(config) },
    plugins: [{ name: 'account-web-output', transformIndexHtml() {
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: `default-src 'none'; script-src 'self'; style-src 'self'; connect-src ${config.url}; img-src 'self'; base-uri 'none'; form-action 'none'` }, injectTo: 'head-prepend' }];
    }, configResolved(resolved) {
      if (resolve(resolved.root) !== root || resolve(resolved.root, resolved.build.outDir) !== output) {
        throw new Error('계정 웹 출력 위치는 고정되어 있습니다.');
      }
    } }],
    build: { outDir: output, emptyOutDir: true, sourcemap: false },
  };
});
