// Shared Stryker config for one candidate project. stryker-run.sh runs Stryker
// from inside the project and passes the use case and the report path through
// the environment:
//   STRYKER_USECASE   auth | billing | transfer (selects src/<usecase>/)
//   STRYKER_JSON_OUT  path of the JSON report (relative to the project or absolute)
//   STRYKER_CONCURRENCY  optional worker count (default 4)
const usecase = process.env.STRYKER_USECASE;
if (!usecase) throw new Error('STRYKER_USECASE is not set; run stryker-run.sh');

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
  plugins: ['@stryker-mutator/vitest-runner'],
  vitest: { configFile: 'vitest.config.ts' },
  coverageAnalysis: 'perTest',
  // Only the use case under test. ports.ts and the entity interfaces are
  // type-only and produce no runtime code, so they are excluded.
  mutate: [
    `src/${usecase}/**/*.ts`,
    `!src/${usecase}/ports.ts`,
    '!src/auth/User.ts',
    '!src/auth/ResetToken.ts',
  ],
  reporters: ['clear-text', 'json'],
  jsonReporter: { fileName: process.env.STRYKER_JSON_OUT ?? 'reports/mutation/mutation.json' },
  clearTextReporter: { allowColor: false, logTests: false, reportTests: false, reportMutants: false },
  incremental: false,
  concurrency: Number(process.env.STRYKER_CONCURRENCY ?? 4),
  timeoutMS: 10000,
  timeoutFactor: 2,
  ignorePatterns: ['reports', '.stryker-tmp'],
  tempDirName: '.stryker-tmp',
  cleanTempDir: true,
  thresholds: { high: 80, low: 60, break: null },
};
