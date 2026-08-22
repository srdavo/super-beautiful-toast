/**
 * Optional plugin. It registers <ToastHost> globally and sets the defaults, for
 * people who would rather not import the component in their root file:
 *
 *   app.use(SuperBeautifulToast, { defaults: { position: 'bottom-right' } })
 *
 * Everything it does can be done by hand; nothing else in the package depends
 * on it having been installed.
 */

import ToastHost from './ToastHost.vue'
import { toast } from './useToast.js'
import { toastQueue } from '../core/queue.js'

export const SuperBeautifulToast = {
    install(app, options = {}) {
        app.component(options.componentName ?? 'ToastHost', ToastHost)
        if (options.defaults) toastQueue.configure(options.defaults)
        app.config.globalProperties.$toast = toast
    },
}
