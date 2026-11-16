/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

const fantomJestConfig = require('../jest.config');

describe("Fantom's Jest config", () => {
  const testRegex = new RegExp(fantomJestConfig.testRegex);

  it.each([
    'Libraries/Components/View/__tests__/View-itest.js',
    'Libraries/Components/View/__tests__/View-itest.fb.js',
    'my-library/__tests__/Example-itest.ts',
    'my-library/__tests__/Example-itest.tsx',
  ])('runs %s', testPath => {
    expect(testRegex.test(`/repository/${testPath}`)).toBe(true);
  });

  it.each([
    'Libraries/Components/View/__tests__/View-test.js',
    'Libraries/Components/View/View-itest.js',
    'my-library/__tests__/Example-itest.jsx',
    'my-library/__tests__/Example-itest.d.ts',
    'my-library/__tests__/Example-itest.fb.ts',
  ])('skips %s', testPath => {
    expect(testRegex.test(`/repository/${testPath}`)).toBe(false);
  });
});
