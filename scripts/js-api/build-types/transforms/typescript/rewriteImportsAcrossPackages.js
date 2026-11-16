/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import type {PluginObj} from '@babel/core';
import type {StringLiteral} from '@babel/types';

const {PACKAGES_DIR, PRIVATE_DIR} = require('../../../../shared/consts');
const {getBuildPath, getPackageDir} = require('../../utils/getBuildPath');
const path = require('node:path');

function isInWorkspacePackage(file: string): boolean {
  return [PACKAGES_DIR, PRIVATE_DIR].some(workspaceDir =>
    file.startsWith(workspaceDir + path.sep),
  );
}

/**
 * A relative import that leaves its package resolves from the package's
 * sources but not from its generated types: point it at the imported file's
 * generated declarations instead.
 */
function createImportsAcrossPackagesRewriter(
  filePath: string,
): PluginObj<unknown> {
  const packageDir = getPackageDir(filePath);
  const buildDir = path.dirname(getBuildPath(filePath));

  function rewrite(source: StringLiteral): void {
    if (!source.value.startsWith('.')) {
      return;
    }
    const target = path.resolve(path.dirname(filePath), source.value);
    if (
      target === packageDir ||
      target.startsWith(packageDir + path.sep) ||
      !isInWorkspacePackage(target)
    ) {
      return;
    }
    const targetBuildPath = getBuildPath(target + '.js').replace(
      /\.d\.ts$/,
      '',
    );
    source.value = path
      .relative(buildDir, targetBuildPath)
      .split(path.sep)
      .join('/');
  }

  return {
    visitor: {
      ImportDeclaration(nodePath) {
        rewrite(nodePath.node.source);
      },
      ExportNamedDeclaration(nodePath) {
        if (nodePath.node.source != null) {
          rewrite(nodePath.node.source);
        }
      },
      ExportAllDeclaration(nodePath) {
        rewrite(nodePath.node.source);
      },
      TSImportType(nodePath) {
        rewrite(nodePath.node.argument);
      },
    },
  };
}

module.exports = createImportsAcrossPackagesRewriter;
