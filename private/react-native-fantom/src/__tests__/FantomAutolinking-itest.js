/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import '@react-native/fantom/src/setUpDefaultReactNativeEnvironment';

import type {TurboModule} from 'react-native/Libraries/TurboModule/RCTExport';

import * as Fantom from '@react-native/fantom';
import * as React from 'react';
import {TurboModuleRegistry} from 'react-native';
import * as NativeComponentRegistry from 'react-native/Libraries/NativeComponent/NativeComponentRegistry';

interface FantomAutolinkingTestSpec extends TurboModule {
  +getValue: () => string;
  +getContextContainerRecord: () => string;
  +didRunTaskOnItsOwnQueue: () => boolean;
}

function getTestModule(): ?FantomAutolinkingTestSpec {
  return TurboModuleRegistry.get<FantomAutolinkingTestSpec>(
    'FantomAutolinkingTest',
  );
}

const FantomAutolinkingTestView = NativeComponentRegistry.get<{
  label: string,
}>('FantomAutolinkingTestView', () => ({
  uiViewClassName: 'FantomAutolinkingTestView',
  validAttributes: {label: true},
}));

// Only the open-source tester calls the autolinking functions.
const describeInOSS = Fantom.getConstants().isOSS ? describe : describe.skip;

describeInOSS("the tester's own autolinking functions", () => {
  it('provide a C++ TurboModule', () => {
    expect(getTestModule()?.getValue()).toBe('autolinked');
  });

  it('register a component that renders with its props', () => {
    const root = Fantom.createRoot();

    Fantom.runTask(() => {
      root.render(<FantomAutolinkingTestView label="autolinked" />);
    });

    expect(root.getRenderedOutput({props: ['label']}).toJSX()).toEqual(
      <rn-fantomAutolinkingTestView label="autolinked" />,
    );
  });

  it("receive the ContextContainer with the tester's message queue and network client factories, before its TextLayoutManager and the RuntimeScheduler", () => {
    expect(getTestModule()?.getContextContainerRecord()).toBe(
      [
        'MessageQueueThreadFactoryKey present',
        'HttpClientFactory present',
        'WebSocketClientFactory present',
        'DevToolsHttpClientFactory present',
        'DevToolsWebSocketClientFactory present',
        'TextLayoutManager absent',
        'RuntimeScheduler absent',
      ].join(', '),
    );
  });

  it("run a task on a queue made with the tester's message queue factory", () => {
    Fantom.runTask(() => {});

    expect(getTestModule()?.didRunTaskOnItsOwnQueue()).toBe(true);
  });
});
