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

  it('resolves the tester and the Metro config against the working directory', () => {
    const environmentOptions = loadEnvironmentOptions({
      FANTOM_TESTER_PATH: 'build/fantom_tester',
      FANTOM_METRO_CONFIG_PATH: 'metro.config.js',
    });

    expect(environmentOptions.ossTesterPath).toBe(
      path.resolve('build/fantom_tester'),
    );
    expect(environmentOptions.metroConfigPath).toBe(
      path.resolve('metro.config.js'),
    );
  });

  it('leaves both unset when their variables are unset or empty', () => {
    expect(loadEnvironmentOptions({}).ossTesterPath).toBeNull();
    expect(
      loadEnvironmentOptions({FANTOM_METRO_CONFIG_PATH: ''}).metroConfigPath,
    ).toBeNull();
  });

  it('accepts a tester and a Metro config that exist in an OSS run', () => {
    const testerPath = path.join(directory, 'fantom_tester');
    const metroConfigPath = path.join(directory, 'metro.config.js');
    fs.writeFileSync(testerPath, '');
    fs.writeFileSync(metroConfigPath, 'module.exports = {};');

    expect(() =>
      loadEnvironmentOptions({
        FANTOM_FORCE_OSS_BUILD: '1',
        FANTOM_TESTER_PATH: testerPath,
        FANTOM_METRO_CONFIG_PATH: metroConfigPath,
      }).validateEnvironmentVariables(),
    ).not.toThrow();
  });

  it('rejects a tester or a Metro config that does not exist', () => {
    const missingPath = path.join(directory, 'missing');

    expect(() =>
      loadEnvironmentOptions({
        FANTOM_FORCE_OSS_BUILD: '1',
        FANTOM_TESTER_PATH: missingPath,
      }).validateEnvironmentVariables(),
    ).toThrow(`FANTOM_TESTER_PATH names no file: ${missingPath}`);
    expect(() =>
      loadEnvironmentOptions({
        FANTOM_METRO_CONFIG_PATH: missingPath,
      }).validateEnvironmentVariables(),
    ).toThrow(`FANTOM_METRO_CONFIG_PATH names no file: ${missingPath}`);
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
