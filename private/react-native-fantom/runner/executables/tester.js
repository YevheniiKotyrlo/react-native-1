/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import type {CppProfiler} from '../EnvironmentOptions';
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
  GRADLE_BUILD_OUTPUT_PATH,
  NATIVE_BUILD_OUTPUT_PATH,
  PROJECT_ROOT,
  buildCppTracesOutputPath,
} from '../paths';
import {
  getBuckModesForPlatform,
  getBuckOptionsForHermes,
  getDebugInfoFromCommandResult,
  maybeLogCommand,
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

export const GRADLE_TESTER_BUILDS: Readonly<{
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
): Readonly<{
  variant: GradleTesterVariant,
  warning: ?string,
}> {
  const {sanitizer, warning} = selectSanitizer(options);
  return {
    variant: options.enableOptimized ? 'opt' : (sanitizer ?? 'dev'),
    warning,
  };
}

export function selectGradleTesterForRun(
  enableOptimized: boolean,
): ReturnType<typeof selectGradleTester> {
  return selectGradleTester({enableASAN, enableOptimized, enableTSAN});
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
      selectGradleTesterForRun(options.enableOptimized).variant,
    );
  }
  return path.join(
    NATIVE_BUILD_OUTPUT_PATH,
    `fantom-tester-${(hermesVariant as string).toLowerCase()}-${options.enableOptimized ? 'opt' : 'dev'}${options.enableCoverage ? '-coverage' : ''}`,
  );
}

// Built once per run or REPL session, before it starts: Jest's workers cannot share a Gradle build.
function buildWithGradle(variant: GradleTesterVariant): void {
  if (fs.existsSync(getGradleTesterPath(variant))) {
    return;
  }

  const gradle = path.join(PROJECT_ROOT, 'gradlew');
  const task = `:private:react-native-fantom:${GRADLE_TESTER_BUILDS[variant].task}`;
  maybeLogCommand(gradle, [task]);
  const result = spawnSync(gradle, [task], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    const outcome =
      result.error?.message ?? `exit ${String(result.status ?? result.signal)}`;
    throw new Error(
      `Building the Fantom tester with \`./gradlew ${task}\` failed (${outcome}). CMake and the compiler write their output to ${path.join(GRADLE_BUILD_OUTPUT_PATH, 'reports')}.`,
      {cause: result.error},
    );
  }
}

export function isBuilt(options: TesterOptions): boolean {
  return !isOSS || fs.existsSync(getFantomTesterPath(options));
}

export function build(options: TesterOptions, env: EnvironmentOverrides): void {
  if (isOSS) {
    const {variant, warning} = selectGradleTesterForRun(
      options.enableOptimized,
    );
    if (warning != null) {
      printConsoleLog({type: 'console-log', level: 'warn', message: warning});
    }
    buildWithGradle(variant);
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

export type CppProfilerCommand = Readonly<{
  command: string,
  args: ReadonlyArray<string>,
  viewCommand: string,
}>;

export function getCppProfilerCommand(
  profiler: CppProfiler,
  testerPath: string,
  testerArgs: ReadonlyArray<string>,
  outputPath: string,
): CppProfilerCommand {
  switch (profiler) {
    case 'perf':
      return {
        command: 'perf',
        // -g: enable call-graph (stack traces)
        // -F 997: sample at 997 Hz (prime number to avoid aliasing)
        // --call-graph dwarf: use DWARF for accurate stack traces
        args: [
          'record',
          '-g',
          '-F',
          '997',
          '--call-graph',
          'dwarf',
          '-o',
          outputPath,
          '--',
          testerPath,
          ...testerArgs,
        ],
        viewCommand: `perf report -i ${outputPath}`,
      };
    case 'callgrind':
      return {
        command: 'valgrind',
        args: [
          '--tool=callgrind',
          `--callgrind-out-file=${outputPath}`,
          '--',
          testerPath,
          ...testerArgs,
        ],
        viewCommand: `callgrind_annotate ${outputPath}`,
      };
    default:
      profiler as empty;
      throw new TypeError(`Unexpected C++ profiler: ${profiler}`);
  }
}

export function run(
  args: ReadonlyArray<string>,
  options: TesterOptions,
  env: EnvironmentOverrides,
  cppTraceOutputPath?: string,
): AsyncCommandResult {
  if (!isCI && !isOSS && !debugCpp) {
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

  const outputPath =
    cppTraceOutputPath ??
    buildCppTracesOutputPath(null, profileCpp, new Date());
  fs.mkdirSync(path.dirname(outputPath), {recursive: true});
  const {
    command,
    args: profilerArgs,
    viewCommand,
  } = getCppProfilerCommand(profileCpp, testerPath, args, outputPath);
  const result = runCommand(command, profilerArgs, env);
  result.childProcess.once('spawn', () => {
    console.log(
      `\n🔥 C++ ${profileCpp} recording to: ${outputPath}\n   View with: ${viewCommand}\n`,
    );
  });
  return result;
}
