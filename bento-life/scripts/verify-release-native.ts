import { readFile, lstat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadEnv } from 'vite';
import { directoryFiles, fail, releaseConfig, verifyReleaseContent } from './release-artifact.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export async function verifyNativeRelease(options: { assets?: string; capacitor?: string; app?: string; archive?: string }): Promise<unknown> {
  let { assets, capacitor } = options;
  const { app, archive } = options;
  if ([assets, app, archive].filter(Boolean).length !== 1) fail('Choose one copied assets directory, .app, APK or AAB.');
  const expected = releaseConfig(loadEnv('release', root, 'VITE_'));
  let names: string[], read: (file: string) => Promise<Uint8Array>, config: Record<string, any>;
  if (archive) {
    if (capacitor) fail();
    const prefix = archive.endsWith('.aab') ? 'base/assets/' : archive.endsWith('.apk') ? 'assets/' : fail('Expected an APK or AAB.');
    const entries = execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).trim().split('\n');
    if (new Set(entries).size !== entries.length) fail('Duplicate archive entries.');
    const extract = (file: string): Buffer => {
      if (!entries.includes(file)) fail('Missing archive entry.');
      return execFileSync('unzip', ['-p', archive, file], { maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    };
    names = entries.filter(file => file.startsWith(prefix + 'public/') && !file.endsWith('/')).map(file => file.slice((prefix + 'public/').length));
    read = async file => extract(prefix + 'public/' + file);
    config = JSON.parse(extract(prefix + 'capacitor.config.json').toString('utf8'));
  } else {
    if (app) { assets = join(app, 'public'); capacitor = join(app, 'capacitor.config.json'); }
    if (!assets || !capacitor) fail('Copied Capacitor configuration is required.');
    if (!(await lstat(capacitor)).isFile()) fail('Copied native configuration must be a regular file.');
    names = await directoryFiles(assets);
    read = file => readFile(join(assets!, file));
    config = JSON.parse(await readFile(capacitor, 'utf8'));
  }
  if (config.appId !== 'com.paranstudio.dosirak' || config.webDir !== 'dist' || config.server
    || config.loggingBehavior !== 'none'
    || (config.ios?.loggingBehavior ?? config.loggingBehavior) !== 'none'
    || (config.android?.loggingBehavior ?? config.loggingBehavior) !== 'none') fail('Release must use bundled content with native bridge logging disabled.');
  return verifyReleaseContent({ root, names, read, expected, native: true });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2), options: Record<string, string> = {};
    const names: Record<string, string> = { '--assets': 'assets', '--capacitor': 'capacitor', '--app': 'app', '--archive': 'archive' };
    for (let index = 0; index < args.length; index++) {
      const name = names[args[index]];
      if (!name || options[name] || !args[index + 1] || args[index + 1].startsWith('--')) fail('Invalid release verifier arguments.');
      options[name] = args[++index];
    }
    console.log(JSON.stringify(await verifyNativeRelease(options)));
  } catch {
    // Underlying filesystem/ZIP/parser errors may include private paths or settings.
    console.error('Release package rejected. Rebuild and sync with the selected public release settings; inspect source, asset inventory and native configuration.');
    process.exitCode = 1;
  }
}
