/*
 * This implementation is based on Jake Archibald's `animationInterval` function.
 * https://gist.github.com/jakearchibald/cb03f15670817001b1157e62a076fe95/85fedc4fe005449955cb5207173e33f84dc6c140
 */

import {getCurrentFrameTime} from './time'

export type TimerTickListener = (time: number) => void

export interface TimerGlobals {
  requestAnimationFrame: typeof requestAnimationFrame
  setTimeout: typeof setTimeout
}

export interface TimerOptions {
  globals?: TimerGlobals
  onTick: TimerTickListener
  targetTickRateMs: number
}

function getGlobals(): TimerGlobals {
  return {
    requestAnimationFrame: globalThis.requestAnimationFrame.bind(globalThis),
    setTimeout: globalThis.setInterval.bind(globalThis)
  }
}

function safeTickRateMs(ms: number): number {
  if (ms < 0 || !Number.isFinite(ms)) {
    return 1000
  }

  return Math.round(ms)
}

/**
 * A class which starts and stops a configurable loop, calling a callback
 * function a certain number of times each second, as configured by the
 * consumer.
 *
 * @export
 * @class Timer
 */
export class Timer {
  private _onTick: TimerTickListener
  private globals: TimerGlobals

  private _tickRateMs: number
  private _isRunning: boolean
  private _runId: number
  private _startTime: number | null

  /**
   * Creates an instance of Timer.
   *
   * @param {TimerTickListener} options.onTick A callback function to be called
   * with each interval of the Timer. It will receive the time at which the
   * function is called.
   * @param {number} options.targetTickRateMs The approximate amount of time
   * that the Timer should wait between ticks. This value must be a non-negative
   * integer.
   */
  constructor(options: TimerOptions) {
    this._onTick = options.onTick
    this.globals = options.globals || getGlobals()

    this._tickRateMs = safeTickRateMs(options.targetTickRateMs)
    this._isRunning = false
    this._runId = 0
    this._startTime = null
  }

  /**
   * Is `true` or `false` depending on whether this Timer is currently running.
   *
   * @readonly
   * @type {boolean} `true` when this Timer is currently running. `false`
   * otherwise.
   */
  get isRunning(): boolean {
    return this._isRunning
  }

  /**
   * The time at which this Timer was started.
   *
   * @readonly
   * @type {(number | null)} The numeric timestamp of the Timer's starting time.
   * Is `null` when the Timer is not running.
   */
  get startTime(): number | null {
    return this._startTime
  }

  /**
   * Sets the target interval per tick (in milliseconds) to the given value. If
   * the value is negative or not finite, the tick rate will be set to 1000ms.
   *
   * This value can be set while the timer is currently running.
   *
   * @param {number} tickRateMs The approximate amount of time (in milliseconds)
   * between ticks.
   */
  setTargetTickRateMs(tickRateMs: number): void {
    this._tickRateMs = safeTickRateMs(tickRateMs)
  }

  /**
   * Starts this Timer. The start time will be recorded, and the configured
   * `onTick` callback will be called after subsequent intervals approximately
   * equal to the set target tick rate.
   */
  start(): void {
    if (this.isRunning) {
      return
    }

    this._runId++
    this._startTime = getCurrentFrameTime()
    this.scheduleTick(this._startTime)
  }

  /**
   * Stops this Timer. The start time will be cleared, and the configured
   * `onTick` callback will no longer be called.
   */
  stop() {
    this._isRunning = false
    this._startTime = null
  }

  private scheduleTick(time: number): void {
    const elapsed = time - this._startTime!
    const roundedElapsed = Math.round(elapsed / this._tickRateMs) * this._tickRateMs
    const targetNext = this._startTime! + roundedElapsed + this._tickRateMs
    const delay = targetNext - performance.now()

    const currentRunId = this._runId

    this.globals.setTimeout(() => {
      this.globals.requestAnimationFrame((rafTime: number) => {
        this.processTick(rafTime, currentRunId)
      })
    }, delay)
  }

  private processTick(time: number, currentRunId: number): void {
    if (!this.isRunning || currentRunId !== this._runId) {
      return
    }

    this._onTick(time)
    this.scheduleTick(time)
  }
}
