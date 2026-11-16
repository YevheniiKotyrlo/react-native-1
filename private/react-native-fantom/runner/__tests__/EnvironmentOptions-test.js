/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import typeof * as EnvironmentOptions from '../EnvironmentOptions';

import {
  replaceFantomEnvironment,
  restoreEnvironment,
} from './fantomEnvironment';

afterEach(restoreEnvironment);

function loadEnvironmentOptions(
  fantomVariables: Readonly<{[variable: string]: string}>,
): EnvironmentOptions {
  replaceFantomEnvironment(fantomVariables);
  return require('../EnvironmentOptions');
}

describe('validateEnvironmentVariables', () => {
  it('rejects C++ debugging, which runs the tester through Buck, in OSS', () => {
    expect(() =>
      loadEnvironmentOptions({
        FANTOM_DEBUG_CPP: '1',
        FANTOM_FORCE_OSS_BUILD: '1',
      }).validateEnvironmentVariables(),
    ).toThrow('Cannot run Fantom with C++ debugging in OSS');
  });

  it('accepts C++ debugging outside CI and OSS', () => {
    expect(() =>
      loadEnvironmentOptions({
        FANTOM_DEBUG_CPP: '1',
      }).validateEnvironmentVariables(),
    ).not.toThrow();
  });
});
