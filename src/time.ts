export function getCurrentFrameTime(): number {
  return document?.timeline?.currentTime ?? performance.now()
}
