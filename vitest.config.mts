import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The shop rules and the cart run on Node in the tests; screens are checked with `npm run typecheck`.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
