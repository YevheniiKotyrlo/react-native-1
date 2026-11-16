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
#include <memory>
#include <string>

namespace facebook::react {

// The linked code defines these two as autolinking generates them for an app's OnLoad.cpp.
std::shared_ptr<TurboModule> autolinking_cxxModuleProvider(
    const std::string moduleName,
    const std::shared_ptr<CallInvoker> &jsInvoker);

void autolinking_registerProviders(std::shared_ptr<const ComponentDescriptorProviderRegistry> providerRegistry);

} // namespace facebook::react
