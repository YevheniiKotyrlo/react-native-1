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

const CI_VARIABLES: ReadonlySet<string> = new Set([
  'GITHUB_ACTIONS',
  'SANDCASTLE',
]);

const savedEnvironment = process.env;

afterEach(() => {
  process.env = savedEnvironment;
});

// EnvironmentOptions reads the environment when it loads.
function loadEnvironmentOptions(
  fantomVariables: Readonly<{[variable: string]: string}>,
): EnvironmentOptions {
  const environment: {[variable: string]: string | void} = {};
  for (const key of Object.keys(savedEnvironment)) {
    if (!key.startsWith('FANTOM_') && !CI_VARIABLES.has(key)) {
      environment[key] = savedEnvironment[key];
    }
  }
  process.env = {...environment, ...fantomVariables};
  jest.resetModules();
  return require('../EnvironmentOptions');
}

describe('profileCpp', () => {
  it('records no profile when FANTOM_PROFILE_CPP is unset or empty', () => {
    expect(loadEnvironmentOptions({}).profileCpp).toBe(null);
    expect(loadEnvironmentOptions({FANTOM_PROFILE_CPP: ''}).profileCpp).toBe(
      null,
    );
  });

  it('samples with perf for any value but callgrind', () => {
    expect(loadEnvironmentOptions({FANTOM_PROFILE_CPP: '1'}).profileCpp).toBe(
      'perf',
    );
    expect(
      loadEnvironmentOptions({FANTOM_PROFILE_CPP: 'perf'}).profileCpp,
    ).toBe('perf');
  });

  it('runs Callgrind for callgrind', () => {
    expect(
      loadEnvironmentOptions({FANTOM_PROFILE_CPP: 'callgrind'}).profileCpp,
    ).toBe('callgrind');
  });

  it('rejects either profiler on CI', () => {
    for (const profiler of ['1', 'callgrind']) {
      expect(() =>
        loadEnvironmentOptions({
          FANTOM_FORCE_CI_MODE: '1',
          FANTOM_PROFILE_CPP: profiler,
        }).validateEnvironmentVariables(),
      ).toThrow('Cannot run Fantom with C++ profiling on CI');
    }
  });
});

describe('validateEnvironmentVariables', () => {
  it('rejects C++ debugging in OSS, which runs the tester through Buck', () => {
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
