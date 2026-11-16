/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 * @format
 */

export default function setFantomEnvironmentVariables(
  variables: Readonly<{[variable: string]: string}>,
): void {
  for (const variable of Object.keys(process.env)) {
    if (variable.startsWith('FANTOM_')) {
      delete process.env[variable];
    }
  }
  for (const [variable, value] of Object.entries(variables)) {
    process.env[variable] = value;
  }
}
