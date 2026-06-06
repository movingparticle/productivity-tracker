import { defineConfig } from 'vite';

export default defineConfig({
  // If building in GitHub Actions, use repo subpath; otherwise use root
  base: process.env.GITHUB_ACTIONS ? '/productivity-tracker/' : '/',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  }
});
