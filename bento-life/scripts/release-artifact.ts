import { createHash } from 'node:crypto';
import { lstat, readdir, readFile } from 'node:fs/promises';
import { join, posix } from 'node:path';
import { assertReleaseConfig } from './release-config.ts';

export const provenanceFile = 'bento-release.json';
export const configId = 'bento-release-config';
export const configKeys = ['VITE_AUTH_REDIRECT_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_URL'] as const;
export type ReleaseConfig = Record<typeof configKeys[number], string>;
export type Chunk = { file: string; imports: string[]; entry: boolean; configConsumer: boolean };
export type Provenance = {
  format: 1; mode: 'release'; testOnly: boolean; sourceDigest: string;
  config: ReleaseConfig; configDigest: string; viteVersion: string; nodeMajor: number;
  buildOptions: { base: string; target: string | string[] | false; cssTarget: string | string[] | false;
    minify: string | boolean; cssCodeSplit: boolean; assetsInlineLimit: number };
  files: Record<string, string>; chunks: Chunk[];
};
export function fail(message = 'Release content verification failed.'): never { throw new Error(message); }
export const sha = (value: string | Uint8Array): string => createHash('sha256').update(value).digest('hex');
export function releaseConfig(env: Record<string, string | undefined>): ReleaseConfig {
  assertReleaseConfig('release', env);
  return Object.fromEntries(configKeys.map(key => [key, env[key]])) as ReleaseConfig;
}
export const configJSON = (config: ReleaseConfig): string => JSON.stringify(Object.fromEntries(configKeys.map(key => [key, config[key]])));
export const htmlConfigJSON = (config: ReleaseConfig): string => configJSON(config).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
export function safeFile(file: string): boolean {
  return /^[a-zA-Z0-9_.\/-]+$/.test(file) && !file.startsWith('/') && file.split('/').every(part => part !== '' && part !== '.' && part !== '..');
}
export async function directoryFiles(root: string): Promise<string[]> {
  if (!(await lstat(root)).isDirectory()) fail('Release inputs must be real directories.');
  const result: string[] = [];
  async function walk(relative: string): Promise<void> {
    for (const name of (await readdir(join(root, relative))).sort()) {
      const file = relative ? `${relative}/${name}` : name;
      if (!safeFile(file)) fail('Unsafe packaged file path.');
      const stat = await lstat(join(root, file));
      if (stat.isDirectory()) await walk(file);
      else if (stat.isFile()) result.push(file);
      else fail('Symlinks and special files are not release inputs.');
    }
  }
  await walk('');
  return result.sort();
}
export async function sourceDigest(root: string): Promise<string> {
  const files = [
    'index.html', 'vite.config.ts', 'tsconfig.json', 'package.json', 'package-lock.json', 'capacitor.config.ts',
    'scripts/release-config.ts', 'scripts/release-artifact.ts', 'scripts/release-plugin.ts',
    'scripts/verify-release-native.ts', 'scripts/verify-ios-release.sh',
    'android/app/build.gradle', 'ios/App/App.xcodeproj/project.pbxproj',
  ];
  for (const dir of ['src', 'public']) {
    try { for (const file of await directoryFiles(join(root, dir))) files.push(`${dir}/${file}`); }
    catch (error) { if (dir !== 'public' || (error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  const hashes = await Promise.all(files.sort().map(async file => [file, sha(await readFile(join(root, file)))]));
  return sha(JSON.stringify(hashes));
}
export function readHTMLConfig(html: string): ReleaseConfig {
  const blocks = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
  const configs = blocks.filter(match => /\bid=["']bento-release-config["']/i.test(match[1]));
  if (configs.length !== 1 || !/\btype=["']application\/json["']/i.test(configs[0][1])) fail('Missing or duplicate release configuration block.');
  const parsed = JSON.parse(configs[0][2]);
  if (!parsed || Array.isArray(parsed) || JSON.stringify(Object.keys(parsed).sort()) !== JSON.stringify(configKeys)) fail();
  return releaseConfig(parsed);
}
function localReference(reference: string, base: string, files: Set<string>): string {
  if (!reference || /[?#\\%]/.test(reference) || reference.startsWith('/') || /^[a-z]+:/i.test(reference)) fail('External or ambiguous release asset reference.');
  const target = posix.normalize(posix.join(posix.dirname(base), reference));
  if (!safeFile(target) || !files.has(target)) fail('Referenced release asset is missing.');
  return target;
}
export function verifyHTMLAndGraph(html: string, provenance: Provenance): void {
  const files = new Set(Object.keys(provenance.files));
  if (/<base\b/i.test(html)) fail('Release entry cannot override its asset base.');
  const entries: string[] = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (/\bid=["']bento-release-config["']/i.test(match[1])) continue;
    const src = match[1].match(/\bsrc=["']([^"']+)["']/i)?.[1];
    if (!src || !/\btype=["']module["']/i.test(match[1]) || match[2].trim()) fail('Unexpected release script.');
    entries.push(localReference(src, 'index.html', files));
  }
  if (entries.length !== 1) fail('Release requires exactly one module entry.');
  for (const match of html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)) localReference(match[1], 'index.html', files);
  const chunks = new Map(provenance.chunks.map(chunk => [chunk.file, chunk]));
  if (chunks.size !== provenance.chunks.length || !chunks.get(entries[0])?.entry) fail('Invalid release entry graph.');
  for (const chunk of chunks.values()) {
    if (!files.has(chunk.file) || !chunk.file.endsWith('.js') || !Array.isArray(chunk.imports)) fail();
    for (const imported of chunk.imports) if (!files.has(imported)) fail('Missing chunk dependency.');
  }
  const visited = new Set<string>();
  function visit(file: string): void {
    if (visited.has(file)) return;
    visited.add(file);
    for (const dependency of chunks.get(file)?.imports ?? []) visit(dependency);
  }
  visit(entries[0]);
  if (![...visited].some(file => chunks.get(file)?.configConsumer)) fail('Entry does not include the release configuration consumer.');
}
export async function verifyReleaseContent(options: {
  root: string; names: string[]; read: (file: string) => Promise<Uint8Array>;
  expected: ReleaseConfig; synthetic?: boolean; native?: boolean;
}): Promise<{ verified: true; files: number; testOnly: boolean }> {
  const { root, names, read, expected, synthetic = false, native = false } = options;
  if (names.some(file => !safeFile(file)) || new Set(names).size !== names.length) fail('Invalid or duplicate packaged file.');
  const provenance: Provenance = JSON.parse(Buffer.from(await read(provenanceFile)).toString('utf8'));
  if (provenance.format !== 1 || provenance.mode !== 'release' || provenance.testOnly !== synthetic
    || !provenance.files || !Array.isArray(provenance.chunks) || provenance.buildOptions?.base !== './') fail('A current release build is required; development and synthetic outputs cannot ship.');
  const expectedConfig = releaseConfig(expected);
  if (configJSON(releaseConfig(provenance.config)) !== configJSON(expectedConfig)
    || provenance.configDigest !== sha(configJSON(expectedConfig))) fail('Release configuration differs from the selected build settings.');
  if (provenance.sourceDigest !== await sourceDigest(root)) fail('Release assets are stale; rebuild from the current source.');
  const vite = JSON.parse(await readFile(join(root, 'node_modules/vite/package.json'), 'utf8')).version;
  if (provenance.viteVersion !== vite || provenance.nodeMajor !== 22 || Number(process.versions.node.split('.')[0]) !== 22) fail('Release toolchain differs from the recorded build.');
  const expectedNames = [...Object.keys(provenance.files), provenanceFile].sort();
  const extras = native ? ['cordova.js', 'cordova_plugins.js'] : [];
  const actualNames = names.filter(file => !extras.includes(file)).sort();
  if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) fail('Release asset inventory differs from its build.');
  for (const file of extras) if (names.includes(file) && (await read(file)).length !== 0) fail('Unexpected executable Cordova content.');
  for (const [file, digest] of Object.entries(provenance.files)) {
    if (!safeFile(file) || !/^[a-f0-9]{64}$/.test(digest) || sha(await read(file)) !== digest) fail('Packaged release asset hash mismatch.');
  }
  const html = Buffer.from(await read('index.html')).toString('utf8');
  if (configJSON(readHTMLConfig(html)) !== configJSON(expectedConfig)) fail('The executable entry uses different account settings.');
  verifyHTMLAndGraph(html, provenance);
  return { verified: true, files: expectedNames.length, testOnly: provenance.testOnly };
}
