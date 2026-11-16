/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import {getGradleTesterPath, selectGradleTester} from '../tester';
import path from 'node:path';

const GRADLE_BUILD_DIRECTORY = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'build',
);

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
