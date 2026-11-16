/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 * @format
 */

import fs from 'node:fs';
import path from 'node:path';

const VALID_ENVIRONMENT_VARIABLES: ReadonlyArray<string> = [
  'FANTOM_DEBUG_CPP',
  'FANTOM_ENABLE_ASAN',
  'FANTOM_ENABLE_TSAN',
  'FANTOM_FORCE_CI_MODE',
  'FANTOM_FORCE_OSS_BUILD',
  'FANTOM_RUN_BENCHMARKS',
  'FANTOM_LOG_COMMANDS',
  'FANTOM_PRINT_OUTPUT',
  'FANTOM_DEBUG_JS',
  'FANTOM_PROFILE_JS',
  'FANTOM_PROFILE_CPP',
  'FANTOM_ENABLE_JS_MEMORY_INSTRUMENTATION',
  'FANTOM_TESTER_PATH',
  'FANTOM_METRO_CONFIG_PATH',
];

function resolvePath(value: ?string): ?string {
  return value != null && value !== '' ? path.resolve(value) : null;
}

/**
 * Prints the output of the Fantom tester to the test output.
 */
export const printCLIOutput: boolean = Boolean(process.env.FANTOM_PRINT_OUTPUT);

/**
 * Logs all external commands executed by the runner.
 */
export const logCommands: boolean = Boolean(process.env.FANTOM_LOG_COMMANDS);

/**
 * Enables the C++ debugger for the current test run.
 */
export const debugCpp: boolean = Boolean(process.env.FANTOM_DEBUG_CPP);

/**
 * Indicates if the current test run is done in an OSS environment (as opposed
 * to internal Meta infra).
 */
export const isOSS: boolean = Boolean(process.env.FANTOM_FORCE_OSS_BUILD);

/**
 * Indicates if the current test run is done in CI, which forces:
 * 1. Prebuilding all binaries (Fantom tester and Hermes compiler).
 * 2. Running benchmarks in test mode (see below).
 */
export const isCI: boolean =
  Boolean(process.env.FANTOM_FORCE_CI_MODE) ||
  Boolean(process.env.SANDCASTLE) ||
  Boolean(process.env.GITHUB_ACTIONS);

/**
 * Runs benchmarks in benchmark mode (measuring performance with multiple
 * iterations). When false, benchmarks run in test mode (single iteration
 * for correctness only).
 */
export const runBenchmarks: boolean = Boolean(
  process.env.FANTOM_RUN_BENCHMARKS,
);

export const debugJS: boolean = Boolean(process.env.FANTOM_DEBUG_JS);

export const profileJS: boolean = Boolean(process.env.FANTOM_PROFILE_JS);

/**
 * Enables C++ sampling profiler using Linux perf.
 * Saves perf.data files to .out/cpp-traces/ for analysis.
 */
export const profileCpp: boolean = Boolean(process.env.FANTOM_PROFILE_CPP);

/**
 * Enables address sanitizer (ASAN) build mode for the C++ side.
 */
export const enableASAN: boolean = Boolean(process.env.FANTOM_ENABLE_ASAN);

/**
 * Enables thread sanitizer (TSAN) build mode for the C++ side.
 */
export const enableTSAN: boolean = Boolean(process.env.FANTOM_ENABLE_TSAN);

export const enableJSMemoryInstrumentation: boolean = Boolean(
  process.env.FANTOM_ENABLE_JS_MEMORY_INSTRUMENTATION,
);

/**
 * The Fantom tester an OSS run executes, in place of the one
 * `yarn workspace @react-native/fantom build` makes.
 */
export const ossTesterPath: ?string = resolvePath(
  process.env.FANTOM_TESTER_PATH,
);

/**
 * A Metro config file loaded over Fantom's config, as Metro loads a config file
 * over its defaults: an object is merged over Fantom's config, and a function
 * is given Fantom's config and its result merged over it.
 */
export const metroConfigPath: ?string = resolvePath(
  process.env.FANTOM_METRO_CONFIG_PATH,
);

/**
 * Throws an error for a FANTOM_ environment variable that is not recognized,
 * for a combination of them this environment does not support, and for a path
 * that names no file.
 */
export function validateEnvironmentVariables(): void {
  for (const key of Object.keys(process.env)) {
    if (
      key.startsWith('FANTOM_') &&
      !VALID_ENVIRONMENT_VARIABLES.includes(key)
    ) {
      throw new Error(
        `Unexpected Fantom environment variable: ${key}=${String(process.env[key])}. Accepted variables are: ${VALID_ENVIRONMENT_VARIABLES.join(', ')}`,
      );
    }
  }

  if (isCI && debugCpp) {
    throw new Error('Cannot run Fantom with C++ debugging on CI');
  }

  if (isCI && profileCpp) {
    throw new Error('Cannot run Fantom with C++ profiling on CI');
  }

  // Enabling memory instrumentation is only necessary when taking JS heap
  // snapshots in optimized builds (where it is disabled by default).
  // This isn't supported in CI or in OSS because that would require adding
  // another dimension to the build matrix, duplicating the number of binaries
  // we need to build before starting test execution.
  if ((isCI || isOSS) && enableJSMemoryInstrumentation) {
    throw new Error(
      'Memory instrumentation is not supported in CI or OSS environments, as it requires a custom Hermes build that is not prebuilt in those environments.',
    );
  }

  if (ossTesterPath != null && !isOSS) {
    throw new Error(
      'FANTOM_TESTER_PATH is only used in OSS environments, where Fantom runs a tester built with Gradle.',
    );
  }

  for (const [name, filePath] of [
    ['FANTOM_TESTER_PATH', ossTesterPath],
    ['FANTOM_METRO_CONFIG_PATH', metroConfigPath],
  ] as const) {
    if (filePath != null && !fs.existsSync(filePath)) {
      throw new Error(`${name} names no file: ${filePath}`);
    }
  }
}
