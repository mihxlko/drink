import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  publicDir: fileURLToPath(new URL('../../../apps/web/public', import.meta.url)),
  esbuild: { jsx: 'automatic' },
  server: { host: '127.0.0.1', port: 3018, strictPort: true },
})
