type ResolveFn<T> = (value: T | PromiseLike<T>) => void
type RejectFn = (reason?: any) => void

export type ControlledPromise<T = void> = {
  promise: Promise<T>
  resolve: ResolveFn<T>
  reject: RejectFn
  settled: boolean
}

/**
 * A function which returns an object containing a promise, the settled state of
 * the promise, and two functions to either resolve or reject the promise.
 *
 * @export
 * @returns {ControlledPromise<T>}
 */
export function createControlledPromise<T = void>(): ControlledPromise<T> {
  const result: ControlledPromise<T> = {settled: false} as ControlledPromise<T>

  result.promise = new Promise<T>((resolve, reject) => {
    result.resolve = value => {
      if (!result.settled) {
        result.settled = true
        resolve(value)
      }
    }

    result.reject = reason => {
      if (!result.settled) {
        result.settled = true
        reject(reason)
      }
    }
  })

  return result
}
