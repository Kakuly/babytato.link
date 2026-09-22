import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://babytato.link',
  trailingSlash: 'always',
  server: {
    host: true,
    port: 4322,
    strictPort: true,
  },
  vite: {
    server: {
      // Astro :4322 has no Pages Functions; forward API to wrangler pages:dev.
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8788',
          changeOrigin: true,
        },
      },
    },
  },
});
