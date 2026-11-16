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

import setFantomEnvironmentVariables from '../../__test_utils__/setFantomEnvironmentVariables';
import path from 'node:path';

function loadTester(variables: Readonly<{[variable: string]: string}>): Tester {
  setFantomEnvironmentVariables(variables);
  jest.resetModules();
  return require('../tester');
}

describe('getOSSFantomTesterPath', () => {
  afterEach(() => {
    setFantomEnvironmentVariables({});
  });

  it('answers the tester the Gradle build makes', () => {
    expect(loadTester({}).getOSSFantomTesterPath()).toBe(
      path.resolve(
        __dirname,
        '..',
        '..',
        '..',
        'build',
        'tester',
        'fantom_tester',
      ),
    );
  });

  it('answers the tester FANTOM_TESTER_PATH names', () => {
    expect(
      loadTester({
        FANTOM_TESTER_PATH: 'testers/address/fantom_tester',
      }).getOSSFantomTesterPath(),
    ).toBe(path.resolve('testers/address/fantom_tester'));
  });
});
