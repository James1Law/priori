/**
 * Detect whether the current device supports touch input.
 * Used to decide between interactive desktop Gantt and view-only mobile Gantt.
 */
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}
