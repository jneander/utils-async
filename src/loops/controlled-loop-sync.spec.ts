import {expect} from 'chai'
import {SinonStub, stub} from 'sinon'

import {Clock, createClock, createControlledGlobals} from '../spec-support'
import {Globals} from '../utils'
import {ControlledLoopSync} from './controlled-loop-sync'

describe('loops > ControlledLoopSync', () => {
  const maxBlockingTimeMs = 16

  let clock: Clock
  let globals: Globals
  let loopFn: SinonStub
  let loop: ControlledLoopSync

  let loopFnBlockingTimeMs: number
  let maxNumberOfLoops: number

  beforeEach(() => {
    clock = createClock()
    globals = createControlledGlobals(clock)

    loopFnBlockingTimeMs = 1
    maxNumberOfLoops = maxBlockingTimeMs * 2

    loopFn = stub().callsFake(() => {
      clock.tick(loopFnBlockingTimeMs)
      maxNumberOfLoops--

      if (maxNumberOfLoops == 0) {
        loop.stop()
      }
    })

    loop = new ControlledLoopSync({
      globals,
      loopFn,
      maxBlockingTimeMs
    })
  })

  afterEach(() => {
    loop.stop()
    clock.reset()
  })

  it('does not call the given `loopFn` callback function when not started', () => {
    expect(loopFn.callCount).to.equal(0)
  })

  describe('#start()', () => {
    it('begins the loop', () => {
      loop.start()
      expect(loopFn.callCount).to.be.greaterThan(0)
    })
  })

  describe('#isRunning', () => {
    it('is `false` when the loop has not started', () => {
      expect(loop.isRunning).to.equal(false)
    })

    it('is `true` when the loop has started', () => {
      loop.start()
      expect(loop.isRunning).to.equal(true)
    })

    it('is `false` when the loop has stopped after having started', () => {
      loop.start()
      loop.stop()
      expect(loop.isRunning).to.equal(false)
    })
  })

  describe('looping', () => {
    it('calls the given `loopFn` callback repeatedly', () => {
      maxNumberOfLoops = 5
      loop.start()
      expect(loopFn.callCount).to.equal(5)
    })

    it('pauses the loop when `maxBlockingTimeMs` has elapsed', () => {
      maxNumberOfLoops = 5
      loopFnBlockingTimeMs = maxBlockingTimeMs / 2 - 1 // allows two ticks before time elapses
      loop.start() // two ticks upon start
      expect(loopFn.callCount).to.equal(2)
    })

    it('asynchronously continues the loop when `maxBlockingTimeMs` has passed', () => {
      maxNumberOfLoops = 10
      loopFnBlockingTimeMs = maxBlockingTimeMs / 2 - 1 // allows two ticks before time elapses
      loop.start() // two ticks upon start
      clock.next() // two more ticks before time elapses again
      expect(loopFn.callCount).to.equal(4)
    })
  })

  describe('#stop()', () => {
    it('stops the loop', () => {
      maxNumberOfLoops = 5
      loopFnBlockingTimeMs = maxBlockingTimeMs / 2 - 1 // allows two ticks before time elapses
      loop.start() // two ticks upon start
      loop.stop()
      clock.next() // advancing time no longer continues the loop
      expect(loopFn.callCount).to.equal(2)
    })
  })

  context('when the `loopFn` throws an error', () => {
    const error = new Error('FAIL')

    it('stops the loop', () => {
      loopFn.callsFake(() => {
        throw error
      })
      loop.start()
      expect(loop.isRunning).to.be.false
    })

    it('discontinues calling the given `loopFn` callback synchronously', () => {
      loopFn.callsFake(() => {
        throw error
      })
      loop.start()
      expect(loopFn.callCount).to.equal(1)
    })

    it('discontinues calling the given `loopFn` callback asynchronously', () => {
      loopFn.callsFake(() => {
        clock.tick(maxBlockingTimeMs) // would ordinarily push next iteration into subsequent frame
        throw error
      })
      loop.start()
      clock.next() // advance time to ensure any delayed callbacks are triggered
      expect(loopFn.callCount).to.equal(1)
    })

    context('when given an `onError` callback', () => {
      let onError: SinonStub

      beforeEach(() => {
        loopFn.callsFake(() => {
          throw error
        })

        onError = stub()

        loop = new ControlledLoopSync({
          globals,
          loopFn,
          maxBlockingTimeMs,
          onError
        })
      })

      it('calls the given `onError` callback', () => {
        loop.start()
        clock.next() // advance time to ensure any delayed callbacks are triggered
        expect(onError.callCount).to.equal(1)
      })

      it('includes the thrown error when calling the `onError` callback', () => {
        loop.start()
        clock.next()
        const [receivedError] = onError.getCall(0).args
        expect(receivedError).to.equal(error)
      })

      it('discontinues calling the given `loopFn` callback synchronously', () => {
        loop.start()
        expect(loopFn.callCount).to.equal(1)
      })

      it('discontinues calling the given `loopFn` callback asynchronously', () => {
        loopFn.callsFake(() => {
          clock.tick(maxBlockingTimeMs) // would ordinarily push next iteration into subsequent frame
          throw error
        })
        loop.start()
        clock.next() // advance time to ensure any delayed callbacks are triggered
        expect(loopFn.callCount).to.equal(1)
      })
    })

    context('when the given `onError` callback throws an error', () => {
      beforeEach(() => {
        loopFn.callsFake(() => {
          throw error
        })

        function onError() {
          throw new Error('Unable to handle error')
        }

        loop = new ControlledLoopSync({
          globals,
          loopFn,
          maxBlockingTimeMs,
          onError
        })
      })

      it('stops the loop', () => {
        loop.start()
        clock.next() // advance time to ensure any delayed callbacks are triggered
        expect(loop.isRunning).to.be.false
      })

      it('discontinues calling the given `loopFn` callback synchronously', () => {
        loop.start()
        expect(loopFn.callCount).to.equal(1)
      })

      it('discontinues calling the given `loopFn` callback asynchronously', () => {
        loopFn.callsFake(() => {
          clock.tick(maxBlockingTimeMs) // would ordinarily push next iteration into subsequent frame
          throw error
        })
        loop.start()
        clock.next() // advance time to ensure any delayed callbacks are triggered
        expect(loopFn.callCount).to.equal(1)
      })
    })
  })
})
