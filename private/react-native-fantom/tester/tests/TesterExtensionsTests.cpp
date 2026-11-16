/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include <gtest/gtest.h>
#include <react/fantom/TesterExtensions.h>
#include <react/renderer/componentregistry/ComponentDescriptorProvider.h>
#include <react/renderer/components/root/RootComponentDescriptor.h>
#include <react/renderer/components/view/ViewComponentDescriptor.h>
#include <react/utils/ContextContainer.h>
#include <memory>
#include <string>

namespace facebook::react {

TEST(
    TesterExtensionsTest,
    ReturnsComponentDescriptorProvidersInRegistrationOrder) {
  const auto previouslyRegistered =
      getTesterComponentDescriptorProviders().size();

  registerTesterComponentDescriptorProvider(
      concreteComponentDescriptorProvider<ViewComponentDescriptor>());
  registerTesterComponentDescriptorProvider(
      concreteComponentDescriptorProvider<RootComponentDescriptor>());

  const auto& providers = getTesterComponentDescriptorProviders();
  ASSERT_EQ(providers.size(), previouslyRegistered + 2);
  EXPECT_STREQ(providers[previouslyRegistered].name, "View");
  EXPECT_STREQ(providers[previouslyRegistered + 1].name, "RootView");
}

TEST(TesterExtensionsTest, RunsContextContainerSetupsInRegistrationOrder) {
  registerTesterContextContainerSetup(
      [](const ContextContainer& contextContainer) {
        contextContainer.insert(
            "TesterExtensionsTest.Setup", std::string{"first setup"});
      });
  registerTesterContextContainerSetup(
      [](const ContextContainer& contextContainer) {
        contextContainer.insert(
            "TesterExtensionsTest.Setup", std::string{"second setup"});
      });
  const ContextContainer contextContainer;

  applyTesterContextContainerSetups(contextContainer);

  EXPECT_EQ(
      contextContainer.at<std::string>("TesterExtensionsTest.Setup"),
      "first setup");
}

TEST(TesterExtensionsTest, KeepsAnEntryTheTesterInsertedBeforeTheSetups) {
  registerTesterContextContainerSetup(
      [](const ContextContainer& contextContainer) {
        contextContainer.insert(
            "TesterExtensionsTest.TesterEntry", std::string{"setup"});
      });
  const ContextContainer contextContainer;
  contextContainer.insert(
      "TesterExtensionsTest.TesterEntry", std::string{"tester"});

  applyTesterContextContainerSetups(contextContainer);

  EXPECT_EQ(
      contextContainer.at<std::string>("TesterExtensionsTest.TesterEntry"),
      "tester");
}

TEST(TesterExtensionsTest, GivesEveryContextContainerTheSameEntries) {
  auto setupRuns = std::make_shared<int>(0);
  registerTesterContextContainerSetup(
      [setupRuns](const ContextContainer& contextContainer) {
        *setupRuns += 1;
        contextContainer.insert(
            "TesterExtensionsTest.EveryContainer", std::string{"setup"});
      });
  const ContextContainer firstContextContainer;
  const ContextContainer secondContextContainer;

  applyTesterContextContainerSetups(firstContextContainer);
  applyTesterContextContainerSetups(secondContextContainer);

  EXPECT_EQ(*setupRuns, 2);
  EXPECT_EQ(
      firstContextContainer.at<std::string>(
          "TesterExtensionsTest.EveryContainer"),
      "setup");
  EXPECT_EQ(
      secondContextContainer.at<std::string>(
          "TesterExtensionsTest.EveryContainer"),
      "setup");
}

} // namespace facebook::react
