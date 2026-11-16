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

import setFantomEnvironmentVariables from '../__test_utils__/setFantomEnvironmentVariables';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function loadEnvironmentOptions(
  variables: Readonly<{[variable: string]: string}>,
): EnvironmentOptions {
  setFantomEnvironmentVariables(variables);
  jest.resetModules();
  return require('../EnvironmentOptions');
}

describe('EnvironmentOptions', () => {
  let directory: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fantom-options-'));
  });

  afterEach(() => {
    setFantomEnvironmentVariables({});
    fs.rmSync(directory, {recursive: true, force: true});
  });

  it('resolves the tester against the working directory', () => {
    expect(
      loadEnvironmentOptions({FANTOM_TESTER_PATH: 'build/fantom_tester'})
        .ossTesterPath,
    ).toBe(path.resolve('build/fantom_tester'));
  });

  it('leaves the tester unset when its variable is unset or empty', () => {
    expect(loadEnvironmentOptions({}).ossTesterPath).toBeNull();
    expect(
      loadEnvironmentOptions({FANTOM_TESTER_PATH: ''}).ossTesterPath,
    ).toBeNull();
  });

  it('accepts a tester that exists in an OSS run', () => {
    const testerPath = path.join(directory, 'fantom_tester');
    fs.writeFileSync(testerPath, '');

    expect(() =>
      loadEnvironmentOptions({
        FANTOM_FORCE_OSS_BUILD: '1',
        FANTOM_TESTER_PATH: testerPath,
      }).validateEnvironmentVariables(),
    ).not.toThrow();
  });

  it('rejects a tester that does not exist', () => {
    const missingPath = path.join(directory, 'missing');

    expect(() =>
      loadEnvironmentOptions({
        FANTOM_FORCE_OSS_BUILD: '1',
        FANTOM_TESTER_PATH: missingPath,
      }).validateEnvironmentVariables(),
    ).toThrow(`FANTOM_TESTER_PATH names no file: ${missingPath}`);
  });

  it('rejects a tester outside an OSS run', () => {
    const testerPath = path.join(directory, 'fantom_tester');
    fs.writeFileSync(testerPath, '');

    expect(() =>
      loadEnvironmentOptions({
        FANTOM_TESTER_PATH: testerPath,
      }).validateEnvironmentVariables(),
    ).toThrow('FANTOM_TESTER_PATH is only used in OSS environments');
  });
});
