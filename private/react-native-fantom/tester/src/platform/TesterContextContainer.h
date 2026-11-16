/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <react/utils/ContextContainer.h>
#include <memory>

namespace facebook::react {
class TesterContextContainer {
 public:
  static void didCreate(const std::shared_ptr<const ContextContainer> &contextContainer);
};
} // namespace facebook::react
