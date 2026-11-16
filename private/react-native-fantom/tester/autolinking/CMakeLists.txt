# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

cmake_minimum_required(VERSION 3.13)
set(CMAKE_VERBOSE_MAKEFILE on)

# The tester's autolinking functions when no library is linked.
add_library(fantom_autolinking OBJECT autolinking.cpp)

target_link_libraries(fantom_autolinking
  PUBLIC
    fantom_autolinking_api
  PRIVATE
    jsi
    react_renderer_core
    rrc_view)

target_compile_options(fantom_autolinking
  PRIVATE
    -Wall
    -Werror
    -fexceptions
    -frtti
    -std=c++20)
