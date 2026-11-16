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
import {PROJECT_ROOT} from './paths';
import * as Metro from 'metro';
import {mergeConfig} from 'metro-config';
import path from 'node:path';

/**
 * Loads the Metro config Fantom bundles tests with, served on `port`. Fantom
 * writes each test's entrypoint below the repository's root and requests its
 * bundle by its path from there, so the config keeps that root as its
 * `projectRoot` and serves files from it.
 */
export default async function loadMetroConfig(port: number): Promise<ConfigT> {
  const config = await Metro.loadConfig({config: metroConfigPath});
  const projectRoot = path.resolve(config.projectRoot);
  if (projectRoot !== PROJECT_ROOT) {
    throw new Error(
      `The Metro config ${metroConfigPath} sets projectRoot to ${projectRoot}, but Fantom bundles its tests from ${PROJECT_ROOT}. Keep Fantom's projectRoot in it.`,
    );
  }
  const serverRoot = config.server.unstable_serverRoot;
  if (serverRoot != null && path.resolve(serverRoot) !== PROJECT_ROOT) {
    throw new Error(
      `The Metro config ${metroConfigPath} sets server.unstable_serverRoot to ${serverRoot}, but Fantom requests bundles relative to ${PROJECT_ROOT}. Leave it unset.`,
    );
  }
  return mergeConfig(config, {server: {port}});
}
