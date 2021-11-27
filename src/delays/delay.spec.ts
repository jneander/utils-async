import {expect} from 'chai'

import {Clock, createClock, createControlledGlobals} from '../spec-support'
import {Globals} from '../utils'
import {delayMs} from './delay'

function flushPromises() {
  return new Promise(resolve => {
    setTimeout(resolve, 0)
  })
}

describe('delays > .delayMs()', () => {
  let resolved: boolean
  let clock: Clock
  let globals: Globals

  beforeEach(() => {
    clock = createClock()
    globals = createControlledGlobals(clock)
    resolved = false
  })

  afterEach(async () => {
    await flushPromises()
    clock.reset()
  })

  function delayAndObserve(ms: number): void {
    delayMs(ms, {globals}).then(() => {
      resolved = true
    })
  }

  it('does not resolve while the given timeout has not elapsed', async () => {
    delayAndObserve(10)
    clock.tick(9)
    await flushPromises()
    expect(resolved).to.equal(false)
  })

  it('resolves when the given timeout elapses', async () => {
    delayAndObserve(10)
    clock.tick(10)
    await flushPromises()
    expect(resolved).to.equal(true)
  })
})
