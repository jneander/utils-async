export interface Globals {
  clearInterval: typeof clearInterval
  clearTimeout: typeof clearTimeout
  document?: Pick<Document, 'timeline'>
  performance: Pick<Performance, 'now'>
  requestAnimationFrame: typeof requestAnimationFrame | undefined
  setInterval: typeof setInterval
  setTimeout: typeof setTimeout
}
