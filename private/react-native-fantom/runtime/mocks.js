/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

export const MOCK_FN_TAG: symbol = Symbol('mock function');

export type MockFunctionResult<TReturn> =
  | Readonly<{isThrow: false, value: TReturn}>
  | Readonly<{isThrow: true, value: unknown}>;

export type MockFunctionState<TArgs extends Array<unknown>, TReturn> = {
  readonly calls: Array<TArgs>,
  lastCall?: TArgs,
  readonly instances: Array<unknown>,
  readonly contexts: Array<unknown>,
  readonly results: Array<MockFunctionResult<TReturn>>,
};

export type MockFunction<TArgs extends Array<unknown>, TReturn> = {
  (...args: TArgs): TReturn,
  readonly mock: MockFunctionState<TArgs, TReturn>,
  ...
};

// The type is defined this way because if we get a mixed value, we return
// a generic mock function, and if we get a typed function, we get a typed mock.
export const ensureMockFunction: (<TArgs extends Array<unknown>, TReturn>(
  fn: (...rest: TArgs) => TReturn,
) => MockFunction<TArgs, TReturn>) &
  ((fn: unknown) => MockFunction<Array<unknown>, unknown>) = fn => {
  // $FlowExpectedError[invalid-computed-prop]
  // $FlowExpectedError[incompatible-use]
  if (typeof fn !== 'function' || !fn[MOCK_FN_TAG]) {
    throw new Error(
      `Expected ${String(fn)} to be a mock function, but it wasn't`,
    );
  }

  // $FlowExpectedError[incompatible-type]
  // $FlowExpectedError[prop-missing]
  return fn;
};

declare export function createMockFunction(): MockFunction<
  Array<unknown>,
  void,
>;
declare export function createMockFunction<
  TArgs extends Array<unknown>,
  TReturn,
>(
  implementation: (...rest: TArgs) => TReturn,
): MockFunction<TArgs, TReturn>;
export function createMockFunction<TArgs extends Array<unknown>, TReturn>(
  implementation?: (...rest: TArgs) => TReturn,
): MockFunction<TArgs, TReturn | void> {
  const mock: MockFunctionState<TArgs, TReturn | void> = {
    calls: [],
    lastCall: undefined,
    instances: [],
    contexts: [],
    results: [],
  };

  function mockFunction(this: unknown, ...args: TArgs): TReturn | void {
    mock.calls.push(args);
    mock.lastCall = args;
    mock.instances.push(new.target ? this : undefined);
    mock.contexts.push(this);

    if (implementation == null) {
      mock.results.push({isThrow: false, value: undefined});
      return undefined;
    }

    try {
      const value = implementation.apply(this, args);
      mock.results.push({isThrow: false, value});
      return value;
    } catch (error) {
      mock.results.push({isThrow: true, value: error});
      throw error;
    }
  }

  mockFunction.mock = mock;
  // $FlowExpectedError[invalid-computed-prop]
  mockFunction[MOCK_FN_TAG] = true;

  return mockFunction;
}
