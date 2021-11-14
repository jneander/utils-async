const DEFAULT_INTERVAL = 0
const DEFAULT_TIMEOUT = 1000 // ms

const GLOBALS = {
  clearInterval: globalThis.clearInterval.bind(globalThis),
  clearTimeout: globalThis.clearTimeout.bind(globalThis),
  setInterval: globalThis.setInterval.bind(globalThis),
  setTimeout: globalThis.setInterval.bind(globalThis)
}

export type WaitForConditionOptions = {
  globals?: {
    clearInterval: typeof clearInterval
    clearTimeout: typeof clearTimeout
    setInterval: typeof setInterval
    setTimeout: typeof setTimeout
  }

  interval?: number
  timeout?: number
}

export default async function waitForCondition(
  conditionFn: () => boolean,
  options: WaitForConditionOptions = {}
) {
  return new Promise((resolve, reject) => {
    const intervalDuration = options.interval || DEFAULT_INTERVAL
    const timeoutDuration = options.timeout || DEFAULT_TIMEOUT
    const globals = options.globals || GLOBALS

    let timeoutId: ReturnType<typeof setTimeout>

    const intervalFn = () => {
      const result = conditionFn()
      if (result) {
        globals.clearInterval(intervalId)
        globals.clearTimeout(timeoutId)
        resolve(result)
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
