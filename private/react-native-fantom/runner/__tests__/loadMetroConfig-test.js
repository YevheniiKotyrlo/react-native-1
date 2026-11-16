/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import typeof LoadMetroConfig from '../loadMetroConfig';

import {
  replaceFantomEnvironment,
  restoreEnvironment,
} from './fantomEnvironment';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

let directory: string;

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fantom-metro-config-'));
});

afterEach(() => {
  restoreEnvironment();
  fs.rmSync(directory, {recursive: true, force: true});
});

function loadMetroConfigFrom(
  config: Readonly<{[option: string]: unknown}>,
): LoadMetroConfig {
  const metroConfigPath = path.join(directory, 'metro.config.js');
  fs.writeFileSync(
    metroConfigPath,
    `module.exports = ${JSON.stringify(config)};`,
  );
  replaceFantomEnvironment({FANTOM_METRO_CONFIG_PATH: metroConfigPath});
  return require('../loadMetroConfig').default;
}

describe('loadMetroConfig', () => {
  it('loads the config FANTOM_METRO_CONFIG_PATH names, served on the port it is given', async () => {
    const loadMetroConfig = loadMetroConfigFrom({
      projectRoot: PROJECT_ROOT,
      resolver: {extraNodeModules: {'my-library': path.join(directory, 'src')}},
    });

    const config = await loadMetroConfig(8099);

    expect(config.server.port).toBe(8099);
    expect(config.resolver.extraNodeModules).toEqual({
      'my-library': path.join(directory, 'src'),
    });
  });

  it('rejects a config whose projectRoot is another directory', async () => {
    const loadMetroConfig = loadMetroConfigFrom({projectRoot: directory});

    await expect(loadMetroConfig(8099)).rejects.toThrow(/projectRoot/);
  });

  it("rejects a config whose projectRoot is another directory, though it serves files from the repository's root", async () => {
    const loadMetroConfig = loadMetroConfigFrom({
      projectRoot: directory,
      server: {unstable_serverRoot: PROJECT_ROOT},
    });

    await expect(loadMetroConfig(8099)).rejects.toThrow(/projectRoot/);
  });

  it('rejects a config that serves files from another root, naming server.unstable_serverRoot', async () => {
    const loadMetroConfig = loadMetroConfigFrom({
      projectRoot: PROJECT_ROOT,
      server: {unstable_serverRoot: directory},
    });

    await expect(loadMetroConfig(8099)).rejects.toThrow(
      /server\.unstable_serverRoot/,
    );
  });
});
