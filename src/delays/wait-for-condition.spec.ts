import {expect} from 'chai'
import {SinonStub, stub} from 'sinon'

import {Clock, createClock, createControlledGlobals} from '../spec-support'
import {Globals} from '../utils'
import {waitForCondition, WaitForConditionConfig} from './wait-for-condition'

type ObservedResult<T = any> = {
  error?: any
  status: 'pending' | 'resolved' | 'rejected'
  value?: T
}

function flushPromises() {
  return new Promise(resolve => {
    setTimeout(resolve, 0)
  })
}

describe('delays > .waitForCondition()', () => {
  const {DEFAULT_INTERVAL_MS, DEFAULT_TIMEOUT_MS} = waitForCondition

  let conditionFn: SinonStub
  let clock: Clock
  let globals: Globals

  beforeEach(() => {
    clock = createClock()
    globals = createControlledGlobals(clock)
    conditionFn = stub()
  })

  afterEach(async () => {
    await flushPromises()
    clock.reset()
  })

  function waitAndObserve<T = any>(config: WaitForConditionConfig = {}): ObservedResult<T> {
    const result: ObservedResult<T> = {status: 'pending'} as ObservedResult<T>

    waitForCondition<T>(conditionFn, {...config, globals})
      .then(value => {
        result.value = value
        result.status = 'resolved'
      })
      .catch(reason => {
        result.error = reason
        result.status = 'rejected'
      })

    return result
  }

  it('does not immediately call the given callback', () => {
    conditionFn.returns(true)
    waitAndObserve()
    expect(conditionFn.callCount).to.equal(0)
  })

  it('does not call the callback while the default interval (16ms) has not elapsed', () => {
    conditionFn.returns(true)
    waitAndObserve()
    clock.tick(DEFAULT_INTERVAL_MS - 1)
    expect(conditionFn.callCount).to.equal(0)
  })

  it('calls the callback when the default interval elapses', () => {
    conditionFn.returns(true)
    waitAndObserve()
    clock.tick(DEFAULT_INTERVAL_MS)
    expect(conditionFn.callCount).to.equal(1)
  })

  it('calls the callback when an optional interval elapses', () => {
    conditionFn.returns(true)
    waitAndObserve({intervalMs: 10})
    clock.tick(10)
    expect(conditionFn.callCount).to.equal(1)
  })

  context('when the callback returns a truthy value', () => {
    const truthyValue = {a: 1}

    let result: ObservedResult

    beforeEach(async () => {
      conditionFn.returns(truthyValue)
      result = waitAndObserve()
      clock.tick(DEFAULT_INTERVAL_MS)
      await flushPromises()
    })

    it('resolves the returned promise', () => {
      expect(result.status).to.equal('resolved')
    })

    it('resolves with the value returned from the callback', () => {
      expect(result.value).to.equal(truthyValue)
    })

    it('cancels the remaining timers', () => {
      expect(clock.countTimers()).to.equal(0)
    })
  })

  context('when the callback asynchronously resolves with a truthy value', () => {
    const truthyValue = {a: 1}

    let result: ObservedResult

    beforeEach(async () => {
      conditionFn.returns(Promise.resolve(truthyValue))
      result = waitAndObserve()
      clock.tick(DEFAULT_INTERVAL_MS)
      await flushPromises()
    })

    it('resolves the returned promise', () => {
      expect(result.status).to.equal('resolved')
    })

    it('resolves with the value returned from the callback', () => {
      expect(result.value).to.equal(truthyValue)
    })

    it('cancels the remaining timers', () => {
      expect(clock.countTimers()).to.equal(0)
    })
  })

  context('when the callback returns a falsey value', () => {
    const falseyValue = null

    let result: ObservedResult

    beforeEach(async () => {
      conditionFn.returns(falseyValue)
      result = waitAndObserve()
      clock.tick(DEFAULT_INTERVAL_MS)
      await flushPromises()
    })

    it('does not yet resolve the returned promise', () => {
      expect(result.status).to.equal('pending')
    })

    it('does not cancel the remaining timers', () => {
      expect(clock.countTimers()).to.be.greaterThan(0)
    })

    it('calls the callback after additional intervals elapse', () => {
      clock.tick(DEFAULT_INTERVAL_MS * 2)
      expect(conditionFn.callCount).to.equal(3)
    })
  })

  context('when the callback asynchronously resolves with a falsey value', () => {
    const falseyValue = null

    let result: ObservedResult

    beforeEach(async () => {
      conditionFn.returns(Promise.resolve(falseyValue))
      result = waitAndObserve()
      clock.tick(DEFAULT_INTERVAL_MS)
      await flushPromises()
    })

    it('does not yet resolve the returned promise', () => {
      expect(result.status).to.equal('pending')
    })

    it('does not cancel the remaining timers', () => {
      expect(clock.countTimers()).to.be.greaterThan(0)
    })

    it('calls the callback after additional intervals elapse', () => {
      clock.tick(DEFAULT_INTERVAL_MS * 2)
      expect(conditionFn.callCount).to.equal(3)
    })
  })

  context('when the callback throws an error', () => {
    const error = new Error('FAIL')

    let result: ObservedResult

    beforeEach(async () => {
      conditionFn.throws(error)
      result = waitAndObserve()
      clock.tick(DEFAULT_INTERVAL_MS)
      await flushPromises()
    })

    it('rejects the returned promise', () => {
      expect(result.status).to.equal('rejected')
    })

    it('rejects with the error thrown from the callback', () => {
      expect(result.error).to.equal(error)
    })

    it('cancels the remaining timers', () => {
      expect(clock.countTimers()).to.equal(0)
    })
  })

  context('when the callback asynchronously rejects', () => {
    const error = new Error('FAIL')

    let result: ObservedResult

    beforeEach(async () => {
      conditionFn.returns(Promise.reject(error))
      result = waitAndObserve()
      clock.tick(DEFAULT_INTERVAL_MS)
      await flushPromises()
    })

    it('rejects the returned promise', () => {
      expect(result.status).to.equal('rejected')
    })

    it('rejects with the error rejected from the callback', () => {
      expect(result.error).to.equal(error)
    })

    it('cancels the remaining timers', () => {
      expect(clock.countTimers()).to.equal(0)
    })
  })

  it('calls the callback when the default interval elapses', () => {
    conditionFn.returns(true)
    waitAndObserve()
    clock.tick(DEFAULT_INTERVAL_MS)
    expect(conditionFn.callCount).to.equal(1)
  })

  it('calls the callback when an optional interval elapses', () => {
    conditionFn.returns(true)
    waitAndObserve({intervalMs: 10})
    clock.tick(10)
    expect(conditionFn.callCount).to.equal(1)
  })

  context('when the default timeout elapses', () => {
    let result: ObservedResult

    beforeEach(async () => {
      conditionFn.returns(false)
      result = waitAndObserve()
      clock.tick(DEFAULT_TIMEOUT_MS)
      await flushPromises()
    })

    it('rejects the returned promise', () => {
      expect(result.status).to.equal('rejected')
    })

    it('rejects with an error', () => {
      expect(result.error).to.be.instanceOf(Error)
    })

    it('cancels the remaining timers', () => {
      expect(clock.countTimers()).to.equal(0)
    })
  })

  context('when an optional timeout elapses', () => {
    let result: ObservedResult

    beforeEach(async () => {
      conditionFn.returns(false)
      result = waitAndObserve({intervalMs: 4, timeoutMs: 10})
      clock.tick(10)
      await flushPromises()
    })

    it('rejects the returned promise', () => {
      expect(result.status).to.equal('rejected')
    })

    it('rejects with an error', () => {
      expect(result.error).to.be.instanceOf(Error)
    })

    it('cancels the remaining timers', () => {
      expect(clock.countTimers()).to.equal(0)
    })
  })
})
