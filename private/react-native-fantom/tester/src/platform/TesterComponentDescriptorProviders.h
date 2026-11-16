/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>
#include <memory>

namespace facebook::react {
class TesterComponentDescriptorProviders {
 public:
  static void registerProviders(const std::shared_ptr<const ComponentDescriptorProviderRegistry> &providerRegistry);
};
} // namespace facebook::react
