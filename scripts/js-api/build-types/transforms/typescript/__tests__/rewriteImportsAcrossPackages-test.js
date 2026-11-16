/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

const {REPO_ROOT} = require('../../../../../shared/consts');
const createImportsAcrossPackagesRewriter = require('../rewriteImportsAcrossPackages');
const babel = require('@babel/core');
const path = require('node:path');

const FANTOM_MODULE = path.join(
  REPO_ROOT,
  'private',
  'react-native-fantom',
  'src',
  'index.js',
);

async function rewrite(code: string, filePath: string): Promise<?string> {
  const result = await babel.transformAsync(code, {
    babelrc: false,
    configFile: false,
    filename: 'module.d.ts',
    plugins: [
      ['@babel/plugin-syntax-typescript', {dts: true}],
      createImportsAcrossPackagesRewriter(filePath),
    ],
  });
  return result?.code;
}

describe('rewriteImportsAcrossPackages', () => {
  test('points an import of another package at its generated declarations', async () => {
    expect(
      await rewrite(
        `import {NativeEventCategory} from '../../../packages/react-native/src/private/testing/fantom/specs/NativeFantom';`,
        FANTOM_MODULE,
      ),
    ).toBe(
      `import { NativeEventCategory } from "../../../../packages/react-native/types_generated/src/private/testing/fantom/specs/NativeFantom";`,
    );
  });

  test('points re-exports and import types at the generated declarations', async () => {
    expect(
      await rewrite(
        [
          `export {Node} from '../../../packages/react-native/Libraries/Node';`,
          `export * from '../../../packages/react-native/Libraries/All';`,
          `type Query = import('../../../packages/react-native/Libraries/Query').Query;`,
        ].join('\n'),
        FANTOM_MODULE,
      ),
    ).toBe(
      [
        `export { Node } from "../../../../packages/react-native/types_generated/Libraries/Node";`,
        `export * from "../../../../packages/react-native/types_generated/Libraries/All";`,
        `type Query = import("../../../../packages/react-native/types_generated/Libraries/Query").Query;`,
      ].join('\n'),
    );
  });

  test('leaves imports within the package, of package names, and of files outside every package', async () => {
    const code = [
      `import {getConstants} from './Constants';`,
      `import type {RootTag} from 'react-native';`,
      `import {template} from '../../../scripts/template';`,
    ].join('\n');

    expect(await rewrite(code, FANTOM_MODULE)).toBe(
      [
        `import { getConstants } from './Constants';`,
        `import type { RootTag } from 'react-native';`,
        `import { template } from '../../../scripts/template';`,
      ].join('\n'),
    );
  });

  test('leaves an import written in a comment', async () => {
    const code = `/** Example: import {X} from '../../../packages/react-native/Libraries/X'; */\nexport {};`;

    expect(await rewrite(code, FANTOM_MODULE)).toBe(code);
  });
});
