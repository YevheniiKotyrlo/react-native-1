/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.fabric.mounting

import com.facebook.react.common.SystemClock
import com.facebook.react.fabric.mounting.mountitems.MountItem
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlagsForTests
import com.facebook.testutils.shadows.ShadowNativeLoader
import com.facebook.testutils.shadows.ShadowPerformanceTracer
import com.facebook.testutils.shadows.ShadowSoLoader
import org.assertj.core.api.Assertions.assertThat
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.MockedStatic
import org.mockito.Mockito.mockStatic
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(
    shadows = [ShadowSoLoader::class, ShadowNativeLoader::class, ShadowPerformanceTracer::class]
)
class MountItemDispatcherTest {
  private lateinit var systemClock: MockedStatic<SystemClock>
  private lateinit var dispatcher: MountItemDispatcher
  private var nowNanos: Long = 0L
  private var executedItems: Int = 0
  private var displayFrameIntervalNanos: Long = SIXTY_HERTZ_FRAME_NANOS

  @Before
  fun setUp() {
    ReactNativeFeatureFlagsForTests.setUp()
    systemClock = mockStatic(SystemClock::class.java)
    systemClock.`when`<Long> { SystemClock.nanoTime() }.thenAnswer { nowNanos }
    val mountingManager = mock<MountingManager>()
    whenever(mountingManager.surfaceIsStopped(any())).thenReturn(false)
    whenever(mountingManager.isWaitingForViewAttach(any())).thenReturn(false)
    dispatcher = MountItemDispatcher(mountingManager, mock()) { displayFrameIntervalNanos }
  }

  @After
  fun tearDown() {
    systemClock.close()
  }

  /** Queues items that each take [costNanos] of the frame to execute. */
  private fun queuePreMountItems(count: Int, costNanos: Long) {
    repeat(count) {
      dispatcher.addPreAllocateMountItem(
          object : MountItem {
            override fun execute(mountingManager: MountingManager) {
              executedItems++
              nowNanos += costNanos
            }

            override fun getSurfaceId(): Int = SURFACE_ID
          }
      )
    }
  }

  /**
   * Runs one frame of pre-mounting starting at [frameTimeNanos] and returns how many items it
   * executed.
   */
  private fun preMountFrame(frameTimeNanos: Long): Int {
    nowNanos = frameTimeNanos
    val before = executedItems
    dispatcher.dispatchPreMountItems(frameTimeNanos)
    return executedItems - before
  }

  @Test
  fun preMountsForHalfOfTheDisplaysFrameAtSixtyHertz() {
    queuePreMountItems(count = 20, costNanos = MILLISECOND_NANOS)

    // Items start at 0, 1, ... 8 ms; the one starting past 8.33 ms waits for the next frame.
    assertThat(preMountFrame(FIRST_FRAME_NANOS)).isEqualTo(9)
  }

  @Test
  fun preMountsForHalfOfTheDisplaysFrameAtOneHundredTwentyHertz() {
    displayFrameIntervalNanos = ONE_HUNDRED_TWENTY_HERTZ_FRAME_NANOS
    queuePreMountItems(count = 20, costNanos = MILLISECOND_NANOS)

    // At 120 Hz half a frame is 4.17 ms: items start at 0 to 4 ms.
    assertThat(preMountFrame(FIRST_FRAME_NANOS)).isEqualTo(5)
  }

  @Test
  fun theBudgetFollowsTheDisplayBackToSixtyHertz() {
    displayFrameIntervalNanos = ONE_HUNDRED_TWENTY_HERTZ_FRAME_NANOS
    queuePreMountItems(count = 20, costNanos = MILLISECOND_NANOS)
    assertThat(preMountFrame(FIRST_FRAME_NANOS)).isEqualTo(5)

    displayFrameIntervalNanos = SIXTY_HERTZ_FRAME_NANOS

    assertThat(preMountFrame(FIRST_FRAME_NANOS + SIXTY_HERTZ_FRAME_NANOS)).isEqualTo(9)
  }

  private companion object {
    const val SURFACE_ID: Int = 1
    const val MILLISECOND_NANOS: Long = 1_000_000L
    const val FIRST_FRAME_NANOS: Long = 1_000_000_000L
    const val SIXTY_HERTZ_FRAME_NANOS: Long = 1_000_000_000L / 60
    const val ONE_HUNDRED_TWENTY_HERTZ_FRAME_NANOS: Long = 1_000_000_000L / 120
  }
}
