/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/CxxTurboModuleUtils.h>
#include <gtest/gtest.h>
#include <react/coremodules/AppStateModule.h>
#include <react/nativemodule/microtasks/NativeMicrotasks.h>
#include <react/runtime/ReactCxxTurboModuleProvider.h>
#include <functional>
#include <memory>
#include <optional>
#include <string>
#include <utility>
#include <vector>

namespace facebook::react {

namespace {

class UnusedCallInvoker : public CallInvoker {
 public:
  using CallInvoker::invokeAsync;
  using CallInvoker::invokeSync;

  void invokeAsync(CallFunc&& /*func*/) noexcept override {}

  void invokeSync(CallFunc&& /*func*/) override {}
};

using GlobalModuleFactory = std::function<std::shared_ptr<TurboModule>(
    std::shared_ptr<CallInvoker> jsInvoker)>;

} // namespace

class ReactCxxTurboModuleProviderTests : public testing::Test {
 protected:
  void TearDown() override {
    auto& globalModuleMap = globalExportedCxxTurboModuleMap();
    for (auto replaced = replacedGlobalModuleFactories_.rbegin();
         replaced != replacedGlobalModuleFactories_.rend();
         ++replaced) {
      auto& [name, factory] = *replaced;
      if (factory.has_value()) {
        globalModuleMap[name] = std::move(*factory);
      } else {
        globalModuleMap.erase(name);
      }
    }
  }

  void registerInGlobalModuleMap(
      const std::string& name,
      GlobalModuleFactory factory) {
    const auto& globalModuleMap = globalExportedCxxTurboModuleMap();
    std::optional<GlobalModuleFactory> replacedFactory;
    if (auto replaced = globalModuleMap.find(name);
        replaced != globalModuleMap.end()) {
      replacedFactory = replaced->second;
    }
    replacedGlobalModuleFactories_.emplace_back(
        name, std::move(replacedFactory));
    registerCxxModuleToGlobalModuleMap(name, std::move(factory));
  }

  ReactCxxTurboModuleProvider makeProvider(
      TurboModuleProviders turboModuleProviders) const {
    return {std::move(turboModuleProviders), jsInvoker_, nullptr};
  }

  const std::shared_ptr<CallInvoker> jsInvoker_ =
      std::make_shared<UnusedCallInvoker>();

 private:
  std::vector<std::pair<std::string, std::optional<GlobalModuleFactory>>>
      replacedGlobalModuleFactories_;
};

TEST_F(
    ReactCxxTurboModuleProviderTests,
    answersAModuleRegisteredInTheGlobalModuleMap) {
  auto provider = makeProvider({});
  auto registeredModule =
      std::make_shared<TurboModule>("GlobalMapCxxModule", nullptr);
  auto receivedJsInvoker = std::make_shared<std::shared_ptr<CallInvoker>>();
  registerInGlobalModuleMap(
      "GlobalMapCxxModule",
      [registeredModule,
       receivedJsInvoker](std::shared_ptr<CallInvoker> jsInvoker)
          -> std::shared_ptr<TurboModule> {
        *receivedJsInvoker = std::move(jsInvoker);
        return registeredModule;
      });

  EXPECT_EQ(provider("GlobalMapCxxModule"), registeredModule);
  EXPECT_EQ(*receivedJsInvoker, jsInvoker_);
}

TEST_F(
    ReactCxxTurboModuleProviderTests,
    asksTheHostsProvidersBeforeTheGlobalModuleMap) {
  registerInGlobalModuleMap(
      "HostAndGlobalMapCxxModule",
      [](std::shared_ptr<CallInvoker> jsInvoker)
          -> std::shared_ptr<TurboModule> {
        return std::make_shared<TurboModule>(
            "HostAndGlobalMapCxxModule", std::move(jsInvoker));
      });
  auto hostModule =
      std::make_shared<TurboModule>("HostAndGlobalMapCxxModule", nullptr);
  auto provider = makeProvider(
      {[hostModule](
           const std::string& name,
           const std::shared_ptr<CallInvoker>& /*jsInvoker*/)
           -> std::shared_ptr<TurboModule> {
        return name == "HostAndGlobalMapCxxModule" ? hostModule : nullptr;
      }});

  EXPECT_EQ(provider("HostAndGlobalMapCxxModule"), hostModule);
}

TEST_F(
    ReactCxxTurboModuleProviderTests,
    asksThePlatformsModulesBeforeTheGlobalModuleMap) {
  const std::string name{AppStateModule::kModuleName};
  registerInGlobalModuleMap(
      name,
      [name](std::shared_ptr<CallInvoker> jsInvoker)
          -> std::shared_ptr<TurboModule> {
        return std::make_shared<TurboModule>(name, std::move(jsInvoker));
      });

  EXPECT_NE(
      std::dynamic_pointer_cast<AppStateModule>(makeProvider({})(name)),
      nullptr);
}

TEST_F(
    ReactCxxTurboModuleProviderTests,
    asksDefaultTurboModulesBeforeTheGlobalModuleMap) {
  const std::string name{NativeMicrotasks::kModuleName};
  registerInGlobalModuleMap(
      name,
      [name](std::shared_ptr<CallInvoker> jsInvoker)
          -> std::shared_ptr<TurboModule> {
        return std::make_shared<TurboModule>(name, std::move(jsInvoker));
      });

  EXPECT_NE(
      std::dynamic_pointer_cast<NativeMicrotasks>(makeProvider({})(name)),
      nullptr);
}

TEST_F(
    ReactCxxTurboModuleProviderTests,
    answersNullptrForANameNothingRegisters) {
  EXPECT_EQ(makeProvider({})("UnregisteredCxxModule"), nullptr);
}

} // namespace facebook::react
