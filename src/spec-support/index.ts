import {
  BrowserClock,
  Clock as SinonClock,
  createClock as createSinonClock
} from '@sinonjs/fake-timers'

import {Globals} from '../utils'

export interface Clock extends Omit<SinonClock, 'cancelAnimationFrame' | 'requestAnimationFrame'> {
  cancelAnimationFrame: SinonClock['cancelAnimationFrame'] | undefined
  requestAnimationFrame: SinonClock['requestAnimationFrame'] | undefined
}

export function createClock(): Clock {
  const clock: Clock = createSinonClock()

  if (globalThis.requestAnimationFrame == null) {
    clock.requestAnimationFrame = undefined
    clock.cancelAnimationFrame = undefined
  }

  clock

  return clock
}

export function createControlledGlobals(clock: Clock): Globals {
  let requestAnimationFrame = undefined

  if (clock.requestAnimationFrame != null) {
    requestAnimationFrame = (callback: (time: number) => void): number => {
      return clock.requestAnimationFrame!(callback) as number
    }
  }

  return {
    clearInterval: clock.clearInterval as typeof clearInterval,
    clearTimeout: clock.clearTimeout as typeof clearTimeout,
    document: globalThis.document,
    performance: (clock as BrowserClock).performance,
    requestAnimationFrame,
    setInterval: clock.setInterval as typeof setInterval,
    setTimeout: clock.setTimeout as typeof setTimeout
  }
}
