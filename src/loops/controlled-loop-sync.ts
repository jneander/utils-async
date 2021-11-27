import {Globals, getCurrentFrameTime, safeDelayMs} from '../utils'

function haveTimeForAnotherLoop(
  startTime: number,
  iterations: number,
  config: ControlledLoopSyncConfig
): boolean {
  const difference = config.globals!.performance.now() - startTime
  const average = difference / iterations
  return difference + average < config.maxBlockingTimeMs!
}

export interface ControlledLoopSyncGlobals
  extends Pick<Globals, 'document' | 'performance' | 'requestAnimationFrame' | 'setTimeout'> {}

export interface ControlledLoopSyncConfig {
  globals?: ControlledLoopSyncGlobals
  loopFn: () => void
  maxBlockingTimeMs?: number
  onError?: (error: any) => void
}

function substituteRequestAnimationFrame(globals: ControlledLoopSyncGlobals) {
  return function substitutedRequestAnimationFrame(callbackFn: Function): any {
    globals.setTimeout(callbackFn, 1)
  }
}

function ensureRaf(globals: ControlledLoopSyncGlobals): ControlledLoopSyncGlobals {
  const timerGlobals = {...globals}

  if (timerGlobals.requestAnimationFrame == null) {
    timerGlobals.requestAnimationFrame = substituteRequestAnimationFrame(timerGlobals)
  }

  return timerGlobals
}

function ensureGlobals(globals: ControlledLoopSyncGlobals | undefined): ControlledLoopSyncGlobals {
  if (globals) {
    return ensureRaf(globals)
  }

  const timerGlobals: ControlledLoopSyncGlobals = {
    performance: globalThis.performance,
    requestAnimationFrame: globalThis.requestAnimationFrame?.bind(globalThis),
    setTimeout: globalThis.setTimeout.bind(globalThis)
  }

  return ensureRaf(timerGlobals)
}

/**
 * A class which calls a synchronous callback function at regular intervals. It
 * is started, stopped, and resumed manually.
 *
 * @export
 * @class ControlledLoopSync
 */
export class ControlledLoopSync {
  static DEFAULT_MAX_BLOCKING_TIME_MS = 15

  private config: ControlledLoopSyncConfig

  private _isRunning: boolean

  /**
   * Creates an instance of ControlledLoopSync.
   *
   * @param {() => void} config.loopFn A synchronous
   * callback function to be called with each interval of the loop. While the
   * loop is running, this function will be called repeatedly. If this function
   * throws, the loop will be stopped.
   * @param {ControlledLoopSyncGlobals} [config.globals] An optional object
   * with timer functions to govern async behavior. This class uses
   * `requestAnimationFrame` in browsers and `setTimeout` in node.js.
   * @param {number} [config.maxBlockingTimeMs] An optional duration to limit
   * the time during which the thread will be blocked while executing the
   * configured `loopFn`. When not specified, the default will be used.
   * @param {(reason: any) => void} [config.onError] An optional function that
   * will be called when the given `loopFn` throws. If provided, the `onError`
   * callback will be called with the same value caught from the loop function.
   */
  constructor(config: ControlledLoopSyncConfig) {
    this.config = {
      globals: ensureGlobals(config.globals),
      loopFn: config.loopFn,
      maxBlockingTimeMs: safeDelayMs(
        config.maxBlockingTimeMs,
        ControlledLoopSync.DEFAULT_MAX_BLOCKING_TIME_MS
      ),
      onError: config.onError
    }

    this._isRunning = false
  }

  /**
   * Is `true` or `false` depending on whether the loop is currently running.
   *
   * @readonly
   * @type {boolean} `true` when the loop is currently running. `false`
   * otherwise.
   */
  get isRunning(): boolean {
    return this._isRunning
  }

  /**
   * Starts the loop. The configured `loopFn` will be called repeatedly.
   */
  start(): void {
    if (this.isRunning) {
      return
    }

    const loop = () => {
      const startTime = getCurrentFrameTime(this.config.globals!)

      let iterations = 0

      while (this.isRunning) {
        try {
          this.config.loopFn()
        } catch (error) {
          this.stop()

          try {
            this.config.onError?.(error)
          } catch (_) {
            // No remediation available/needed for an error here
          }
        }

        iterations++

        if (!haveTimeForAnotherLoop(startTime, iterations, this.config)) {
          this.delay(loop)
          break
        }
      }
    }

    this._isRunning = true
    loop()
  }

  /**
   * Stops the loop. The configured `loopFn` function will no longer be called.
   */
  stop(): void {
    this._isRunning = false
  }

  private delay(callbackFn: () => void): void {
    this.config.globals!.requestAnimationFrame!(() => {
      if (this.isRunning) {
        callbackFn()
      }
    })
  }
}
