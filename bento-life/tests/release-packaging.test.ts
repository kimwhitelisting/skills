import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { build } from 'vite';
import { mkdtemp, mkdir, readFile, writeFile, symlink, rm, realpath } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { configJSON, directoryFiles, htmlConfigJSON, provenanceFile, readHTMLConfig, sha, verifyReleaseContent } from '../scripts/release-artifact.ts';
import type { Provenance, ReleaseConfig } from '../scripts/release-artifact.ts';
import { readReleaseAccountConfig } from '../src/account/build-config.ts';
import { verifyNativeRelease } from '../scripts/verify-release-native.ts';
import { assertReleaseOutput } from '../scripts/release-plugin.ts';

const root = resolve(import.meta.dirname, '..');
const selected: ReleaseConfig = {
  VITE_SUPABASE_URL: 'https://syntheticrelease.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic_release_fixture',
  VITE_AUTH_REDIRECT_URL: 'https://play.release-demo.com/return',
};
let scratch: string, output: string, original: Map<string, Uint8Array>;
const priorEnv = { ...process.env };
const configDocument = (text: string, count = 1) => ({ querySelectorAll: () => Array.from({ length: count }, () => ({ textContent: text, getAttribute: () => 'application/json' })) }) as unknown as Pick<Document, 'querySelectorAll'>;

beforeAll(async () => {
  scratch = await realpath(await mkdtemp(join(process.env.BENTO_PACKAGING_TEST_ROOT ?? tmpdir(), 'bento-packaging-')));
  output = join(scratch, 'synthetic-release');
  await mkdir(join(scratch, 'env'));
  for (const key of Object.keys(process.env)) if (key.startsWith('VITE_')) delete process.env[key];
  Object.assign(process.env, selected, { BENTO_RELEASE_TEST_ONLY: '1' });
  await build({ root, envDir: join(scratch, 'env'), mode: 'release', logLevel: 'silent', build: { outDir: output } });
  original = new Map(await Promise.all((await directoryFiles(output)).map(async file => [file, await readFile(join(output, file))] as const)));
}, 60000);
afterAll(async () => {
  for (const key of Object.keys(process.env)) if (!(key in priorEnv)) delete process.env[key];
  Object.assign(process.env, priorEnv);
  if (scratch) await rm(scratch, { recursive: true, force: true });
});
function fixture(): Map<string, Uint8Array> { return new Map(original); }
function verify(files = fixture(), expected = selected, synthetic = true, native = false) {
  return verifyReleaseContent({ root, names: [...files.keys()], read: async file => {
    const value = files.get(file); if (!value) throw new Error('missing fixture'); return value;
  }, expected, synthetic, native });
}
function metadata(files: Map<string, Uint8Array>, mutate: (value: Provenance) => void) {
  const value = JSON.parse(Buffer.from(files.get(provenanceFile)!).toString()) as Provenance;
  mutate(value); files.set(provenanceFile, Buffer.from(JSON.stringify(value))); return value;
}

