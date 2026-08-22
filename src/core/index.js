/**
 * The framework-free core.
 *
 * Everything here runs on plain DOM and plain numbers. The Vue adapter in
 * `src/vue` is built entirely out of these pieces, and any other adapter would
 * be too, which is the point of keeping the boundary honest.
 *
 *   import { createToastQueue, createToastHost } from 'super-beautiful-toast/core'
 */

export { createToastQueue, toastQueue, TOAST_POSITIONS, DEFAULT_SETTINGS } from './queue.js'
export { createToastHost, HOST_DEFAULTS } from './host.js'
export { computeStackLayout, stackDirection, stackXPercent, STACK_DEFAULTS } from './stack.js'
export { morphFromOrigin, hideOrigin, restoreOrigin, MORPH_DEFAULTS } from './morph.js'
export { attachGestures, GESTURE_DEFAULTS } from './gestures.js'
export { createTimerSet } from './timers.js'
export { isBrowser, prefersReducedMotion } from './env.js'

export { createMotion, spring, easing } from './motion/engine.js'
export { Easing, springEase, springEasePath } from './motion/easing.js'
export { motionOf, killMotion } from './motion/element.js'
export { splitChars } from './motion/split.js'
