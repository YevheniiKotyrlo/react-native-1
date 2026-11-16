/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/TurboModule.h>
#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>
#include <react/utils/ContextContainer.h>
#include <memory>
#include <string>

namespace facebook::react {

std::shared_ptr<TurboModule> autolinking_cxxModuleProvider(
    const std::string moduleName,
    const std::shared_ptr<CallInvoker> &jsInvoker);

void autolinking_registerProviders(std::shared_ptr<const ComponentDescriptorProviderRegistry> providerRegistry);

// Receives the tester's ContextContainer before the tester inserts its own
// entries, as RCTInstance hands its container to didCreateContextContainer:.
void fantom_didCreateContextContainer(const std::shared_ptr<const ContextContainer> &contextContainer);

} // namespace facebook::react
