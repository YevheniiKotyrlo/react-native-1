/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import type {CppProfiler} from './EnvironmentOptions';
import type {FantomTestConfig} from './getFantomTestConfigs';

import formatFantomConfig from './formatFantomConfig';
import path from 'node:path';

export const PROJECT_ROOT: string = path.resolve(__dirname, '..', '..', '..');

export const OUTPUT_PATH: string = path.resolve(__dirname, '..', '.out');
export const JS_BUILD_OUTPUT_PATH: string = path.join(OUTPUT_PATH, 'js-builds');
export const NATIVE_BUILD_OUTPUT_PATH: string = path.join(
  OUTPUT_PATH,
  'native-builds',
);
export const GRADLE_BUILD_OUTPUT_PATH: string = path.resolve(
  __dirname,
  '..',
  'build',
);
// Gradle's tester tasks build hermesc beside the Hermes library the tester links.
export const GRADLE_HERMES_COMPILER_PATH: string = path.join(
  PROJECT_ROOT,
  'packages',
  'react-native',
  'ReactAndroid',
  'hermes-engine',
  'build',
  'hermes',
  'bin',
  'hermesc',
);
export const JS_TRACES_OUTPUT_PATH: string = path.join(
  OUTPUT_PATH,
  'js-traces',
);
export const CPP_TRACES_OUTPUT_PATH: string = path.join(
  OUTPUT_PATH,
  'cpp-traces',
);
export const JS_HEAP_SNAPSHOTS_OUTPUT_PATH: string = path.join(
  OUTPUT_PATH,
  'js-heap-snapshots',
);

export function getTestBuildOutputPath(): string {
  const fantomRunID = process.env.__FANTOM_RUN_ID__;
  if (fantomRunID == null) {
    throw new Error(
      'Expected Fantom run ID to be set by global setup, but it was not (process.env.__FANTOM_RUN_ID__ is null)',
    );
  }

  return path.join(JS_BUILD_OUTPUT_PATH, fantomRunID);
}

type TraceSource = Readonly<{
  testPath: string,
  testConfig: FantomTestConfig,
  isMultiConfigTest: boolean,
}>;

function getTraceFileNameParts({
  testPath,
  testConfig,
  isMultiConfigTest,
}: TraceSource): ReadonlyArray<string> {
  const configSummary = isMultiConfigTest
    ? formatFantomConfig(testConfig, {style: 'short'})
    : '';
  return configSummary !== ''
    ? [path.basename(testPath), configSummary]
    : [path.basename(testPath)];
}

function getTraceFileName(source: TraceSource, startedAt: Date): string {
  return [...getTraceFileNameParts(source), startedAt.toISOString()].join('-');
}

const CPP_TRACE_EXTENSIONS: Readonly<{perf: string, callgrind: string}> = {
  perf: 'perf.data',
  callgrind: 'callgrind.out',
};

// A recording made outside a test, by the REPL, is named after the tester.
export function buildCppTracesOutputPath(
  source: ?TraceSource,
  profiler: CppProfiler,
  startedAt: Date,
): string {
  const name =
    source != null
      ? getTraceFileName(source, startedAt)
      : `fantom-tester-${startedAt.toISOString()}`;
  return path.join(
    CPP_TRACES_OUTPUT_PATH,
    `${name}.${CPP_TRACE_EXTENSIONS[profiler]}`,
  );
}

export function buildJSTracesOutputPath(
  source: TraceSource,
  startedAt: Date,
): string {
  return path.join(
    JS_TRACES_OUTPUT_PATH,
    getTraceFileName(source, startedAt) + '.cpuprofile',
  );
}

const JS_HEAP_SNAPSHOT_OUTPUT_PATH_TOKEN = '${timestamp}';

export function buildJSHeapSnapshotsOutputPathTemplate(
  source: TraceSource,
): [string, string] {
  const fileName =
    [...getTraceFileNameParts(source), JS_HEAP_SNAPSHOT_OUTPUT_PATH_TOKEN].join(
      '-',
    ) + '.heapsnapshot';

  return [
    path.join(JS_HEAP_SNAPSHOTS_OUTPUT_PATH, fileName),
    JS_HEAP_SNAPSHOT_OUTPUT_PATH_TOKEN,
  ];
}
