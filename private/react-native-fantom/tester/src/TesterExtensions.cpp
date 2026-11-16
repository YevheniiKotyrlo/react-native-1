/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "TesterExtensions.h"

#include <utility>

namespace facebook::react {

namespace {

std::vector<ComponentDescriptorProvider>& componentDescriptorProviders() {
  static std::vector<ComponentDescriptorProvider> providers;
  return providers;
}

std::vector<TesterContextContainerSetup>& contextContainerSetups() {
  static std::vector<TesterContextContainerSetup> setups;
  return setups;
}

} // namespace

void registerTesterComponentDescriptorProvider(
    ComponentDescriptorProvider provider) {
  componentDescriptorProviders().push_back(std::move(provider));
}

const std::vector<ComponentDescriptorProvider>&
getTesterComponentDescriptorProviders() {
  return componentDescriptorProviders();
}

void registerTesterContextContainerSetup(TesterContextContainerSetup setup) {
  contextContainerSetups().push_back(std::move(setup));
}

void applyTesterContextContainerSetups(
    const ContextContainer& contextContainer) {
  for (const auto& setup : contextContainerSetups()) {
    setup(contextContainer);
  }
}

} // namespace facebook::react
