import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Tests run sequentially — each test file manages its own DB state
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    // Use a separate test DB so dev data is never touched
    env: {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/zorvyn_test?schema=public',
      JWT_ACCESS_SECRET: 'test-access-secret-minimum-32-characters-long',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      NODE_ENV: 'test',
    },
    setupFiles: [],
    globalSetup: './src/tests/vitest.global-setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
