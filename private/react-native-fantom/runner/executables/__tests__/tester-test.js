/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import {getGradleTesterPath} from '../tester';
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
});
