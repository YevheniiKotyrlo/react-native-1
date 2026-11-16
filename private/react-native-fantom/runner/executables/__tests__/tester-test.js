/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import typeof * as Tester from '../tester';

import {
  replaceFantomEnvironment,
  restoreEnvironment,
} from '../../__tests__/fantomEnvironment';
import {HermesVariant} from '../../utils';
import {
  GRADLE_TESTER_BUILDS,
  getCppProfilerCommand,
  getGradleTesterPath,
  selectGradleTester,
} from '../tester';
import fs from 'node:fs';
import path from 'node:path';

jest.mock('node:child_process', () => ({
  ...jest.requireActual('node:child_process'),
  spawnSync: jest.fn(),
}));

jest.mock('node:fs', () => ({
  ...jest.requireActual('node:fs'),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

jest.mock('../../utils', () => ({
  ...jest.requireActual('../../utils'),
  // Jest's transform drops Flow enums: https://github.com/react/react-native/issues/60027
  HermesVariant: {Hermes: 'Hermes'},
  runCommand: jest.fn(),
}));

const FANTOM_DIRECTORY = path.resolve(__dirname, '..', '..', '..');

const GRADLE_BUILD_DIRECTORY = path.join(FANTOM_DIRECTORY, 'build');

const GRADLEW = path.resolve(FANTOM_DIRECTORY, '..', '..', 'gradlew');

const DEV_TESTER_OPTIONS = {
  enableCoverage: false,
  enableOptimized: false,
  hermesVariant: HermesVariant.Hermes,
};

const BOTH_SANITIZERS_WARNING =
  'ASAN and TSAN modes cannot be used together. Using ASAN mode as a fallback.';

afterEach(() => {
  restoreEnvironment();
  jest.restoreAllMocks();
});

type RegisteredGradleTesterVariant = Readonly<{
  directory: string,
  task: string,
  buildType: string,
  sanitizer: ?string,
}>;

function registeredGradleTesterVariants(): Readonly<{
  [variant: string]: RegisteredGradleTesterVariant,
}> {
  const buildScript = fs.readFileSync(
    path.join(FANTOM_DIRECTORY, 'build.gradle.kts'),
    'utf8',
  );
  return Object.fromEntries(
    Array.from(
      buildScript.matchAll(
        /FantomTesterVariant\(\s*"(\w*)",\s*File\("\$buildDir\/([\w-]+)"\),\s*"(\w+)",\s*(?:null|"(\w+)")\s*,?\s*\)/g,
      ),
      ([, taskSuffix, directory, buildType, sanitizer]) => [
        taskSuffix === '' ? 'dev' : taskSuffix.toLowerCase(),
        {
          directory,
          task: `buildFantomTester${taskSuffix}`,
          buildType,
          sanitizer: sanitizer ?? null,
        },
      ],
    ),
  );
}

// The runner's modules read the environment when they load, so each case loads them after setting it.
function loadOSSTester(
  fantomVariables: Readonly<{[variable: string]: string}>,
): Readonly<{
  tester: Tester,
  spawnSync: JestMockFn<
    ReadonlyArray<unknown>,
    Readonly<{status: ?number, signal?: ?string, error?: ?Error}>,
  >,
  existsSync: JestMockFn<[string], boolean>,
  runCommand: JestMockFn<ReadonlyArray<unknown>, unknown>,
  warn: JestMockFn<ReadonlyArray<unknown>, void>,
}> {
  replaceFantomEnvironment({...fantomVariables, FANTOM_FORCE_OSS_BUILD: '1'});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  return {
    tester: require('../tester'),
    spawnSync: jest.requireMock('node:child_process').spawnSync,
    existsSync: jest.requireMock('node:fs').existsSync,
    runCommand: jest.requireMock('../../utils').runCommand,
    warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
  };
}

describe('getGradleTesterPath', () => {
  it('runs the tester Gradle builds with no sanitizer', () => {
    expect(getGradleTesterPath('dev')).toBe(
      path.join(GRADLE_BUILD_DIRECTORY, 'tester', 'fantom_tester'),
    );
  });

  it('runs the AddressSanitizer tester from its own directory', () => {
    expect(getGradleTesterPath('asan')).toBe(
      path.join(GRADLE_BUILD_DIRECTORY, 'tester-asan', 'fantom_tester'),
    );
  });

  it('runs the ThreadSanitizer tester from its own directory', () => {
    expect(getGradleTesterPath('tsan')).toBe(
      path.join(GRADLE_BUILD_DIRECTORY, 'tester-tsan', 'fantom_tester'),
    );
  });

  it('runs the optimized tester from its own directory', () => {
    expect(getGradleTesterPath('opt')).toBe(
      path.join(GRADLE_BUILD_DIRECTORY, 'tester-opt', 'fantom_tester'),
    );
  });
});

describe('selectGradleTester', () => {
  it('runs the dev tester, or the sanitizer the environment enables', () => {
    expect(
      selectGradleTester({
        enableASAN: false,
        enableOptimized: false,
        enableTSAN: false,
      }).variant,
    ).toBe('dev');
    expect(
      selectGradleTester({
        enableASAN: true,
        enableOptimized: false,
        enableTSAN: false,
      }).variant,
    ).toBe('asan');
    expect(
      selectGradleTester({
        enableASAN: false,
        enableOptimized: false,
        enableTSAN: true,
      }).variant,
    ).toBe('tsan');
  });

  it('runs an optimized test on the optimized tester, warning of a sanitizer it leaves out', () => {
    expect(
      selectGradleTester({
        enableASAN: false,
        enableOptimized: true,
        enableTSAN: false,
      }),
    ).toEqual({variant: 'opt', warning: null});
    expect(
      selectGradleTester({
        enableASAN: true,
        enableOptimized: true,
        enableTSAN: false,
      }),
    ).toEqual({
      variant: 'opt',
      warning:
        'ASAN and TSAN are not supported in release mode. Use dev mode instead.',
    });
  });
});

describe('GRADLE_TESTER_BUILDS', () => {
  it('names each tester variant build.gradle.kts registers, by its task and directory', () => {
    expect(GRADLE_TESTER_BUILDS).toEqual(
      Object.fromEntries(
        Object.entries(registeredGradleTesterVariants()).map(
          ([variant, {directory, task}]) => [variant, {directory, task}],
        ),
      ),
    );
  });

  it('builds each variant with the build type and sanitizer it is named for', () => {
    expect(
      Object.fromEntries(
        Object.entries(registeredGradleTesterVariants()).map(
          ([variant, {buildType, sanitizer}]) => [
            variant,
            {buildType, sanitizer},
          ],
        ),
      ),
    ).toEqual({
      dev: {buildType: 'Debug', sanitizer: null},
      opt: {buildType: 'RelWithDebInfo', sanitizer: null},
      asan: {buildType: 'Debug', sanitizer: 'address'},
      tsan: {buildType: 'Debug', sanitizer: 'thread'},
    });
  });
});

describe('selectGradleTesterForRun', () => {
  it('runs an optimized config on the optimized tester, warning of the sanitizer FANTOM_ENABLE_TSAN enables', () => {
    replaceFantomEnvironment({FANTOM_ENABLE_TSAN: '1'});
    expect(require('../tester').selectGradleTesterForRun(true)).toEqual({
      variant: 'opt',
      warning:
        'ASAN and TSAN are not supported in release mode. Use dev mode instead.',
    });
  });

  it('runs a dev config on the tester FANTOM_ENABLE_ASAN builds', () => {
    replaceFantomEnvironment({FANTOM_ENABLE_ASAN: '1'});
    expect(require('../tester').selectGradleTesterForRun(false)).toEqual({
      variant: 'asan',
      warning: null,
    });
  });

  it('runs a dev config on the tester FANTOM_ENABLE_TSAN builds', () => {
    replaceFantomEnvironment({FANTOM_ENABLE_TSAN: '1'});
    expect(require('../tester').selectGradleTesterForRun(false)).toEqual({
      variant: 'tsan',
      warning: null,
    });
  });

  it('runs a dev config on the dev tester with no sanitizer enabled', () => {
    replaceFantomEnvironment({});
    expect(require('../tester').selectGradleTesterForRun(false)).toEqual({
      variant: 'dev',
      warning: null,
    });
  });
});

describe('an OSS run', () => {
  it('runs a dev config on the tester of the sanitizer it enables', () => {
    const {tester} = loadOSSTester({FANTOM_ENABLE_TSAN: '1'});
    expect(tester.getFantomTesterPath(DEV_TESTER_OPTIONS)).toBe(
      path.join(GRADLE_BUILD_DIRECTORY, 'tester-tsan', 'fantom_tester'),
    );
  });

  it('builds a missing tester with the Gradle task of its variant', () => {
    const {tester, spawnSync, existsSync} = loadOSSTester({
      FANTOM_ENABLE_TSAN: '1',
    });
    existsSync.mockReturnValue(false);
    spawnSync.mockReturnValue({status: 0});

    tester.build(DEV_TESTER_OPTIONS, {});

    expect(spawnSync.mock.calls).toEqual([
      [
        GRADLEW,
        [':private:react-native-fantom:buildFantomTesterTsan'],
        expect.objectContaining({cwd: path.dirname(GRADLEW)}),
      ],
    ]);
  });

  it("builds the tester it selects in Jest's global setup", async () => {
    const {spawnSync, existsSync} = loadOSSTester({FANTOM_ENABLE_TSAN: '1'});
    existsSync.mockReturnValue(false);
    spawnSync.mockReturnValue({status: 0});

    await require('../../global-setup/build').default(false, {});

    expect(spawnSync.mock.calls.map(([, args]) => args)).toEqual([
      [':private:react-native-fantom:buildFantomTesterTsan'],
    ]);
  });

  it('leaves a built tester as it is', () => {
    const {tester, spawnSync, existsSync} = loadOSSTester({
      FANTOM_ENABLE_TSAN: '1',
    });
    existsSync.mockReturnValue(true);

    tester.build(DEV_TESTER_OPTIONS, {});

    expect(spawnSync).not.toHaveBeenCalled();
  });

  it("names the task, its exit and Gradle's reports when the build fails", () => {
    const {tester, spawnSync, existsSync} = loadOSSTester({
      FANTOM_ENABLE_ASAN: '1',
    });
    existsSync.mockReturnValue(false);
    spawnSync.mockReturnValue({status: 1, signal: null, error: null});

    expect(() => tester.build(DEV_TESTER_OPTIONS, {})).toThrow(
      `Building the Fantom tester with \`./gradlew :private:react-native-fantom:buildFantomTesterAsan\` failed (exit 1). CMake and the compiler write their output to ${path.join(GRADLE_BUILD_DIRECTORY, 'reports')}.`,
    );
  });

  it('warns once, where it builds, when both sanitizers are enabled', () => {
    const {tester, spawnSync, existsSync, runCommand, warn} = loadOSSTester({
      FANTOM_ENABLE_ASAN: '1',
      FANTOM_ENABLE_TSAN: '1',
    });
    existsSync.mockReturnValue(false);
    spawnSync.mockReturnValue({status: 0});

    tester.build(DEV_TESTER_OPTIONS, {});
    tester.run(['--first'], DEV_TESTER_OPTIONS, {});
    tester.run(['--second'], DEV_TESTER_OPTIONS, {});

    expect(warn.mock.calls).toEqual([[BOTH_SANITIZERS_WARNING]]);
    expect(spawnSync.mock.calls[0][1]).toEqual([
      ':private:react-native-fantom:buildFantomTesterAsan',
    ]);
    expect(runCommand.mock.calls.map(([command]) => command)).toEqual([
      path.join(GRADLE_BUILD_DIRECTORY, 'tester-asan', 'fantom_tester'),
      path.join(GRADLE_BUILD_DIRECTORY, 'tester-asan', 'fantom_tester'),
    ]);
  });

  it('records the tester of its variant with perf under FANTOM_PROFILE_CPP', () => {
    const {tester, existsSync, runCommand} = loadOSSTester({
      FANTOM_ENABLE_TSAN: '1',
      FANTOM_PROFILE_CPP: '1',
    });
    existsSync.mockReturnValue(true);
    runCommand.mockReturnValue({childProcess: {once: () => {}}});

    tester.run(['--bundle'], DEV_TESTER_OPTIONS, {});

    expect(runCommand.mock.calls).toEqual([
      [
        'perf',
        expect.arrayContaining([
          'record',
          '--',
          path.join(GRADLE_BUILD_DIRECTORY, 'tester-tsan', 'fantom_tester'),
          '--bundle',
        ]),
        {},
      ],
    ]);
  });
});

describe('getCppProfilerCommand', () => {
  it('samples the tester with perf, call graphs from DWARF', () => {
    expect(
      getCppProfilerCommand(
        'perf',
        '/build/fantom_tester',
        ['--bundlePath', 'a.js'],
        '/traces/a.perf.data',
      ),
    ).toEqual({
      command: 'perf',
      args: [
        'record',
        '-g',
        '-F',
        '997',
        '--call-graph',
        'dwarf',
        '-o',
        '/traces/a.perf.data',
        '--',
        '/build/fantom_tester',
        '--bundlePath',
        'a.js',
      ],
      viewCommand: 'perf report -i /traces/a.perf.data',
    });
  });

  it('runs the tester under Callgrind', () => {
    expect(
      getCppProfilerCommand(
        'callgrind',
        '/build/fantom_tester',
        ['--bundlePath', 'a.js'],
        '/traces/a.callgrind.out',
      ),
    ).toEqual({
      command: 'valgrind',
      args: [
        '--tool=callgrind',
        '--callgrind-out-file=/traces/a.callgrind.out',
        '--',
        '/build/fantom_tester',
        '--bundlePath',
        'a.js',
      ],
      viewCommand: 'callgrind_annotate /traces/a.callgrind.out',
    });
  });
});
