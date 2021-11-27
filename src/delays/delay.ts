import {Globals, ensureSafeDelayMs} from '../utils'

export interface DelayMsGlobals extends Pick<Globals, 'setTimeout'> {}

export type DelayMsConfig = {
  globals?: DelayMsGlobals
}

function getGlobals(): DelayMsGlobals {
  return {
    setTimeout: globalThis.setTimeout.bind(globalThis)
  }
}

/**
 * A function that creates a promise, which resolves after the given delay in
 * milliseconds.
 *
 * @export
 * @param {number} delayMs The duration of the delay, in milliseconds.
 * @param {DelayMsGlobals} config.globals An optional object with timer
 * functions to govern async behavior.
 * @returns {Promise<void>}
 */
export async function delayMs(delayMs: number, config: DelayMsConfig = {}): Promise<void> {
  const globals = config.globals || getGlobals()
  const safeDelayMs = ensureSafeDelayMs(delayMs)

  return new Promise(resolve => {
    globals.setTimeout(resolve, safeDelayMs)
  })
}
