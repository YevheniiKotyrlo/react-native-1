/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import {CPP_TRACES_OUTPUT_PATH, buildCppTracesOutputPath} from '../paths';
import path from 'node:path';

const STARTED_AT = new Date('2026-11-16T12:30:00.000Z');

describe('buildCppTracesOutputPath', () => {
  it("names a recording made outside a test after the tester and the time it started, in its profiler's format", () => {
    expect(buildCppTracesOutputPath(null, 'perf', STARTED_AT)).toBe(
      path.join(
        CPP_TRACES_OUTPUT_PATH,
        'fantom-tester-2026-11-16T12:30:00.000Z.perf.data',
      ),
    );
    expect(buildCppTracesOutputPath(null, 'callgrind', STARTED_AT)).toBe(
      path.join(
        CPP_TRACES_OUTPUT_PATH,
        'fantom-tester-2026-11-16T12:30:00.000Z.callgrind.out',
      ),
    );
  });

  it('gives the same name for the same start', () => {
    expect(buildCppTracesOutputPath(null, 'callgrind', STARTED_AT)).toBe(
      buildCppTracesOutputPath(null, 'callgrind', new Date(STARTED_AT)),
    );
  });
});
