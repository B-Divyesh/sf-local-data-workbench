import { defineConfig } from 'vite';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function buildId(): string {
  if (process.env.VITE_BUILD_ID) return process.env.VITE_BUILD_ID;
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); }
  catch { return 'unversioned-source'; }
}

function outputDir(): string {
  // The release repair builds into an isolated directory before deployment so
  // it never reuses a stale `dist/site` from a different checkout.
  return process.env.SITE_OUTPUT_DIR ? resolve(process.env.SITE_OUTPUT_DIR) : resolve(import.meta.dirname, 'dist/site');
}

function stampInstallers(commit: string, version: string) {
  return {
    name: 'stamp-installers',
    closeBundle(): void {
      for (const name of ['install.sh', 'install.ps1']) {
        const path = resolve(outputDir(), name);
        const source = readFileSync(path, 'utf8');
        const stamped = source
          .replaceAll('__LDW_SOURCE_COMMIT__', commit)
          .replaceAll('__LDW_APP_VERSION__', version);
        if (stamped.includes('__LDW_')) throw new Error(`Could not stamp ${name}`);
        writeFileSync(path, stamped);
      }
    }
  };
}

function stampServiceWorker() {
  return {
    name: 'stamp-service-worker',
    closeBundle(): void {
      const root = outputDir();
      const assets = readdirSync(resolve(root, 'assets'), { recursive: true })
        .filter((entry): entry is string => typeof entry === 'string' && /\.(?:js|css)$/.test(entry))
        .map((entry) => `/assets/${entry.replaceAll('\\', '/')}`)
        .sort();
      const path = resolve(root, 'sw.js');
      const source = readFileSync(path, 'utf8');
      const stamped = source.replace(
        "const PRECACHE_ASSETS = ['/main.ts', '/demo.ts', '/site.css'];",
        `const PRECACHE_ASSETS = ${JSON.stringify(assets)};`
      );
      if (stamped === source || stamped.includes("'/demo.ts'")) {
        throw new Error('Could not stamp every production service-worker asset.');
      }
      writeFileSync(path, stamped);
    }
  };
}

const commit = buildId();
const version = process.env.npm_package_version ?? '0.1.11';

export default defineConfig({
  root: 'site',
  publicDir: '../public',
  base: '/',
  build: {
    outDir: outputDir(),
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'site/index.html'),
        demo: resolve(import.meta.dirname, 'site/demo/index.html'),
        privacy: resolve(import.meta.dirname, 'site/privacy/index.html'),
        terms: resolve(import.meta.dirname, 'site/terms/index.html'),
        notFound: resolve(import.meta.dirname, 'site/404.html')
      }
    }
  },
  plugins: [stampInstallers(commit, version), stampServiceWorker()],
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(commit),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(version)
  },
  server: { watch: { ignored: ['**/src-tauri/target/**'] } }
});
