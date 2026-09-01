import { defineConfig } from 'vite';
import { execFileSync } from 'node:child_process';

function buildId(): string {
  if (process.env.VITE_BUILD_ID) return process.env.VITE_BUILD_ID;
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); }
  catch { return 'unversioned-source'; }
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist/app',
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: { input: 'index.html' }
  },
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(buildId()),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version ?? '0.1.9')
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/target/**'] }
  }
});
