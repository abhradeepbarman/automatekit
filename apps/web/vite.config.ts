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
