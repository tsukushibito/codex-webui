import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

const backendOrigin = process.env.VITE_BACKEND_ORIGIN || 'http://127.0.0.1:8080';

export default defineConfig({
  root: __dirname,
  base: '/static/preact/',
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
});
