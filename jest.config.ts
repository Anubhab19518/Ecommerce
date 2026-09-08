import type { Config } from 'jest';

const config: Config = {
  // ---- Runtime ----
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/src/test-setup.ts'],

  // ---- File patterns ----
  roots: ['<rootDir>/src', '<rootDir>/tools'],
  testMatch: ['**/__tests__/**/*.test.[jt]s', '**/*.test.[jt]s'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],

  // ---- Path aliases (mirror tsconfig paths) ----
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
  },

  // ---- Coverage ----
  collectCoverageFrom: [
    'src/**/*.ts',
    'tools/eslint-plugin-modular-monolith/utils.js',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/infrastructure/database/migrations/**',
    '!src/infrastructure/database/migrator.ts',
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },

  // ---- Performance ----
  clearMocks: true,
  restoreMocks: true,
  maxWorkers: '50%',

  // ---- Transforms ----
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        diagnostics: { ignoreDiagnostics: [6133, 6196] },
      },
    ],
  },
};

export default config;
