import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        'node_modules',
        'dist',
        'tests',
        '**/*.test.ts',
        'vitest.config.ts',
      ],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
})
