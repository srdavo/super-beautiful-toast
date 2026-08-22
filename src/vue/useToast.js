/**
 * The ergonomic surface. Nine out of ten toasts are one line of fire-and-forget
 * text, so that is what this optimises for:
 *
 *   import { toast } from 'super-beautiful-toast'
 *   toast.success('Saved')
 *   toast.error('Could not save')
 *
 * Inside a component `useToast()` reads the same way, and both return the id so
 * a toast can be dismissed by hand later.
 *
 * For the morph, hand it the button that triggered the action:
 *
 *   toast.success('Saved', { origin: event.currentTarget })
 */

import { toastQueue } from '../core/queue.js'

export function createToastApi(queue) {
    const withVariant = (variant) => (message, options = {}) =>
        queue.show({ message, variant, ...options })

    return {
        show: (options) => queue.show(options),
        success: withVariant('success'),
        error: withVariant('error'),
        warning: withVariant('warning'),
        info: withVariant('info'),
        neutral: withVariant('neutral'),
        dismiss: (id) => queue.dismiss(id),
        dismissAll: () => queue.dismissAll(),
        /** Change the defaults (position, duration, max) for everything after this. */
        configure: (settings) => queue.configure(settings),
        queue,
    }
}

/** @param {object} [queue] a queue of your own; defaults to the shared one. */
export function useToast(queue = toastQueue) {
    return createToastApi(queue)
}

/** Ready to use outside components: stores, services, plain modules. */
export const toast = createToastApi(toastQueue)
