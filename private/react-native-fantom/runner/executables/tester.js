/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import type {
  AsyncCommandResult,
  EnvironmentOverrides,
  HermesVariant,
  Sanitizer,
} from '../utils';

import {
  debugCpp,
  enableASAN,
  enableTSAN,
  isCI,
  isOSS,
  profileCpp,
} from '../EnvironmentOptions';
import {
  CPP_TRACES_OUTPUT_PATH,
  GRADLE_BUILD_OUTPUT_PATH,
  NATIVE_BUILD_OUTPUT_PATH,
  PROJECT_ROOT,
} from '../paths';
import {
  getBuckModesForPlatform,
  getBuckOptionsForHermes,
  getDebugInfoFromCommandResult,
  printConsoleLog,
  runBuck2,
  runBuck2Sync,
  runCommand,
  runCommandSync,
  selectSanitizer,
} from '../utils';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const FANTOM_TESTER_BUCK_TARGET =
  'fbsource//xplat/js/react-native-github/private/react-native-fantom/tester:tester';

type TesterOptions = Readonly<{
  enableCoverage: boolean,
  enableOptimized: boolean,
  hermesVariant: HermesVariant,
}>;

type GradleTesterVariant = 'dev' | 'opt' | Sanitizer;

type GradleTesterBuild = Readonly<{directory: string, task: string}>;

// build.gradle.kts registers these tasks, each building its variant into its directory.
const GRADLE_TESTER_BUILDS: Readonly<{
  dev: GradleTesterBuild,
  opt: GradleTesterBuild,
  asan: GradleTesterBuild,
  tsan: GradleTesterBuild,
}> = {
  dev: {directory: 'tester', task: 'buildFantomTester'},
  opt: {directory: 'tester-opt', task: 'buildFantomTesterOpt'},
  asan: {directory: 'tester-asan', task: 'buildFantomTesterAsan'},
  tsan: {directory: 'tester-tsan', task: 'buildFantomTesterTsan'},
};

export function selectGradleTester(
  options: Readonly<{
    enableASAN: boolean,
    enableOptimized: boolean,
    enableTSAN: boolean,
  }>,
): Readonly<{variant: GradleTesterVariant, warning: ?string}> {
  const {sanitizer, warning} = selectSanitizer(options);
  return {
    variant: options.enableOptimized ? 'opt' : (sanitizer ?? 'dev'),
    warning,
  };
}

export function getGradleTesterPath(variant: GradleTesterVariant): string {
  return path.join(
    GRADLE_BUILD_OUTPUT_PATH,
    GRADLE_TESTER_BUILDS[variant].directory,
    'fantom_tester',
  );
}

export function getFantomTesterPath({
  hermesVariant,
  ...options
}: TesterOptions): string {
  if (isOSS) {
    return getGradleTesterPath(
      selectGradleTester({
        enableASAN,
        enableOptimized: options.enableOptimized,
        enableTSAN,
      }).variant,
    );
  }
  return path.join(
    NATIVE_BUILD_OUTPUT_PATH,
    `fantom-tester-${(hermesVariant as string).toLowerCase()}-${options.enableOptimized ? 'opt' : 'dev'}${options.enableCoverage ? '-coverage' : ''}`,
  );
}

function buildWithGradle(options: TesterOptions): void {
  const {variant, warning} = selectGradleTester({
    enableASAN,
    enableOptimized: options.enableOptimized,
    enableTSAN,
  });
  if (fs.existsSync(getGradleTesterPath(variant))) {
    return;
  }
  if (warning != null) {
    printConsoleLog({type: 'console-log', level: 'warn', message: warning});
  }

  const task = `:private:react-native-fantom:${GRADLE_TESTER_BUILDS[variant].task}`;
  const result = spawnSync(path.join(PROJECT_ROOT, 'gradlew'), [task], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(
      `Building the Fantom tester with \`./gradlew ${task}\` failed`,
      {cause: result.error},
    );
  }
}

