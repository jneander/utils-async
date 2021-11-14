function timeForAnotherLoop(startTime: number, iterations: number): boolean {
  const difference = Math.floor(Date.now()) - startTime
  const average = difference / iterations
  return difference + average < 15
}

type BoundedLoopConfig = {
  loopFn(): void
}

export default class BoundedLoop {
  private loopFn: BoundedLoopConfig['loopFn']
  private interval: number | null

  constructor({loopFn}: BoundedLoopConfig) {
    this.loopFn = loopFn

    this.interval = null
  }

  start(): void {
    if (this.interval == null) {
      const boundedLoop = () => {
        const startTime = Math.floor(Date.now())
        let iterations = 1

        while (this.interval != null && timeForAnotherLoop(startTime, iterations)) {
          this.loopFn()
          iterations++
        }
      }

      this.interval = setInterval(() => {
        boundedLoop()
      }, 0)
    }
  }

  stop(): void {
    if (this.interval != null) {
      clearInterval(this.interval)
      this.interval = null
    }
  }
}
