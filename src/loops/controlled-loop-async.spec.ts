import {expect} from 'chai'
import {SinonStub, stub} from 'sinon'

import {delayMs} from '../delays'
import {ControlledPromise, createControlledPromise} from '../utils'
import {ControlledLoopAsync} from './controlled-loop-async'

describe('loops > ControlledLoopAsync', () => {
  let controlledPromise: ControlledPromise
  let loopFn: SinonStub
  let loop: ControlledLoopAsync

  beforeEach(() => {
    loopFn = stub().callsFake(() => {
      controlledPromise = createControlledPromise()
      return controlledPromise.promise
    })

    loop = new ControlledLoopAsync({
      loopFn
    })
  })

  afterEach(() => {
    loop.stop()
    controlledPromise?.resolve()
  })

  it('does not call the given `loopFn` callback function when not started', async () => {
    expect(loopFn.callCount).to.equal(0)
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

  describe('#start()', () => {
    it('begins the loop', () => {
      loop.start()
      expect(loopFn.callCount).to.equal(1)
    })
  })

  describe('looping', () => {
    it('calls the given `loopFn` callback repeatedly', async () => {
      loop.start() // first call of loopFn
      controlledPromise.resolve()
      await delayMs(1) // allow loop to continue (second call of loopFn)
      controlledPromise.resolve()
      await delayMs(1) // allow loop to continue (third call of loopFn)
      expect(loopFn.callCount).to.equal(3)
    })
  })

  describe('#stop()', () => {
    it('stops the loop', async () => {
      loop.start() // first call of loopFn
      controlledPromise.resolve()
      await delayMs(1) // allow loop to continue (second call of loopFn)
      controlledPromise.resolve()
      loop.stop()
      await delayMs(1) // would allow loop to continue if not stopped
      expect(loopFn.callCount).to.equal(2)
    })
  })

  context('when the `loopFn` throws an error', () => {
    const error = new Error('FAIL')

    beforeEach(() => {
      loopFn.callsFake(() => {
        return Promise.reject(error)
      })
    })

    it('stops the loop', async () => {
      loop.start()
      await delayMs(1) // advance time to ensure any delays callbacks are triggered
      expect(loop.isRunning).to.be.false
    })

    it('discontinues calling the given `loopFn` callback', async () => {
      loop.start()
      await delayMs(1) // advance time to ensure any delays callbacks are triggered
      expect(loopFn.callCount).to.equal(1)
    })

    context('when given an `onError` callback', () => {
      let onError: SinonStub

      beforeEach(() => {
        onError = stub()

        loop = new ControlledLoopAsync({
          loopFn,
          onError
        })
      })

      it('calls the given `onError` callback', async () => {
        loop.start()
        await delayMs(1) // advance time to ensure any delays callbacks are triggered
        expect(onError.callCount).to.equal(1)
      })

      it('includes the thrown error when calling the `onError` callback', async () => {
        loop.start()
        await delayMs(1) // advance time to ensure any delays callbacks are triggered
        const [receivedError] = onError.getCall(0).args
        expect(receivedError).to.equal(error)
      })
    })

    context('when the given `onError` callback throws an error', () => {
      beforeEach(() => {
        function onError() {
          throw new Error('Unable to handle error')
        }

        loop = new ControlledLoopAsync({
          loopFn,
          onError
        })
      })

      it('stops the loop', async () => {
        loop.start()
        await delayMs(1) // advance time to ensure any delays callbacks are triggered
        expect(loop.isRunning).to.be.false
      })

      it('discontinues calling the given `loopFn` callback', async () => {
        loop.start()
        await delayMs(1) // advance time to ensure any delays callbacks are triggered
        expect(loopFn.callCount).to.equal(1)
      })
    })
  })
})
