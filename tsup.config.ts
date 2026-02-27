import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  splitting: false,
  sourcemap: true,
  dts: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
  define: {
    __OAUTH_CLIENT_ID__: JSON.stringify(process.env.NOTION_OAUTH_CLIENT_ID ?? ''),
    __OAUTH_CLIENT_SECRET__: JSON.stringify(process.env.NOTION_OAUTH_CLIENT_SECRET ?? ''),
  },
});
