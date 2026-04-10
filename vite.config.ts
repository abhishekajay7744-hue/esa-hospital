import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 8080,
    open: '/index.html'
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
        dashboard: './dashboard.html'
      }
    }
  }
});