describe('real Vite release packaging', () => {
  it('records all actual Vite files and the reachable configuration consumer', async () => {
    expect(await verify()).toMatchObject({ verified: true, testOnly: true });
    expect(readHTMLConfig(Buffer.from(original.get('index.html')!).toString())).toEqual(selected);
    const manifest: Provenance = JSON.parse(Buffer.from(original.get(provenanceFile)!).toString());
    expect(manifest.chunks.some(chunk => chunk.configConsumer)).toBe(true);
    expect(Object.keys(manifest.files).some(file => file.endsWith('.woff2'))).toBe(true);
  });
  it('never accepts synthetic artifacts through production verification', async () => {
    await expect(verify(fixture(), selected, false)).rejects.toThrow();
    const capacitor = join(scratch, 'capacitor.json');
    await writeFile(capacitor, JSON.stringify({ appId: 'com.paranstudio.dosirak', webDir: 'dist', loggingBehavior: 'none' }));
    await expect(verifyNativeRelease({ assets: output, capacitor })).rejects.toThrow();
  });
  it('rejects missing, extra and changed actual assets', async () => {
    const js = [...original.keys()].find(file => file.endsWith('.js'))!;
    for (const change of [
      (files: Map<string, Uint8Array>) => files.delete(js),
      (files: Map<string, Uint8Array>) => files.set('assets/stale.js', Buffer.from('old chunk')),
      (files: Map<string, Uint8Array>) => files.set(js, Buffer.from('old guest chunk')),
    ]) { const files = fixture(); change(files); await expect(verify(files)).rejects.toThrow(); }
  });
  it('rejects stale source, changed selected settings and a development build label', async () => {
    const stale = fixture(); metadata(stale, value => { value.sourceDigest = '0'.repeat(64); });
    await expect(verify(stale)).rejects.toThrow('stale');
    await expect(verify(fixture(), { ...selected, VITE_SUPABASE_URL: 'https://differentproject.supabase.co' })).rejects.toThrow('configuration');
    const dev = fixture(); metadata(dev, value => { (value as unknown as { mode: string }).mode = 'production'; });
    await expect(verify(dev)).rejects.toThrow();
  });
  it('rejects duplicate configuration and external entry even with recomputed HTML hash', async () => {
    for (const change of [
      (html: string) => html.replace('</head>', `<script id="bento-release-config" type="application/json">${configJSON(selected)}</script></head>`),
      (html: string) => html.replace(/src="\.\/assets\//, 'src="https://external.invalid/assets/'),
    ]) {
      const files = fixture(), html = change(Buffer.from(files.get('index.html')!).toString());
      files.set('index.html', Buffer.from(html)); metadata(files, value => { value.files['index.html'] = sha(html); });
      await expect(verify(files)).rejects.toThrow();
    }
  });
  it('permits only empty Capacitor stubs, not unrecorded executable content', async () => {
    const files = fixture(); files.set('cordova.js', new Uint8Array()); files.set('cordova_plugins.js', new Uint8Array());
    await expect(verify(files, selected, true, true)).resolves.toMatchObject({ verified: true });
    files.set('cordova.js', Buffer.from('alert(1)')); await expect(verify(files, selected, true, true)).rejects.toThrow('Cordova');
  });
  it('rejects copied directory/config symlinks', async () => {
    const link = join(scratch, 'linked-output'); await symlink(output, link);
    await expect(directoryFiles(link)).rejects.toThrow();
    const config = join(scratch, 'linked-cap.json'); await symlink(join(scratch, 'capacitor.json'), config);
    await expect(verifyNativeRelease({ assets: output, capacitor: config })).rejects.toThrow();
  });
  it.each([
    { server: { url: 'https://external.invalid/' } },
    { ios: { loggingBehavior: 'debug' } },
    { android: { loggingBehavior: 'production' } },
    { appId: 'other.app' },
  ])('rejects native live loading/logging/identity overrides (%#)', async override => {
    const capacitor = join(scratch, 'bad-capacitor.json');
    await writeFile(capacitor, JSON.stringify({ appId: 'com.paranstudio.dosirak', webDir: 'dist', loggingBehavior: 'none', ...override }));
    await expect(verifyNativeRelease({ assets: output, capacitor })).rejects.toThrow('bundled content');
  });
  it('rejects bad settings and define overrides before touching an existing output', async () => {
    const before = sha(await readFile(join(output, 'index.html')));
    process.env.VITE_AUTH_REDIRECT_URL = 'https://preview.tail-fixture.ts.net/';
    await expect(build({ root, envDir: join(scratch, 'env'), mode: 'release', logLevel: 'silent', build: { outDir: output } })).rejects.toThrow();
    process.env.VITE_AUTH_REDIRECT_URL = selected.VITE_AUTH_REDIRECT_URL;
    delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    await expect(build({ root, envDir: join(scratch, 'env'), mode: 'release', logLevel: 'silent', build: { outDir: output } })).rejects.toThrow();
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY = selected.VITE_SUPABASE_PUBLISHABLE_KEY;
    await expect(build({ root, envDir: join(scratch, 'env'), mode: 'release', define: { 'import.meta.env.MODE': '"production"' }, logLevel: 'silent', build: { outDir: output } })).rejects.toThrow('define');
    expect(sha(await readFile(join(output, 'index.html')))).toBe(before);
  }, 30000);
  it('rejects retained/external production output before Vite can alter it', async () => {
    const before = sha(await readFile(join(output, 'index.html')));
    await expect(build({ root, envDir: join(scratch, 'env'), mode: 'release', logLevel: 'silent', build: { outDir: output, emptyOutDir: false } })).rejects.toThrow('retain');
    delete process.env.BENTO_RELEASE_TEST_ONLY;
    try {
      await expect(build({ root, envDir: join(scratch, 'env'), mode: 'release', logLevel: 'silent', build: { outDir: output } })).rejects.toThrow('canonical dist');
    } finally { process.env.BENTO_RELEASE_TEST_ONLY = '1'; }
    expect(sha(await readFile(join(output, 'index.html')))).toBe(before);
  }, 30000);
  it('refuses a symlinked canonical dist before deleting any target file', async () => {
    const fakeRoot = join(scratch, 'fake-app'); await mkdir(fakeRoot);
    await symlink(output, join(fakeRoot, 'dist'));
    const before = sha(await readFile(join(output, 'index.html')));
    await expect(assertReleaseOutput(fakeRoot, join(fakeRoot, 'dist'), false, null)).rejects.toThrow('symlink');
    expect(sha(await readFile(join(output, 'index.html')))).toBe(before);
    const dangling = join(scratch, 'dangling-output');
    await symlink(join(scratch, 'absent-target'), dangling);
    await expect(assertReleaseOutput(root, dangling, true, null)).rejects.toThrow('already exists');
  });
  it('executes the actual Vite-compiled config consumer with no guest/env fallback', async () => {
    const consumerOutput = join(scratch, 'consumer');
    await build({ root, configFile: false, envDir: join(scratch, 'env'), mode: 'release', logLevel: 'silent',
      build: { outDir: consumerOutput, lib: { entry: join(root, 'src/account/build-config.ts'), formats: ['es'], fileName: () => 'consumer.mjs' } } });
    // A separate Node process imports the emitted module without Vitest transforms.
    const result = execFileSync(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      import {pathToFileURL} from 'node:url';
      globalThis.fetch=()=>{throw new Error('Network forbidden in compiled-config probe');};
      const selected=JSON.parse(process.argv[2]);
      globalThis.document={querySelectorAll:()=>[{textContent:JSON.stringify(selected),getAttribute:()=>'application/json'}]};
      const consumer=await import(pathToFileURL(process.argv[1]).href);
      assert.deepEqual(consumer.accountBuildConfig(),selected);
      globalThis.document={querySelectorAll:()=>[]};
      assert.throws(()=>consumer.accountBuildConfig());
      console.log('compiled-consumer-pass');
    `, join(consumerOutput, 'consumer.mjs'), configJSON(selected)], { encoding: 'utf8' });
    expect(result.trim()).toBe('compiled-consumer-pass');
  }, 30000);
});

describe('release HTML configuration boundary', () => {
  it('fails closed on missing, duplicated and invalid blocks', () => {
    for (const document of [configDocument('', 0), configDocument(configJSON(selected), 2), configDocument('{'), configDocument('{}')]) {
      expect(() => readReleaseAccountConfig(document)).toThrow();
    }
  });
  it('escapes closing script payloads while preserving the literal redirect value', () => {
    const value = { ...selected, VITE_AUTH_REDIRECT_URL: 'https://play.release-demo.com/return?</script><script>alert(1)</script>' };
    const escaped = htmlConfigJSON(value);
    expect(escaped).not.toContain('<');
    expect(readHTMLConfig(`<script id="bento-release-config" type="application/json">${escaped}</script>`)).toEqual(value);
    expect(readReleaseAccountConfig(configDocument(escaped))).toEqual(value);
  });
});
