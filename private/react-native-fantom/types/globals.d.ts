/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {testGlobals} from '../types_generated/runtime/setup';

declare global {
  var afterAll: typeof testGlobals.afterAll;
  var afterEach: typeof testGlobals.afterEach;
  var beforeAll: typeof testGlobals.beforeAll;
  var beforeEach: typeof testGlobals.beforeEach;
  var describe: typeof testGlobals.describe;
  var fdescribe: typeof testGlobals.fdescribe;
  var xdescribe: typeof testGlobals.xdescribe;
  var it: typeof testGlobals.it;
  var fit: typeof testGlobals.fit;
  var xit: typeof testGlobals.xit;
  var test: typeof testGlobals.test;
  var xtest: typeof testGlobals.xtest;
  var jest: typeof testGlobals.jest;
  var expect: typeof testGlobals.expect;
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      // The host elements of Fantom's rendered output, such as `rn-view`.
      [element: `rn-${string}`]: Readonly<{[prop: string]: unknown}>;
    }
  }
}
