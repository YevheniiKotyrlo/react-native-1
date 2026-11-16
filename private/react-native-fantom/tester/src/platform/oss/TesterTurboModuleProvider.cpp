/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "../TesterTurboModuleProvider.h"

#include <autolinking.h>

namespace facebook::react {
/* static */ TurboModuleProvider
TesterTurboModuleProvider::getTurboModuleProvider() {
  return TurboModuleProvider{&autolinking_cxxModuleProvider};
}
} // namespace facebook::react
