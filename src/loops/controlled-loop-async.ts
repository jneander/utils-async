export interface ControlledLoopAsyncConfig {
  loopFn: () => void | PromiseLike<void>
  onError?: (reason: any) => void
}

/**
 * A class which controls a configurable loop, calling an asynchronous callback
 * function at regular intervals. It is started, stopped, and resumed manually.
 *
 * @export
 * @class ControlledLoopAsync
 */
export class ControlledLoopAsync {
  private config: ControlledLoopAsyncConfig

  private _isRunning: boolean

  /**
   * Creates an instance of ControlledLoopAsync.
   *
   * @param {() => void | PromiseLike<void>} config.loopFn An asynchronous
   * callback function to be called with each interval of the loop. While the
   * loop is running, this function will be called repeatedly. Each iteration of
   * the loop will wait until this function resolves. If this function rejects,
   * the loop will be stopped.
   * @param {(reason: any) => void} [config.onError] An optional function that
   * will be called when the given `loopFn` throws or rejects. If provided, the
   * `onError` callback will be called with the same value caught from the loop
   * function.
   */
  constructor(config: ControlledLoopAsyncConfig) {
    this.config = {
      loopFn: config.loopFn,
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
  async start(): Promise<void> {
    if (this.isRunning) {
      return
    }

    this._isRunning = true

    while (this.isRunning) {
      try {
        await this.config.loopFn()
      } catch (error: any) {
        this.stop()
        this.config.onError?.(error)
      }
    }
  }

  /**
   * Stops the loop. The configured `loopFn` function will no longer be called.
   */
  stop(): void {
    this._isRunning = false
  }
}
