# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

# React Native's autolinking functions when no library is linked.
add_library(fantom_autolinking OBJECT autolinking.cpp)

target_include_directories(fantom_autolinking PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})

target_link_libraries(fantom_autolinking
  PUBLIC
    react_nativemodule_core
    react_renderer_componentregistry
    react_utils)

target_compile_options(fantom_autolinking
  PRIVATE
    -Wall
    -Werror
    -fexceptions
    -frtti
    -std=c++20)
