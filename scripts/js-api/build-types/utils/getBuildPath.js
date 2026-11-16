/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

const {REPO_ROOT} = require('../../../shared/consts');
const {TYPES_OUTPUT_DIR} = require('../../config');
const path = require('node:path');

/**
 * The directory of the workspace package a source file belongs to, such as
 * `packages/react-native` or `private/react-native-fantom`.
 */
function getPackageDir(file: string): string {
  const [workspaceDir, packageName] = path
    .relative(REPO_ROOT, file)
    .split(path.sep);
  return path.join(REPO_ROOT, workspaceDir, packageName);
}

/**
 * The path of the TypeScript declarations a source file translates to, in its
 * package's generated types.
 */
function getBuildPath(file: string): string {
  const packageDir = getPackageDir(file);

  return path.join(
    packageDir,
    TYPES_OUTPUT_DIR,
    path
      .relative(packageDir, file)
      .replace(/\.js\.flow$/, '.js')
      .replace(/\.js$/, '.d.ts'),
  );
}

module.exports = {getBuildPath, getPackageDir};
