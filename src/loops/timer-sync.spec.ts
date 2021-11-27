import {expect} from 'chai'
import {SinonStub, stub} from 'sinon'

import {Clock, createClock, createControlledGlobals} from '../spec-support'
import {Globals} from '../utils'
import {TimerSync} from './timer-sync'

describe('loops > TimerSync', () => {
  const targetTickIntervalMs = 1000

  let clock: Clock
  let globals: Globals
  let onTick: SinonStub
  let onTickBlockingTimeMs: number
  let timer: TimerSync

  beforeEach(() => {
    clock = createClock()
    globals = createControlledGlobals(clock)

    onTickBlockingTimeMs = 0
    onTick = stub().callsFake(() => {
      /*
       * Manually advancing time this way simulates blocking the thread. The
       * current time must be updated from within the `onTick` callback so that
       * the subsequent tick is scheduled after the blocking time has passed.
       */
      clock.now += onTickBlockingTimeMs
    })

    timer = new TimerSync({
      globals,
      onTick,
      targetTickIntervalMs
    })
  })

  afterEach(() => {
    timer.stop()
    clock.reset()
  })

  function getTimeElapsed(): number {
    return globals.performance.now()
  }

  describe('#start()', () => {
    it('begins the timer', () => {
      timer.start()
      clock.next()
      expect(onTick.callCount).to.equal(1)
    })

    it('does not call the given `onTick` callback immediately', () => {
      timer.start()
      expect(onTick.callCount).to.equal(0)
    })
  })

  describe('looping', () => {
    context('when the given `targetTickIntervalMs` has elapsed', () => {
      beforeEach(() => {
        timer.start()
        // advance time to 1000ms (1st tick interval)
        clock.tick(targetTickIntervalMs)
      })

      it('calls the given `onTick` callback', () => {
        expect(onTick.callCount).to.equal(1)
      })

      it('passes the current time to `onTick` when calling', () => {
        const [onTickTime] = onTick.lastCall.args
        expect(onTickTime).to.equal(getTimeElapsed())
      })
    })

    context('after successive timer intervals elapse', () => {
      beforeEach(() => {
        timer.start()
        // advance time to 3000ms (3rd tick interval)
        clock.tick(targetTickIntervalMs * 3)
      })

      it('calls `onTick` once at each interval', () => {
        expect(onTick.callCount).to.equal(3)
      })

      it('passes the current time of each interval to the `onTick` call', () => {
        const times = onTick.getCalls().map(call => call.args[0])
        expect(times).to.deep.equal([
          targetTickIntervalMs,
          targetTickIntervalMs * 2,
          targetTickIntervalMs * 3
        ])
      })
    })

    context('after blocking the thread', () => {
      context('for less time than the target timer interval', () => {
        beforeEach(() => {
          onTickBlockingTimeMs = 900 // exactly one tick interval
          timer.start()
          // advance time to 1000ms (1st tick interval)
          clock.next() // `onTick` blocks until 2001ms
          onTickBlockingTimeMs = 0 // subsequent ticks will not block
        })

        it('schedules the next tick to match the target timer interval', () => {
          clock.next() // advance time to next tick interval
          expect(getTimeElapsed()).to.equal(targetTickIntervalMs * 2)
        })

        it('passes `onTick` a time matching the target timer interval', () => {
          clock.next() // advance time to next tick interval
          const [onTickTime] = onTick.lastCall.args
          expect(onTickTime).to.equal(targetTickIntervalMs * 2)
        })
      })

      context('for as long as the timer interval', () => {
        beforeEach(() => {
          onTickBlockingTimeMs = targetTickIntervalMs // exactly one tick interval
          timer.start()
          // advance time to 1000ms (1st tick interval)
          clock.next() // `onTick` blocks until 2001ms
          onTickBlockingTimeMs = 0 // subsequent ticks will not block
        })

        it('delays `onTick` to the next cycle of the event loop', () => {
          const timeAfterFirstOnTick = getTimeElapsed()
          clock.next() // advance time to next tick interval
          expect(getTimeElapsed()).to.equal(timeAfterFirstOnTick + 1)
        })

        it('passes the delayed time to the `onTick` callback', () => {
          const timeAfterFirstOnTick = getTimeElapsed()
          clock.next() // advance time to next tick interval
          const [onTickTime] = onTick.lastCall.args
          expect(onTickTime).to.equal(timeAfterFirstOnTick + 1)
        })
      })

      context('for longer than the timer interval', () => {
        beforeEach(() => {
          onTickBlockingTimeMs = targetTickIntervalMs + 1 // more than one tick interval
          timer.start()
          // advance time to 1000ms (1st tick interval)
          clock.next() // `onTick` blocks until 2001ms
          onTickBlockingTimeMs = 0 // subsequent ticks will not block
        })

        it('delays `onTick` to the next cycle of the event loop', () => {
          const timeAfterFirstOnTick = getTimeElapsed()
          clock.next() // advance time to next tick interval
          expect(getTimeElapsed()).to.equal(timeAfterFirstOnTick + 1)
        })

        it('passes the delayed time to the `onTick` callback', () => {
          const timeAfterFirstOnTick = getTimeElapsed()
          clock.next() // advance time to next tick interval
          const [onTickTime] = onTick.lastCall.args
          expect(onTickTime).to.equal(timeAfterFirstOnTick + 1)
        })
      })
    })
  })

  describe('#isRunning', () => {
    it('is `false` when the timer has not started', () => {
      expect(timer.isRunning).to.equal(false)
    })

    it('is `true` when the timer has started', () => {
      timer.start()
      expect(timer.isRunning).to.equal(true)
    })

    it('is `false` when the timer has stopped after having started', () => {
      timer.start()
      timer.stop()
      expect(timer.isRunning).to.equal(false)
    })
  })

  describe('#stop()', () => {
    it('stops the timer', () => {
      timer.start()
      timer.stop()
      clock.next()
      expect(onTick.callCount).to.equal(0)
    })
  })

  context('when the `onTick` callback throws an error', () => {
    const error = new Error('FAIL')

    beforeEach(() => {
      onTick.callsFake(() => {
        throw error
      })
    })

    it('stops the timer', () => {
      timer.start()
      // advance time to 1000ms (1st tick interval)
      clock.next()
      expect(timer.isRunning).to.be.false
    })

    it('discontinues calling the given `onTick` callback', () => {
      timer.start()
      // advance time to 1000ms (1st tick interval)
      clock.next()
      // advance time to ensure any delayed callbacks are triggered
      clock.next()
      expect(onTick.callCount).to.equal(1)
    })

    it('does not schedule additional async behavior', () => {
      timer.start()
      // advance time to 1000ms (1st tick interval)
      clock.next()
      expect(clock.countTimers()).to.equal(0)
    })

    context('when given an `onError` callback', () => {
      let onError: SinonStub

      beforeEach(() => {
        onError = stub()

        timer = new TimerSync({
          globals,
          onError,
          onTick,
          targetTickIntervalMs
        })

        timer.start()
        clock.next()
      })

      it('calls the given `onError` callback', () => {
        clock.next() // advance time to ensure any delayed callbacks are triggered
        expect(onError.callCount).to.equal(1)
      })

      it('includes the thrown error when calling the `onError` callback', () => {
        const [receivedError] = onError.getCall(0).args
        expect(receivedError).to.equal(error)
      })

      it('discontinues calling the given `onTick` callback', () => {
        // advance time to ensure any delayed callbacks are triggered
        clock.next()
        expect(onTick.callCount).to.equal(1)
      })

      it('does not schedule additional async behavior', () => {
        expect(clock.countTimers()).to.equal(0)
      })
    })

    context('when the given `onError` callback throws an error', () => {
      beforeEach(() => {
        onTick.callsFake(() => {
          throw error
        })

        function onError() {
          throw new Error('Unable to handle error')
        }

        timer = new TimerSync({
          globals,
          onError,
          onTick,
          targetTickIntervalMs
        })

        timer.start()
        clock.next()
      })

      it('stops the timer', () => {
        clock.next() // advance time to ensure any delayed callbacks are triggered
        expect(timer.isRunning).to.be.false
      })

      it('discontinues calling the given `onTick` callback', () => {
        // advance time to ensure any delayed callbacks are triggered
        clock.next()
        expect(onTick.callCount).to.equal(1)
      })

      it('does not schedule additional async behavior', () => {
        expect(clock.countTimers()).to.equal(0)
      })
    })
  })
})
