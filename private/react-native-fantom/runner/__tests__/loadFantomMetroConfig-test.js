/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import typeof LoadFantomMetroConfig from '../loadFantomMetroConfig';

import setFantomEnvironmentVariables from '../__test_utils__/setFantomEnvironmentVariables';
import path from 'node:path';

const mockLoadConfig = jest.fn();

jest.mock('metro', () => ({
  loadConfig: (...args: ReadonlyArray<unknown>) => mockLoadConfig(...args),
}));

const FANTOM_METRO_CONFIG_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'config',
  'metro.config.js',
);

function loadFantomMetroConfigWith(
  variables: Readonly<{[variable: string]: string}>,
): LoadFantomMetroConfig {
  setFantomEnvironmentVariables(variables);
  jest.resetModules();
  return require('../loadFantomMetroConfig').default;
}

describe('loadFantomMetroConfig', () => {
  const fantomConfig = {projectRoot: 'fantom'};
  const libraryConfig = {projectRoot: 'library'};

  beforeEach(() => {
    mockLoadConfig.mockReset();
  });

  afterEach(() => {
    setFantomEnvironmentVariables({});
  });

  it("loads Fantom's config when FANTOM_METRO_CONFIG_PATH is unset", async () => {
    mockLoadConfig.mockResolvedValueOnce(fantomConfig);

    await expect(loadFantomMetroConfigWith({})()).resolves.toBe(fantomConfig);
    expect(mockLoadConfig.mock.calls).toEqual([
      [{config: FANTOM_METRO_CONFIG_PATH}],
    ]);
  });

  it("loads the config FANTOM_METRO_CONFIG_PATH names over Fantom's", async () => {
    mockLoadConfig.mockResolvedValueOnce(fantomConfig);
    mockLoadConfig.mockResolvedValueOnce(libraryConfig);

    await expect(
      loadFantomMetroConfigWith({
        FANTOM_METRO_CONFIG_PATH: 'my-library/metro.config.js',
      })(),
    ).resolves.toBe(libraryConfig);
    expect(mockLoadConfig.mock.calls).toEqual([
      [{config: FANTOM_METRO_CONFIG_PATH}],
      [{config: path.resolve('my-library/metro.config.js')}, fantomConfig],
    ]);
  });

  it('loads the same configs on every call', async () => {
    mockLoadConfig.mockImplementation(({config}) =>
      Promise.resolve(
        config === FANTOM_METRO_CONFIG_PATH ? fantomConfig : libraryConfig,
      ),
    );
    const loadFantomMetroConfig = loadFantomMetroConfigWith({
      FANTOM_METRO_CONFIG_PATH: 'my-library/metro.config.js',
    });

    const first = await loadFantomMetroConfig();
    const firstCalls = [...mockLoadConfig.mock.calls];
    mockLoadConfig.mockClear();
    const second = await loadFantomMetroConfig();

    expect(second).toBe(first);
    expect(mockLoadConfig.mock.calls).toEqual(firstCalls);
  });
});
