import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // Los paquetes internos se publican como TypeScript; se incluyen en el bundle
  // para que `node dist/index.js` funcione sin compilar el monorepo.
  noExternal: ['@sde/db', '@sde/shared'],
});
