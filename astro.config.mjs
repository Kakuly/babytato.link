import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://babytato.link',
  trailingSlash: 'always',
  server: {
    host: true,
    port: 4322,
    strictPort: true,
  },
});
