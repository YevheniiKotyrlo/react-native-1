/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <react/renderer/componentregistry/ComponentDescriptorProvider.h>
#include <react/utils/ContextContainer.h>
#include <functional>
#include <vector>

namespace facebook::react {

/*
 * What native code linked into the tester through FANTOM_EXTENSION_DIRECTORY
 * registers while the tester loads, before `main` runs.
 */

/*
 * Added to the tester's component registry ahead of its own components, so a
 * provider for a component the tester registers takes its place.
 */
void registerTesterComponentDescriptorProvider(ComponentDescriptorProvider provider);

const std::vector<ComponentDescriptorProvider> &getTesterComponentDescriptorProviders();

using TesterContextContainerSetup = std::function<void(const ContextContainer &contextContainer)>;

/*
 * Runs on each tester's ContextContainer after the tester inserts its own
 * entries and before React Native starts. A key keeps its first entry, so a
 * setup cannot replace the tester's entries but can provide one the tester
 * inserts later, such as "TextLayoutManager".
 */
void registerTesterContextContainerSetup(TesterContextContainerSetup setup);

void applyTesterContextContainerSetups(const ContextContainer &contextContainer);

} // namespace facebook::react
