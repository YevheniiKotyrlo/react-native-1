/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include <autolinking.h>

#include <jsi/jsi.h>
#include <react/http/IHttpClient.h>
#include <react/http/IWebSocketClient.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>
#include <react/renderer/core/propsConversions.h>
#include <react/renderer/debug/debugStringConvertibleUtils.h>
#include <react/renderer/runtimescheduler/RuntimeScheduler.h>
#include <react/renderer/textlayoutmanager/TextLayoutManager.h>
#include <react/threading/MessageQueueThreadImpl.h>

// What FantomAutolinking-itest.js reaches through the tester's calls.
namespace facebook::react {

extern const char FantomAutolinkingTestViewComponentName[] =
    "FantomAutolinkingTestView";

namespace {

constexpr auto kContextContainerRecordKey =
    "FantomAutolinkingTestContextContainerRecord";

std::string& contextContainerRecordTheViewRead() {
  static std::string record =
      "no FantomAutolinkingTestView descriptor read the container";
  return record;
}

bool& didRunTaskOnItsOwnQueue() {
  static bool didRun = false;
  return didRun;
}

std::shared_ptr<MessageQueueThread>& ownQueue() {
  static std::shared_ptr<MessageQueueThread> queue;
  return queue;
}

template <typename T>
std::string presenceOf(
    const ContextContainer& contextContainer,
    const char* key) {
  return std::string{key} +
      (contextContainer.find<T>(key).has_value() ? " present" : " absent");
}

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

class FantomAutolinkingTestViewComponentDescriptor
    : public ConcreteComponentDescriptor<FantomAutolinkingTestViewShadowNode> {
 public:
  explicit FantomAutolinkingTestViewComponentDescriptor(
      const ComponentDescriptorParameters& parameters)
      : ConcreteComponentDescriptor(parameters) {
    contextContainerRecordTheViewRead() =
        contextContainer_->find<std::string>(kContextContainerRecordKey)
            .value_or("the container the view read holds no record");
  }
};

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
    methodMap_["getContextContainerRecord"] = MethodMetadata{
        .argCount = 0,
        .invoker = [](jsi::Runtime& runtime,
                      TurboModule& /*turboModule*/,
                      const jsi::Value* /*arguments*/,
                      size_t /*count*/) -> jsi::Value {
          return jsi::String::createFromUtf8(
              runtime, contextContainerRecordTheViewRead());
        }};
    methodMap_["didRunTaskOnItsOwnQueue"] = MethodMetadata{
        .argCount = 0,
        .invoker = [](jsi::Runtime& /*runtime*/,
                      TurboModule& /*turboModule*/,
                      const jsi::Value* /*arguments*/,
                      size_t /*count*/) -> jsi::Value {
          return jsi::Value(didRunTaskOnItsOwnQueue());
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

void fantom_didCreateContextContainer(
    const std::shared_ptr<const ContextContainer>& contextContainer) {
  const auto& container = *contextContainer;
  contextContainer->insert(
      kContextContainerRecordKey,
      presenceOf<MessageQueueThreadFactory>(
          container, MessageQueueThreadFactoryKey) +
          ", " +
          presenceOf<HttpClientFactory>(container, HttpClientFactoryKey) +
          ", " +
          presenceOf<WebSocketClientFactory>(
              container, WebSocketClientFactoryKey) +
          ", " +
          presenceOf<HttpClientFactory>(
              container, DevToolsHttpClientFactoryKey) +
          ", " +
          presenceOf<WebSocketClientFactory>(
              container, DevToolsWebSocketClientFactoryKey) +
          ", " +
          presenceOf<std::shared_ptr<TextLayoutManager>>(
              container, "TextLayoutManager") +
          ", " +
          presenceOf<std::weak_ptr<RuntimeScheduler>>(
              container, RuntimeSchedulerKey));
  if (auto makeQueue = container.find<MessageQueueThreadFactory>(
          MessageQueueThreadFactoryKey)) {
    ownQueue() = (*makeQueue)();
    ownQueue()->runOnQueue([]() { didRunTaskOnItsOwnQueue() = true; });
  }
}

} // namespace facebook::react
