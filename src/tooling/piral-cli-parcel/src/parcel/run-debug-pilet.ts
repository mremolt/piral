import type { LogLevels, SharedDependency } from 'piral-cli';
import { setupBundler, postProcess } from './bundler';
import { setStandardEnvs } from 'piral-cli/utils';

async function run(
  root: string,
  piral: string,
  scopeHoist: boolean,
  autoInstall: boolean,
  cacheDir: string,
  externals: Array<string>,
  importmap: Array<SharedDependency>,
  targetDir: string,
  entryModule: string,
  logLevel: LogLevels,
) {
  setStandardEnvs({
    piral,
    root,
  });

  const bundler = setupBundler({
    type: 'pilet',
    externals,
    importmap,
    targetDir,
    entryModule,
    config: {
      logLevel,
      hmr: false,
      minify: false,
      watch: true,
      scopeHoist,
      publicUrl: './',
      cacheDir,
      autoInstall,
    },
  });

  return bundler;
}

let bundler;

process.on('message', async (msg) => {
  const root = process.cwd();

  switch (msg.type) {
    case 'bundle':
      if (bundler) {
        await bundler.bundle();

        bundler.on('buildStart', () => {
          process.send({
            type: 'pending',
          });
        });
      }

      break;
    case 'start':
      bundler = await run(
        root,
        msg.piral,
        msg.scopeHoist,
        msg.autoInstall,
        msg.cacheDir,
        msg.externals,
        msg.importmap,
        msg.targetDir,
        msg.entryModule,
        msg.logLevel,
      ).catch((error) => {
        process.send({
          type: 'fail',
          error: error?.message,
        });
      });

      if (bundler) {
        bundler.on('bundled', async (bundle) => {
          const name = process.env.BUILD_PCKG_NAME;
          const requireRef = await postProcess(bundle, name, msg.version, false, msg.importmap);

          if (msg.hmr) {
            process.send({
              type: 'update',
              outHash: bundler.mainBundle.entryAsset.hash,
              outName: bundler.mainBundle.name.substr(bundler.options.outDir.length),
              args: {
                requireRef,
                version: msg.version,
                root,
              },
            });
          }
        });

        process.send({
          type: 'done',
          outDir: bundler.options.outDir,
        });
      }

      break;
  }
});
