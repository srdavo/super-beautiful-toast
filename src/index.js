/**
 * super-beautiful-toast. Vue 3 entry point.
 *
 *   import { ToastHost, toast } from 'super-beautiful-toast'
 *   import 'super-beautiful-toast/style.css'
 *
 * The framework-free engine is a separate entry:
 *
 *   import { createToastQueue, createToastHost } from 'super-beautiful-toast/core'
 */

export { default as ToastHost } from './vue/ToastHost.vue'
export { default as ToastMessage } from './vue/ToastMessage.vue'
export { default as ToastIcon } from './vue/ToastIcon.vue'
export { useToast, toast, createToastApi } from './vue/useToast.js'
export { SuperBeautifulToast, SuperBeautifulToast as default } from './vue/plugin.js'

// Useful without reaching into /core: build a private queue, read the position
// list, retune the defaults.
export { createToastQueue, toastQueue, TOAST_POSITIONS, DEFAULT_SETTINGS } from './core/queue.js'
export { HOST_DEFAULTS } from './core/host.js'
export { STACK_DEFAULTS } from './core/stack.js'
export { MORPH_DEFAULTS } from './core/morph.js'
export { GESTURE_DEFAULTS } from './core/gestures.js'
