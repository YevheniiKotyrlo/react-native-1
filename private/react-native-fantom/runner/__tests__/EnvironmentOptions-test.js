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

describe('profileCpp', () => {
  it('records no profile when FANTOM_PROFILE_CPP is unset or empty', () => {
    expect(loadEnvironmentOptions({}).profileCpp).toBe(null);
    expect(loadEnvironmentOptions({FANTOM_PROFILE_CPP: ''}).profileCpp).toBe(
      null,
    );
  });

  it('samples with perf for 1, true or perf', () => {
    for (const value of ['1', 'true', 'perf']) {
      expect(
        loadEnvironmentOptions({FANTOM_PROFILE_CPP: value}).profileCpp,
      ).toBe('perf');
    }
  });

  it('runs Callgrind for callgrind', () => {
    expect(
      loadEnvironmentOptions({FANTOM_PROFILE_CPP: 'callgrind'}).profileCpp,
    ).toBe('callgrind');
  });

  it('rejects any other value, naming the ones it takes', () => {
    expect(() =>
      loadEnvironmentOptions({
        FANTOM_PROFILE_CPP: 'Callgrind',
      }).validateEnvironmentVariables(),
    ).toThrow(
      'FANTOM_PROFILE_CPP takes 1, true, perf, callgrind, not Callgrind',
    );
  });

  it('rejects the names every object has', () => {
    for (const value of ['constructor', 'toString', '__proto__']) {
      expect(() =>
        loadEnvironmentOptions({
          FANTOM_PROFILE_CPP: value,
        }).validateEnvironmentVariables(),
      ).toThrow(
        `FANTOM_PROFILE_CPP takes 1, true, perf, callgrind, not ${value}`,
      );
    }
  });

  it('rejects Callgrind over a sanitizer', () => {
    for (const sanitizerVariables of [
      {FANTOM_ENABLE_ASAN: '1'},
      {FANTOM_ENABLE_TSAN: '1'},
    ]) {
      expect(() =>
        loadEnvironmentOptions({
          ...sanitizerVariables,
          FANTOM_PROFILE_CPP: 'callgrind',
        }).validateEnvironmentVariables(),
      ).toThrow('Cannot run a tester built with a sanitizer under Callgrind');
    }
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
