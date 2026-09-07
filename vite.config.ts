import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': '/src' },
  },
  build: {
    target: 'es2022',
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
