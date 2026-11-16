/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {testGlobals} from '../types_generated/runtime/setup';

import * as Fantom from '@react-native/fantom';
import * as React from 'react';
import {Text, View} from 'react-native';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

type IsAny<T> = 0 extends 1 & T ? true : false;

function assertType<Assertion extends true>(): void {}

type TestGlobals = typeof testGlobals;

// Every global Fantom's runtime installs is declared, with its runtime type.
assertType<
  Equal<{[Name in keyof TestGlobals]: (typeof globalThis)[Name]}, TestGlobals>
>();

// A declaration typed `any` would pass everything below.
assertType<Equal<IsAny<typeof Fantom>, false>>();
assertType<Equal<IsAny<typeof Fantom.createRoot>, false>>();
assertType<Equal<IsAny<typeof Fantom.dispatchNativeEvent>, false>>();
assertType<Equal<IsAny<Fantom.Root['document']>, false>>();
assertType<Equal<IsAny<ReturnType<Fantom.Root['getRenderedOutput']>>, false>>();
assertType<Equal<IsAny<ReturnType<typeof Fantom.getConstants>>, false>>();
assertType<Equal<IsAny<typeof Fantom.NativeEventCategory>, false>>();
assertType<Equal<IsAny<Fantom.BenchmarkTestOptions>, false>>();
assertType<Equal<IsAny<Fantom.Screenshot>, false>>();
assertType<Equal<IsAny<ReturnType<typeof expect>>, false>>();
assertType<Equal<IsAny<ReturnType<typeof jest.fn>>, false>>();
assertType<Equal<IsAny<typeof describe.only>, false>>();
assertType<Equal<IsAny<typeof beforeEach>, false>>();

assertType<
  Equal<
    Parameters<typeof describe>,
    [title: string, implementation: () => unknown]
  >
>();
assertType<
  Equal<Parameters<typeof beforeEach>, [implementation: () => void]>
>();
assertType<Equal<ReturnType<typeof Fantom.createRoot>, Fantom.Root>>();

const typed = jest.fn((value: number) => value * 2);
assertType<Equal<ReturnType<typeof typed>, number>>();
assertType<Equal<typeof typed.mock.lastCall, [value: number] | undefined>>();
const untyped = jest.fn();
assertType<Equal<ReturnType<typeof untyped>, void>>();

describe('Fantom', () => {
  let root: Fantom.Root;

  beforeEach(() => {
    root = Fantom.createRoot({viewportWidth: 200, viewportHeight: 100});
  });

  afterEach(() => {
    root.destroy();
  });

  it('renders and asserts with the matchers Fantom implements', () => {
    const viewRef = React.createRef<React.ComponentRef<typeof View>>();

    Fantom.runTask(() => {
      root.render(
        <View ref={viewRef}>
          <Text>Hello</Text>
        </View>,
      );
    });

    expect(root.getRenderedOutput({props: []}).toJSX()).toEqual(
      <rn-view>
        <rn-paragraph>Hello</rn-paragraph>
      </rn-view>,
    );
    expect(root.document.documentElement.firstElementChild).not.toBe(null);
    Fantom.dispatchNativeEvent(viewRef, 'focus');
    Fantom.dispatchNativeEvent({current: null}, 'blur');
    expect(globalThis.describe).toBe(describe);
    expect(1).not.toBeGreaterThan(2);
    expect(new Error('failed')).toBeInstanceOf(Error);
    expect(() => {
      throw new Error('failed');
    }).toThrow('failed');

    const callback = jest.fn();
    callback();
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.results[0]).toEqual({
      isThrow: false,
      value: undefined,
    });
  });
});
