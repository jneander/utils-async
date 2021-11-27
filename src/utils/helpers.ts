function isUnsafeNumber(value: number | undefined): boolean {
  return value == null || value < 0 || !Number.isFinite(value)
}

/**
 * A function which takes a number, representing a duration in milliseconds, and
 * either returns a timer-safe number derived from the given value or throws an
 * error. A timer-safe number is a positive, finite integer.
 *
 * @export
 * @param {number} ms The intended duration, in milliseconds.
 * @returns {number} The given duration, rounded to the nearest millisecond.
 */
export function ensureSafeDelayMs(ms: number): number {
  if (isUnsafeNumber(ms)) {
    throw new Error('Delay duration must be a positive, finite number.')
  }

  return Math.round(ms)
}

/**
 * A function which takes a number, representing a duration in milliseconds, and
 * either returns a timer-safe number derived from the given value or the given
 * `defaultValue`. A timer-safe number is a positive, finite integer.
 *
 * @export
 * @param {(number | undefined)} ms The intended duration, in milliseconds. When
 * null-ish, the given `defaultValue` will be returned.
 * @param {number} defaultValue
 * @returns {number} The given duration, rounded to the nearest millisecond.
 */
export function safeDelayMs(ms: number | undefined, defaultValue: number): number {
  if (isUnsafeNumber(ms)) {
    return defaultValue
  }

  return Math.round(ms!)
}
