module.exports = {
  rootDir: __dirname,
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '(sales.service|sales.controller|sales.dto|qa-multipart|quotes.service|deliveries.service|orders.service|order-state)\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: './tsconfig.payments-tests.json', diagnostics: true }] },
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  testEnvironment: 'node'
};
