const originalMocha = {
  describe: window.describe,
  describeOnly: window.describe.only,
  describeSkip: window.describe.skip
}

function wrapDescribeFn(describeFn) {
  return function(originalTitle, specFn) {
    const [innerTitle, ...titles] = originalTitle.split(/\s+>\s+/).reverse()
    const firstDescribe = () => describeFn(innerTitle, specFn)

    const result = titles.reduce(function (currentSpecFn, currentTitle) {
      return function() {
        return describeFn(currentTitle, currentSpecFn)
      }
    }, firstDescribe)

    return result()
  }
}

window.describe = wrapDescribeFn(originalMocha.describe)
window.describe.only = wrapDescribeFn(originalMocha.describeOnly)
window.describe.skip = wrapDescribeFn(originalMocha.describeSkip)
