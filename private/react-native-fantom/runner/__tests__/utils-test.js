/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import type {SanitizerSelection} from '../utils';

import {selectSanitizer} from '../utils';
import {
  replaceFantomEnvironment,
  restoreEnvironment,
} from './fantomEnvironment';

jest.mock('node:os', () => ({
  ...jest.requireActual('node:os'),
  platform: () => 'linux',
}));

afterEach(restoreEnvironment);

const RELEASE_MODE_WARNING =
  'ASAN and TSAN are not supported in release mode. Use dev mode instead.';
const BOTH_SANITIZERS_WARNING =
  'ASAN and TSAN modes cannot be used together. Using ASAN mode as a fallback.';

const SELECTIONS: ReadonlyArray<
  [
    Readonly<{
      enableASAN: boolean,
      enableOptimized: boolean,
      enableTSAN: boolean,
    }>,
    SanitizerSelection,
  ],
> = [
  [
    {enableASAN: false, enableOptimized: false, enableTSAN: false},
    {sanitizer: null, warning: null},
  ],
  [
    {enableASAN: true, enableOptimized: false, enableTSAN: false},
    {sanitizer: 'asan', warning: null},
  ],
  [
    {enableASAN: false, enableOptimized: false, enableTSAN: true},
    {sanitizer: 'tsan', warning: null},
  ],
  [
    {enableASAN: true, enableOptimized: false, enableTSAN: true},
    {sanitizer: 'asan', warning: BOTH_SANITIZERS_WARNING},
  ],
  [
    {enableASAN: false, enableOptimized: true, enableTSAN: false},
    {sanitizer: null, warning: null},
  ],
  [
    {enableASAN: true, enableOptimized: true, enableTSAN: false},
    {sanitizer: null, warning: RELEASE_MODE_WARNING},
  ],
  [
    {enableASAN: false, enableOptimized: true, enableTSAN: true},
    {sanitizer: null, warning: RELEASE_MODE_WARNING},
  ],
  [
    {enableASAN: true, enableOptimized: true, enableTSAN: true},
    {sanitizer: null, warning: RELEASE_MODE_WARNING},
  ],
];

describe('selectSanitizer', () => {
  for (const [options, selection] of SELECTIONS) {
    it(`selects ${String(selection.sanitizer)} for ${JSON.stringify(options)}`, () => {
      expect(selectSanitizer(options)).toEqual(selection);
    });
  }
});

describe('getBuckModesForPlatform', () => {
  it.each([
    ['FANTOM_ENABLE_ASAN', '@//fbcode/mode/dev-asan'],
    ['FANTOM_ENABLE_TSAN', '@//fbcode/mode/dev-tsan'],
  ])('builds a dev config on Linux under %s in %s', (variable, mode) => {
    replaceFantomEnvironment({[variable]: '1'});
    expect(
      require('../utils').getBuckModesForPlatform({
        enableCoverage: false,
        enableOptimized: false,
      }),
    ).toContain(mode);
  });
});
