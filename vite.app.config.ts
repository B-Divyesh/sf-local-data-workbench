import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist/app',
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: { input: 'index.html' }
  },
  clearScreen: false,
  server: { port: 1420, strictPort: true }
});
