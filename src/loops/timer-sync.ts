/*
 * This implementation is based on Jake Archibald's `animationInterval` function.
 * https://gist.github.com/jakearchibald/cb03f15670817001b1157e62a076fe95/85fedc4fe005449955cb5207173e33f84dc6c140
 */

import {Globals, getCurrentFrameTime, safeDelayMs} from '../utils'

export type TimerTickCallback = (time: number) => void
export type TimerErrorCallback = (reason: any) => void

export interface TimerGlobals
  extends Pick<
    Globals,
    'clearTimeout' | 'document' | 'performance' | 'requestAnimationFrame' | 'setTimeout'
  > {}

export interface TimerConfig {
  globals?: TimerGlobals
  onError?: TimerErrorCallback
  onTick: TimerTickCallback
  targetTickIntervalMs: number
}

function substituteRequestAnimationFrame(globals: TimerGlobals) {
  return function substitutedRequestAnimationFrame(callbackFn: Function): any {
    callbackFn(getCurrentFrameTime(globals))
  }
}

function ensureRaf(globals: TimerGlobals): TimerGlobals {
  const timerGlobals = {...globals}
  if (timerGlobals.requestAnimationFrame == null) {
    timerGlobals.requestAnimationFrame = substituteRequestAnimationFrame(timerGlobals)
  }
  return timerGlobals
}

function safeTickIntervalMs(ms: number): number {
  return safeDelayMs(ms, 1000)
}

function ensureGlobals(globals?: TimerGlobals): TimerGlobals {
  if (globals) {
    return ensureRaf(globals)
  }

  const timerGlobals: TimerGlobals = {
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    performance: globalThis.performance,
    requestAnimationFrame: globalThis.requestAnimationFrame?.bind(globalThis),
    setTimeout: globalThis.setTimeout.bind(globalThis)
  }

  return ensureRaf(timerGlobals)
}

/**
 * A class which controls a configurable loop, calling a callback function a
 * certain number of times each second, as configured by the consumer. It is
 * started, stopped, and resumed manually.
 *
 * @export
 * @class TimerSync
 */
export class TimerSync {
  private onError: TimerErrorCallback | null
  private onTick: TimerTickCallback
  private globals: TimerGlobals

  private _tickIntervalMs: number
  private _runId: number
  private _startTime: number | null
  private _currentIntervalTimeoutId: ReturnType<Globals['setTimeout']> | null
  private _currentIntervalStartTime: number | null

  /**
   * Creates an instance of TimerSync.
   *
   * @param {TimerTickCallback} config.onTick A callback function to be called
   * with each interval of the timer. It will receive the time at which the
   * function is called.
   * @param {number} config.targetTickIntervalMs The approximate amount of time
   * that the timer should wait between ticks. This value must be a non-negative
   * integer.
   * @param {TimerGlobals} [config.globals] An optional object with timer
   * functions to govern async behavior.
   * @param {(reason: any) => void} [config.onError] An optional function that
   * will be called when the given `onTick` function throws. If provided, the
   * `onError` callback will be called with the same value caught from the tick
   * function.
   */
  constructor(config: TimerConfig) {
    this.onError = config.onError || null
    this.onTick = config.onTick
    this.globals = ensureGlobals(config.globals)

    this._tickIntervalMs = safeTickIntervalMs(config.targetTickIntervalMs)
    this._runId = 0
    this._startTime = null
    this._currentIntervalStartTime = null
    this._currentIntervalTimeoutId = null
  }

  /**
   * Is `true` or `false` depending on whether the loop is currently running.
   *
   * @readonly
   * @type {boolean} `true` when the loop is currently running. `false`
   * otherwise.
   */
  get isRunning(): boolean {
    return this._startTime != null
  }

  /**
   * The time at which this timer was started.
   *
   * @readonly
   * @type {(number | null)} The numeric timestamp of the timer's starting time.
   * Is `null` when the timer is not running.
   */
  get startTime(): number | null {
    return this._startTime
  }

  /**
   * The configured, approximate amount of time that the timer should wait
   * between ticks.
   *
   * @readonly
   * @type {number} Interval duration in milliseconds.
   */
  get targetTickIntervalMs(): number {
    return this._tickIntervalMs
  }

  /**
   * Sets the target interval per tick (in milliseconds) to the given value. If
   * the value is negative or not finite, the tick rate will be set to 1000ms.
   *
   * This value can be set while the timer is currently running.
   *
   * @param {number} tickIntervalMs The approximate amount of time (in
   * milliseconds) between ticks.
   */
  setTargetTickIntervalMs(tickIntervalMs: number): void {
    this._tickIntervalMs = safeTickIntervalMs(tickIntervalMs)
    if (!this.isRunning || this._currentIntervalTimeoutId == null) {
      return
    }

    this.globals.clearTimeout(this._currentIntervalTimeoutId)
    this.scheduleTick(this._currentIntervalStartTime!)
  }

  /**
   * Starts this timer. The start time will be recorded, and the configured
   * `onTick` callback will be called after subsequent intervals approximately
   * equal to the set target tick interval.
   */
  start(): void {
    if (this.isRunning) {
      return
    }

    this._runId++
    this._startTime = getCurrentFrameTime(this.globals)
    this.scheduleTick(this._startTime)
  }

  /**
   * Stops this timer. The start time will be cleared, and the configured
   * `onTick` callback will no longer be called.
   */
  stop() {
    this._startTime = null
  }

  private scheduleTick(intervalStartTimeMs: number): void {
    const elapsedMs = intervalStartTimeMs - this._currentIntervalStartTime!
    const roundedElapsedMs = Math.round(elapsedMs / this._tickIntervalMs) * this._tickIntervalMs
    const targetNext = this._currentIntervalStartTime! + roundedElapsedMs + this._tickIntervalMs
    const delay = Math.max(0, targetNext - this.globals.performance.now())

    const currentRunId = this._runId

    this._currentIntervalStartTime = targetNext - this._tickIntervalMs
    this._currentIntervalTimeoutId = this.globals.setTimeout(() => {
      this.globals.requestAnimationFrame!((rafTime: number) => {
        this._currentIntervalStartTime = null
        this._currentIntervalTimeoutId = null
        this.processTick(rafTime, currentRunId)
      })
    }, delay)
  }

  private processTick(currentTimeMs: number, currentRunId: number): void {
    if (!this.isRunning || currentRunId !== this._runId) {
      return
    }

    try {
      this.onTick(currentTimeMs)
      this.scheduleTick(currentTimeMs)
    } catch (error) {
      this.stop()
      try {
        this.onError?.(error)
      } catch (_) {
        // No remediation available/needed for an error here
      }
    }
  }
}
