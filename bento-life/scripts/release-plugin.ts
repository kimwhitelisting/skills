import { readFile, writeFile, lstat, realpath } from 'node:fs/promises';
import { resolve, relative, sep, dirname } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';
import { configId, configJSON, directoryFiles, fail, htmlConfigJSON, provenanceFile, releaseConfig, sha, sourceDigest, verifyHTMLAndGraph } from './release-artifact.ts';
import type { Chunk, Provenance, ReleaseConfig } from './release-artifact.ts';

/** Check before Vite empties any output directory. */
export async function assertReleaseOutput(root: string, output: string, testOnly: boolean, emptyOutDir: boolean | null): Promise<void> {
  if (emptyOutDir === false) fail('Release cannot retain files from a previous output.');
  if (!testOnly) {
    if (output !== resolve(root, 'dist')) fail('Release output must use the canonical dist directory.');
    try {
      if (!(await lstat(output)).isDirectory()) fail('Release dist must be a real directory, not a symlink.');
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    return;
  }
  const fromRoot = relative(root, output), toRoot = relative(output, root);
  if (!fromRoot.startsWith('..' + sep) || !toRoot.startsWith('..' + sep)) fail('Synthetic release output must be a new external directory.');
  try { await lstat(output); fail('Synthetic output already exists.'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  if (await realpath(dirname(output)) !== dirname(output)) fail('Synthetic output parent must not be a symlink.');
}

/** Provenance is emitted only after Vite has written the real release bundle. */
export function releaseProvenance(): Plugin {
  let resolved: ResolvedConfig;
  let selected: ReleaseConfig;
  let originalSource: string;
  let chunks: Chunk[] = [];
  let testOnly = false;
  return {
    name: 'bento-release-provenance',
    apply: 'build',
    async configResolved(config) {
      resolved = config;
      if (config.mode !== 'release') return;
      selected = releaseConfig(Object.fromEntries(Object.entries(config.env).filter(([key]) => key.startsWith('VITE_'))));
      if (Object.keys(config.define ?? {}).some(key => key === 'import.meta' || key.startsWith('import.meta.env'))) fail('Release environment define overrides are not supported.');
      if (config.base !== './' || config.build.ssr || config.build.lib || config.build.sourcemap || config.build.rollupOptions.input) fail('Unsupported release build entry or options.');
      if (typeof config.build.assetsInlineLimit !== 'number') fail('Release asset inline callback overrides are unsupported.');
      testOnly = process.env.BENTO_RELEASE_TEST_ONLY === '1';
      if (process.env.BENTO_RELEASE_TEST_ONLY && !testOnly) fail('Invalid synthetic build flag.');
      await assertReleaseOutput(config.root, resolve(config.root, config.build.outDir), testOnly, config.build.emptyOutDir);
    },
    async buildStart() {
      if (resolved.mode === 'release') originalSource = await sourceDigest(resolved.root);
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (resolved.mode !== 'release') return html;
        if (html.includes(configId)) fail('Duplicate release configuration source.');
        return [{ tag: 'script', attrs: { id: configId, type: 'application/json' }, children: htmlConfigJSON(selected), injectTo: 'head-prepend' }];
      },
    },
    generateBundle(_options, bundle) {
      if (resolved.mode !== 'release') return;
      chunks = Object.values(bundle).filter(item => item.type === 'chunk').map(chunk => ({
        file: chunk.fileName,
        imports: [...chunk.imports, ...chunk.dynamicImports],
        entry: chunk.isEntry,
        configConsumer: Object.entries(chunk.modules).some(([id, module]) => id === resolve(resolved.root, 'src/account/build-config.ts') && module.renderedLength > 0),
      }));
    },
    async writeBundle() {
      if (resolved.mode !== 'release') return;
      if (await sourceDigest(resolved.root) !== originalSource) fail('Source changed during release build.');
      const output = resolve(resolved.root, resolved.build.outDir);
      const files = Object.fromEntries(await Promise.all((await directoryFiles(output)).map(async file => [file, sha(await readFile(resolve(output, file)))])));
      if (provenanceFile in files) fail('Unexpected prior provenance in new output.');
      const provenance: Provenance = {
        format: 1, mode: 'release', testOnly, sourceDigest: originalSource,
        config: selected, configDigest: sha(configJSON(selected)),
        viteVersion: JSON.parse(await readFile(resolve(resolved.root, 'node_modules/vite/package.json'), 'utf8')).version,
        nodeMajor: Number(process.versions.node.split('.')[0]), files, chunks,
        buildOptions: { base: resolved.base, target: resolved.build.target,
          cssTarget: resolved.build.cssTarget, minify: resolved.build.minify,
          cssCodeSplit: resolved.build.cssCodeSplit, assetsInlineLimit: resolved.build.assetsInlineLimit as number },
      };
      verifyHTMLAndGraph(await readFile(resolve(output, 'index.html'), 'utf8'), provenance);
      await writeFile(resolve(output, provenanceFile), JSON.stringify(provenance, null, 2) + '\n');
    },
  };
}
