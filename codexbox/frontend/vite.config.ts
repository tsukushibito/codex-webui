import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

const backendOrigin = process.env.VITE_BACKEND_ORIGIN || 'http://127.0.0.1:8080';

export default defineConfig(({ command }) => ({
  root: __dirname,
  base: command === 'serve' ? '/' : '/static/preact/',
  plugins: [preact()],
  build: {
    outDir: '../public/preact',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': backendOrigin,
      '/static': backendOrigin,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
}));
