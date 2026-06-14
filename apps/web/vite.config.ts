import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['@repo/common'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Consume the integration schemas from TypeScript source so Rollup can
      // tree-shake away each event's server-only `run`/axios logic (the
      // compiled CommonJS dist cannot be tree-shaken and would leak it).
      '@repo/integrations/schemas': path.resolve(
        __dirname,
        '../../packages/integrations/src/schemas.ts',
      ),
    },
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/, /packages[\\/]+common[\\/]+dist/],
    },
  },
  server: {
    allowedHosts: true,
  },
});
