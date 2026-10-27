import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['scripts/backend/shared.integration.test.ts'],
    testTimeout: 60000,
    hookTimeout: 15000,
    fileParallelism: false,
  },
});
