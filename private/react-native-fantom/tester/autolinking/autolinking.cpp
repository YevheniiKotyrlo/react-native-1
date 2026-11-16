/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include <autolinking.h>

#include <jsi/jsi.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>
#include <react/renderer/core/propsConversions.h>
#include <react/renderer/debug/debugStringConvertibleUtils.h>

// What FantomAutolinking-itest.js reaches through the tester's calls.
namespace facebook::react {

extern const char FantomAutolinkingTestViewComponentName[] =
    "FantomAutolinkingTestView";

namespace {

class FantomAutolinkingTestViewProps final : public ViewProps {
 public:
  FantomAutolinkingTestViewProps() = default;

  FantomAutolinkingTestViewProps(
      const PropsParserContext& context,
      const FantomAutolinkingTestViewProps& sourceProps,
      const RawProps& rawProps)
      : ViewProps(context, sourceProps, rawProps),
        label(convertRawProp(
            context,
            rawProps,
            "label",
            sourceProps.label,
            std::string{})) {}

  std::string label{};

#if RN_DEBUG_STRING_CONVERTIBLE
  SharedDebugStringConvertibleList getDebugProps() const override {
    return ViewProps::getDebugProps() +
        SharedDebugStringConvertibleList{
            debugStringConvertibleItem("label", label)};
  }
#endif
};

using FantomAutolinkingTestViewShadowNode = ConcreteViewShadowNode<
    FantomAutolinkingTestViewComponentName,
    FantomAutolinkingTestViewProps>;

using FantomAutolinkingTestViewComponentDescriptor =
    ConcreteComponentDescriptor<FantomAutolinkingTestViewShadowNode>;

class FantomAutolinkingTestModule : public TurboModule {
 public:
  explicit FantomAutolinkingTestModule(std::shared_ptr<CallInvoker> jsInvoker)
      : TurboModule("FantomAutolinkingTest", std::move(jsInvoker)) {
    methodMap_["getValue"] = MethodMetadata{
        .argCount = 0,
        .invoker = [](jsi::Runtime& runtime,
                      TurboModule& /*turboModule*/,
                      const jsi::Value* /*arguments*/,
                      size_t /*count*/) -> jsi::Value {
          return jsi::String::createFromAscii(runtime, "autolinked");
        }};
  }
};

} // namespace

std::shared_ptr<TurboModule> autolinking_cxxModuleProvider(
    const std::string moduleName,
    const std::shared_ptr<CallInvoker>& jsInvoker) {
  if (moduleName == "FantomAutolinkingTest") {
    return std::make_shared<FantomAutolinkingTestModule>(jsInvoker);
  }
  return nullptr;
}

void autolinking_registerProviders(
    std::shared_ptr<const ComponentDescriptorProviderRegistry>
        providerRegistry) {
  providerRegistry->add(
      concreteComponentDescriptorProvider<
          FantomAutolinkingTestViewComponentDescriptor>());
}

} // namespace facebook::react
