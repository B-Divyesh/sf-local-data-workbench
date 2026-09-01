import { defineConfig } from 'vite';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

function buildId(): string {
  if (process.env.VITE_BUILD_ID) return process.env.VITE_BUILD_ID;
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); }
  catch { return 'unversioned-source'; }
}

export default defineConfig({
  root: 'site',
  publicDir: '../public',
  base: '/',
  build: {
    outDir: '../dist/site',
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
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(buildId()),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version ?? '0.1.7')
  },
  server: { watch: { ignored: ['**/src-tauri/target/**'] } }
});
