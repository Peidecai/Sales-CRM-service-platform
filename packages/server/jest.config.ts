import type { Config } from 'jest'

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.js$': 'ts-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)',
  ],
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/**/*.module.ts', '!src/**/*.entity.ts', '!src/**/*.dto.ts'],
  coverageDirectory: './coverage',
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 48,
      lines: 50,
      statements: 50,
    },
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@crm/shared$': '<rootDir>/../../packages/shared/dist',
  },
}

export default config
