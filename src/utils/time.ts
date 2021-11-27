import {Globals} from './globals'

export interface GetCurrentFrameTimeParameters extends Pick<Globals, 'document' | 'performance'> {}

/**
 * A function which returns the current time. When in a browser environment, the
 * `currentTime` of the document's timeline will be used, as "it'll better sync
 * animations queued in the same frame." If this isn't supported,
 * `performance.now()` will be used.
 *
 * @export
 * @param {Performance} globals.performance The `Performance` object of the
 * current environment.
 * @param {Document} [globals.document] A document, specifically one with a
 * `Timeline` having the `currentTime`. This is typically the current document
 * in a browser environment.
 * @returns {number} The current time as a number.
 */
export function getCurrentFrameTime(globals: GetCurrentFrameTimeParameters): number {
  return globals.document?.timeline?.currentTime ?? globals.performance.now()
}
