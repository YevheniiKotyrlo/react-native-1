/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

const CI_VARIABLES: ReadonlySet<string> = new Set([
  'GITHUB_ACTIONS',
  'SANDCASTLE',
]);

const savedEnvironment = process.env;

// The runner's modules read the environment when they load, so a test requires them after this.
export function replaceFantomEnvironment(
  fantomVariables: Readonly<{[variable: string]: string}>,
): void {
  const environment: {[variable: string]: string | void} = {};
  for (const key of Object.keys(savedEnvironment)) {
    if (!key.startsWith('FANTOM_') && !CI_VARIABLES.has(key)) {
      environment[key] = savedEnvironment[key];
    }
  }
  process.env = {...environment, ...fantomVariables};
  jest.resetModules();
}

export function restoreEnvironment(): void {
  process.env = savedEnvironment;
}
