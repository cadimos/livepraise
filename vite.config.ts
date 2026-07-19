import { defineConfig } from 'vite';
import path from 'node:path';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  root: path.resolve(__dirname, 'apps/operator'),
  base: './',
  build: {
    outDir: path.resolve(__dirname, 'dist/apps/operator'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
      '@core': path.resolve(__dirname, 'core'),
    },
  },
});