export function build(options: TesterOptions, env: EnvironmentOverrides): void {
  if (isOSS) {
    buildWithGradle(options);
    return;
  }

  const destPath = getFantomTesterPath(options);
  if (fs.existsSync(destPath)) {
    return;
  }

  // Use system temp directory outside the repo to avoid macOS extended
  // attribute issues with EdenFS/NFS-backed directories
  const tmpPath = path.join(
    os.tmpdir(),
    `fantom-tester-${Date.now()}-${process.pid}`,
  );
  const destTmpPath = destPath + '-' + Date.now() + '-' + process.pid;

  try {
    const result = runBuck2Sync(
      [
        'build',
        ...getBuckModesForPlatform({
          enableOptimized: options.enableOptimized,
          enableCoverage: options.enableCoverage,
        }),
        ...getBuckOptionsForHermes(options.hermesVariant),
        FANTOM_TESTER_BUCK_TARGET,
        '--out',
        tmpPath,
      ],
      env,
      {
        withFDB: false,
      },
    );

    if (result.status !== 0) {
      throw new Error(getDebugInfoFromCommandResult(result));
    }

    if (fs.existsSync(destPath)) {
      // Another test might have compiled the binary after our initial check.
      return;
    }

    // Remove extended attributes to avoid "Operation not permitted" errors
    // when copying to EdenFS/NFS-backed directories on macOS
    if (os.platform() === 'darwin') {
      runCommandSync('xattr', ['-rc', tmpPath], {});
    }

    fs.copyFileSync(tmpPath, destTmpPath);

    try {
      fs.renameSync(destTmpPath, destPath);
    } catch (e: unknown) {
      // Another process may have created the file already - that's fine
      const code =
        typeof e === 'object' && e != null && typeof e.code === 'string'
          ? e.code
          : null;
      if (code !== 'EEXIST' && !fs.existsSync(destPath)) {
        throw e;
      }
    }
  } finally {
    try {
      fs.unlinkSync(tmpPath);
    } catch {}
    try {
      fs.unlinkSync(destTmpPath);
    } catch {}
  }
}

export function run(
  args: ReadonlyArray<string>,
  options: TesterOptions,
  env: EnvironmentOverrides,
): AsyncCommandResult {
  if (!isCI && !debugCpp) {
    build(options, env);
  }

  if (debugCpp) {
    return runBuck2(
      [
        'run',
        ...getBuckModesForPlatform({
          enableOptimized: options.enableOptimized,
          enableCoverage: options.enableCoverage,
        }),
        ...getBuckOptionsForHermes(options.hermesVariant),
        FANTOM_TESTER_BUCK_TARGET,
        '--',
        ...args,
      ],
      env,
      {
        withFDB: true,
      },
    );
  }

  const testerPath = getFantomTesterPath(options);

  if (profileCpp == null) {
    return runCommand(testerPath, args, env);
  }

  switch (profileCpp) {
    case 'perf':
      return runWithPerf(testerPath, args);
    case 'callgrind':
      return runWithCallgrind(testerPath, args);
    default:
      profileCpp as empty;
      throw new TypeError(`Unexpected C++ profiler: ${profileCpp}`);
  }
}

// Workers profile at the same time, so each recording names its process.
function getCppTraceOutputPath(name: string, extension: string): string {
  fs.mkdirSync(CPP_TRACES_OUTPUT_PATH, {recursive: true});
  return path.join(
    CPP_TRACES_OUTPUT_PATH,
    `${name}-${Date.now()}-${process.pid}.${extension}`,
  );
}

function runWithPerf(
  testerPath: string,
  args: ReadonlyArray<string>,
): AsyncCommandResult {
  const perfOutputPath = getCppTraceOutputPath('perf', 'data');

  // -F 997: sample at 997 Hz (prime number to avoid aliasing)
  // --call-graph dwarf: use DWARF for accurate stack traces
  const result = runCommand(
    'perf',
    [
      'record',
      '-g',
      '-F',
      '997',
      '--call-graph',
      'dwarf',
      '-o',
      perfOutputPath,
      '--',
      testerPath,
      ...args,
    ],
    {},
  );

  console.log(
    `\n🔥 C++ sampling profiler recording to: ${perfOutputPath}\n` +
      `   View with: perf report -i ${perfOutputPath}\n`,
  );

  return result;
}

function runWithCallgrind(
  testerPath: string,
  args: ReadonlyArray<string>,
): AsyncCommandResult {
  const callgrindOutputPath = getCppTraceOutputPath('callgrind', 'out');

  const result = runCommand(
    'valgrind',
    [
      '--tool=callgrind',
      `--callgrind-out-file=${callgrindOutputPath}`,
      '--',
      testerPath,
      ...args,
    ],
    {},
  );

  console.log(
    `\n🔥 C++ instruction profiler recording to: ${callgrindOutputPath}\n` +
      `   View with: callgrind_annotate ${callgrindOutputPath}\n`,
  );

  return result;
}
