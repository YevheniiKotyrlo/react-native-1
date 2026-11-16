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
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const FANTOM_OWN_METRO_CONFIG_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'config',
  'metro.config.js',
);

afterEach(restoreEnvironment);

function loadEnvironmentOptions(
  fantomVariables: Readonly<{[variable: string]: string}>,
): EnvironmentOptions {
  replaceFantomEnvironment(fantomVariables);
  return require('../EnvironmentOptions');
}

describe('FANTOM_METRO_CONFIG_PATH', () => {
  let directory: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fantom-metro-config-'));
  });

  afterEach(() => {
    fs.rmSync(directory, {recursive: true, force: true});
  });

  it("answers Fantom's own config when unset or empty", () => {
    expect(loadEnvironmentOptions({}).metroConfigPath).toBe(
      FANTOM_OWN_METRO_CONFIG_PATH,
    );
    expect(
      loadEnvironmentOptions({FANTOM_METRO_CONFIG_PATH: ''}).metroConfigPath,
    ).toBe(FANTOM_OWN_METRO_CONFIG_PATH);
  });

  it('resolves the config it names against the working directory', () => {
    expect(
      loadEnvironmentOptions({
        FANTOM_METRO_CONFIG_PATH: path.join('fantom', 'metro.config.js'),
      }).metroConfigPath,
    ).toBe(path.resolve('fantom', 'metro.config.js'));
  });

  it('accepts a config that exists', () => {
    const metroConfigPath = path.join(directory, 'metro.config.js');
    fs.writeFileSync(metroConfigPath, 'module.exports = {};');

    expect(() =>
      loadEnvironmentOptions({
        FANTOM_METRO_CONFIG_PATH: metroConfigPath,
      }).validateEnvironmentVariables(),
    ).not.toThrow();
  });

  it('rejects a config that does not exist', () => {
    const missingPath = path.join(directory, 'missing.config.js');

    expect(() =>
      loadEnvironmentOptions({
        FANTOM_METRO_CONFIG_PATH: missingPath,
      }).validateEnvironmentVariables(),
    ).toThrow(`FANTOM_METRO_CONFIG_PATH names no file: ${missingPath}`);
  });

  it('rejects a directory', () => {
    expect(() =>
      loadEnvironmentOptions({
        FANTOM_METRO_CONFIG_PATH: directory,
      }).validateEnvironmentVariables(),
    ).toThrow(`FANTOM_METRO_CONFIG_PATH names no file: ${directory}`);
  });
});
