/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import type {ConfigT} from 'metro-config';

import {metroConfigPath} from './EnvironmentOptions';
import * as Metro from 'metro';
import path from 'node:path';

const FANTOM_METRO_CONFIG_PATH = path.resolve(
  __dirname,
  '..',
  'config',
  'metro.config.js',
);

export default async function loadFantomMetroConfig(): Promise<ConfigT> {
  const fantomConfig = await Metro.loadConfig({
    config: FANTOM_METRO_CONFIG_PATH,
  });

  if (metroConfigPath == null) {
    return fantomConfig;
  }

  return Metro.loadConfig({config: metroConfigPath}, fantomConfig);
}
