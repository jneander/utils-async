function timeForAnotherLoop(startTime, iterations) {
  const difference = Math.floor(Date.now()) - startTime
  const average = difference / iterations
  return difference + average < 15
}

export default class BoundedLoop {
  constructor(config = {}) {
    this.config = {...config}
    this.interval = null
  }

  start() {
    if (this.interval == null) {
      const boundedLoop = () => {
        const startTime = Math.floor(Date.now())
        let iterations = 1

        while (this.interval != null && timeForAnotherLoop(startTime, iterations)) {
          this.config.loopFn()
          iterations++
        }
      }

      this.interval = setInterval(() => {
        boundedLoop(this.config.loopFn)
      }, 0)
    }
  }

  stop() {
    if (this.interval != null) {
      clearInterval(this.interval)
      this.interval = null
    }
  }
}
