import {Globals, safeDelayMs} from '../utils'

export interface WaitForConditionGlobals
  extends Pick<Globals, 'clearInterval' | 'clearTimeout' | 'setInterval' | 'setTimeout'> {}

export type WaitForConditionConfig = {
  globals?: WaitForConditionGlobals
  intervalMs?: number
  timeoutMs?: number
}

function getGlobals(): WaitForConditionGlobals {
  return {
    clearInterval: globalThis.clearInterval.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    setInterval: globalThis.setInterval.bind(globalThis),
    setTimeout: globalThis.setTimeout.bind(globalThis)
  }
}

/**
 * A function which begins an interval timer, calling the given `conditionFn`
 * callback until it resolves with a truthy value. The interval will use either
 * the given `intervalMs` value or the default. A timeout timer will begin
 * immediately using either the given `timeoutMs` value or the default.
 *
 * When the timeout elapses before the condition is not met, the timers will be
 * cancelled and `waitForCondition` will reject with an error.
 *
 * When the condition is met before the timeout elapses, the timers will be
 * cancelled and `waitForCondition` will resolve with the value resolved from
 * `conditionFn`.
 *
 * @export
 * @param {() => T} conditionFn The callback function called after each
 * interval.
 * @param {number} config.intervalMs The approximate amount of time that the
 * function should wait between calls of the given `conditionFn`. This value
 * must be a non-negative integer.
 * @param {number} config.timeoutMs The approximate amount of time that the
 * function should wait for the condition to be met before timing out. This
 * value must be a non-negative integer.
 * @param {WaitForConditionGlobals} config.globals An optional object with
 * timer functions to govern async behavior.
 * @returns {Promise<T>} A promise that will resolve when the condition is met,
 * or reject when the timeout elapses.
 */
export async function waitForCondition<T = any>(
  conditionFn: () => T,
  config: WaitForConditionConfig = {}
) {
  return new Promise<T>((resolve, reject) => {
    const intervalDuration = safeDelayMs(config.intervalMs, waitForCondition.DEFAULT_INTERVAL_MS)
    const timeoutDuration = safeDelayMs(config.timeoutMs, waitForCondition.DEFAULT_TIMEOUT_MS)
    const globals = config.globals || getGlobals()

    let timeoutId: ReturnType<typeof setTimeout>

    const intervalFn = async () => {
      try {
        const result = await conditionFn()

        if (result) {
          globals.clearInterval(intervalId)
          globals.clearTimeout(timeoutId)
          resolve(result)
        }
      } catch (error) {
        globals.clearInterval(intervalId)
        globals.clearTimeout(timeoutId)
        reject(error)
      }
    }

    const intervalId = globals.setInterval(intervalFn, intervalDuration)

    const timeoutFn = () => {
      globals.clearInterval(intervalId)
      reject(new Error('Timeout waiting for condition'))
    }

    timeoutId = globals.setTimeout(timeoutFn, timeoutDuration)
  })
}

waitForCondition.DEFAULT_INTERVAL_MS = 16 // ~1 render frame
waitForCondition.DEFAULT_TIMEOUT_MS = 1000 // 1 second
