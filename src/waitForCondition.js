const DEFAULT_INTERVAL = 0
const DEFAULT_TIMEOUT = 1000 // ms

const GLOBALS = {
  clearInterval: window.clearInterval.bind(window),
  clearTimeout: window.clearTimeout.bind(window),
  setInterval: window.setInterval.bind(window),
  setTimeout: window.setInterval.bind(window)
}

export default async function waitForCondition(conditionFn, options = {}) {
  return new Promise((resolve, reject) => {
    const intervalDuration = options.interval || DEFAULT_INTERVAL
    const timeoutDuration = options.timeout || DEFAULT_TIMEOUT
    const globals = options.globals || GLOBALS

    let timeoutId

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
