import { defineConfig } from 'vite';

// GitHub Pages serves the site from https://garicsond.github.io/coral-cruise/
export default defineConfig({
  base: '/coral-cruise/',
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    sourcemap: false,
    chunkSizeWarningLimit: 800,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
  },
});
