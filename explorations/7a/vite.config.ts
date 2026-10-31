import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  publicDir: false,
  envDir: false,
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5197, strictPort: true },
  build: {
    outDir: '../../.tmp/phase7a-build',
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL('index.html', import.meta.url)),
        baseline: fileURLToPath(new URL('baseline.html', import.meta.url)),
        compare: fileURLToPath(new URL('compare.html', import.meta.url)),
      },
    },
  },
});
