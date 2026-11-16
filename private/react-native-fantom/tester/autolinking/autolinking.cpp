/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "autolinking.h"

namespace facebook::react {

std::shared_ptr<TurboModule> autolinking_cxxModuleProvider(
    const std::string /*moduleName*/,
    const std::shared_ptr<CallInvoker>& /*jsInvoker*/) {
  return nullptr;
}

void autolinking_registerProviders(
    std::shared_ptr<const ComponentDescriptorProviderRegistry>
    /*providerRegistry*/) {}

} // namespace facebook::react
