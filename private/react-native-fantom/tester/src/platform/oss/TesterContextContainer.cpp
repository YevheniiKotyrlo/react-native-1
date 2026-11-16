/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "../TesterContextContainer.h"

#include <autolinking.h>

namespace facebook::react {
/* static */ void TesterContextContainer::didCreate(
    const std::shared_ptr<const ContextContainer>& contextContainer) {
  fantom_didCreateContextContainer(contextContainer);
}
} // namespace facebook::react
