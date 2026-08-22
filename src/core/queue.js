/**
 * The queue: what toasts exist right now. No framework, no DOM.
 *
 * State is treated as immutable. Every change replaces the array AND the item
 * that changed. That is the whole reason a Vue `shallowRef` and a React
 * `useSyncExternalStore` can both sit on top of this without either one needing
 * a deep reactive proxy.
 *
 * The queue knows nothing about animation. It hands out ids and holds the
 * facts; the host decides how any of it looks.
 */

export const TOAST_POSITIONS = [
    'top-left', 'top-center', 'top-right',
    'center-left', 'center-right',
    'bottom-left', 'bottom-center', 'bottom-right',
]

export const DEFAULT_SETTINGS = {
    position: 'top-center',
    duration: 4000,
    /** Live toasts per position. Older ones leave to make room. 0 = no limit. */
    max: 5,
}

/** Icon used when the caller does not pass one. `undefined` means "use this". */
const VARIANT_ICON = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'info',
    neutral: null,
}

export function createToastQueue(settings = {}) {
    const config = { ...DEFAULT_SETTINGS, ...settings }
    const listeners = new Set()
    let items = []
    let nextId = 0

    function emit() {
        for (const listener of [...listeners]) listener(items)
    }

    function replace(id, patch) {
        let changed = false
        items = items.map((item) => {
            if (item.id !== id) return item
            changed = true
            return { ...item, ...patch }
        })
        if (changed) emit()
    }

    /**
     * @param {object} options
     * @param {string} [options.message]        the text
     * @param {string|null} [options.icon]      icon name; null for none
     * @param {string} [options.variant]        success | error | info | neutral, or your own
     * @param {string} [options.position]       one of TOAST_POSITIONS
     * @param {number} [options.duration]       ms; 0 never auto-dismisses
     * @param {HTMLElement} [options.origin]    the button that becomes the toast
     * @param {object} [options.originStyle]    { background, boxShadow, borderRadius } override
     * @param {any} [options.component]         custom content instead of the default
     * @param {object} [options.props]          props for that component
     * @param {{bg: string, fg: string}} [options.tint]  one-off colours
     * @param {boolean} [options.closable]      show a close button
     * @param {string} [options.key]            collapses repeats: same key refreshes the live one
     * @returns {number} the toast id
     */
    function show(options = {}) {
        const {
            message = '',
            icon,
            variant = 'neutral',
            position = config.position,
            duration = config.duration,
            origin = options.originElement ?? null,
            originStyle = options.originElementProps ?? null,
            component = null,
            props = {},
            tint = null,
            closable,
            key = null,
        } = options

        const resolvedPosition = TOAST_POSITIONS.includes(position) ? position : config.position
        const resolvedIcon = icon !== undefined ? icon : (VARIANT_ICON[variant] ?? null)
        // A toast that never leaves on its own must be closable, or a keyboard
        // user has no way out of it.
        const resolvedClosable = closable !== undefined ? closable : duration === 0

        // Same key as a live toast: refresh it in place instead of stacking a
        // second copy. `restartedAt` is what tells the host to re-arm the timer.
        if (key) {
            const existing = items.find((item) => item.key === key && !item.closing)
            if (existing) {
                replace(existing.id, {
                    message,
                    icon: resolvedIcon,
                    variant,
                    duration,
                    tint,
                    props,
                    restartedAt: (existing.restartedAt ?? 0) + 1,
                })
                return existing.id
            }
        }

        const id = ++nextId
        items = [...items, {
            id,
            key,
            message,
            icon: resolvedIcon,
            variant,
            position: resolvedPosition,
            duration,
            origin: origin instanceof Object ? origin : null,
            originStyle,
            component,
            props,
            tint,
            closable: resolvedClosable,
            closing: false,
            restartedAt: 0,
        }]
        emit()

        enforceLimit(resolvedPosition)
        return id
    }

    /** Oldest live toasts of a position leave once the limit is exceeded. */
    function enforceLimit(position) {
        if (!config.max || config.max <= 0) return
        const live = items.filter((item) => item.position === position && !item.closing)
        const excess = live.length - config.max
        for (let i = 0; i < excess; i += 1) dismiss(live[i].id)
    }

    /** Marks a toast as leaving. The host animates it out and calls remove(). */
    function dismiss(id) {
        replace(id, { closing: true })
    }

    function dismissAll() {
        const live = items.filter((item) => !item.closing)
        if (!live.length) return
        items = items.map((item) => (item.closing ? item : { ...item, closing: true }))
        emit()
    }

    /** Drops a toast for good. Called by the host when its exit finishes. */
    function remove(id) {
        const next = items.filter((item) => item.id !== id)
        if (next.length === items.length) return
        items = next
        emit()
    }

    function get(id) {
        return items.find((item) => item.id === id) ?? null
    }

    function subscribe(listener) {
        listeners.add(listener)
        return () => listeners.delete(listener)
    }

    /** Changes the defaults for every toast shown from now on. */
    function configure(patch = {}) {
        Object.assign(config, patch)
    }

    return {
        show,
        dismiss,
        dismissAll,
        remove,
        get,
        subscribe,
        configure,
        getItems: () => items,
        getSettings: () => ({ ...config }),
    }
}

/** The queue everyone shares unless they build their own. */
export const toastQueue = createToastQueue()
