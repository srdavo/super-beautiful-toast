/**
 * Dismiss gestures: drag up, scroll up, and on touch drag down to open the deck.
 *
 * Attaches its own listeners to one toast element and reports intent through
 * callbacks and never moves anything itself. The host owns the motion, this
 * file only reads the gesture.
 */

export const GESTURE_DEFAULTS = {
    /** px dragged up before letting go dismisses */
    swipeThreshold: 48,
    /** accumulated wheel px before letting go dismisses */
    wheelThreshold: 80,
    /** px dragged down (touch only) to toggle the deck open */
    expandDragThreshold: 24,
    /** how much of a downward drag is shown back to the finger */
    downwardResistance: 0.15,
    /** px of travel that fades a toast fully out */
    fadeDistance: 120,
    /** ms of quiet that ends a wheel gesture, since wheel has no "release" */
    wheelEndDelay: 140,
}

const INTERACTIVE = 'button, a, input, textarea, select, [role="button"]'

/**
 * @param {HTMLElement} element
 * @param {object} handlers
 * @param {() => boolean} handlers.isLocked      true while the toast must ignore gestures
 * @param {() => void} handlers.onStart          a gesture began (pause timers)
 * @param {(offset: number) => void} handlers.onMove   current offset, negative = upward
 * @param {() => void} handlers.onCancel         gesture ended without crossing a threshold
 * @param {() => void} handlers.onDismiss
 * @param {() => void} handlers.onToggleExpand
 * @param {object} [options]
 * @returns {() => void} cleanup
 */
export function attachGestures(element, handlers, options = {}) {
    const config = { ...GESTURE_DEFAULTS, ...options }
    let drag = null
    let wheel = null

    // ── Drag ────────────────────────────────────────────────────────────────
    function onPointerDown(event) {
        if (event.button != null && event.button !== 0) return
        if (handlers.isLocked()) return
        // Let real controls inside the toast do their job.
        if (event.target.closest?.(INTERACTIVE)) return
        drag = { startY: event.clientY, pointerType: event.pointerType }
        element.setPointerCapture?.(event.pointerId)
        handlers.onStart()
    }

    function onPointerMove(event) {
        if (!drag) return
        const raw = event.clientY - drag.startY
        // Upward is a real dismiss preview. Downward only reads back on touch,
        // damped, as a hint that letting go opens the deck.
        const offset = raw < 0
            ? raw
            : (drag.pointerType === 'touch' ? raw * config.downwardResistance : 0)
        handlers.onMove(offset)
    }

    function onPointerUp(event) {
        if (!drag) return
        const { pointerType, startY } = drag
        drag = null
        const delta = event.clientY - startY

        if (delta < -config.swipeThreshold) {
            handlers.onDismiss()
            return
        }
        // No hover on touch, so a downward drag is how the deck opens there.
        if (pointerType === 'touch' && delta > config.expandDragThreshold) {
            handlers.onToggleExpand()
            return
        }
        handlers.onCancel()
    }

    // ── Wheel / trackpad ────────────────────────────────────────────────────
    // Two quirks drive this. Wheel has no release, so the end of the gesture is
    // a debounce. And wheel fires at whatever sits under the cursor, so once a
    // gesture starts we capture on window and keep feeding the SAME toast,
    // otherwise dragging it upward slides it out from under the pointer and the
    // rest of the scroll leaks to the page.
    function applyWheel(event) {
        if (!wheel) return
        const delta = event.deltaMode === 1 ? event.deltaY * 16
            : event.deltaMode === 2 ? event.deltaY * window.innerHeight
            : event.deltaY
        // Natural scrolling: pushing content up gives deltaY > 0, which should
        // carry the toast away. Upward only.
        wheel.offset = Math.min(0, wheel.offset - delta)
        handlers.onMove(wheel.offset)
        clearTimeout(wheel.endTimer)
        wheel.endTimer = setTimeout(endWheel, config.wheelEndDelay)
    }

    function onWindowWheel(event) {
        if (!wheel) return
        event.preventDefault()
        applyWheel(event)
    }

    function onWheel(event) {
        if (handlers.isLocked() || wheel || drag) return
        event.preventDefault()
        wheel = { offset: 0, endTimer: 0 }
        window.addEventListener('wheel', onWindowWheel, { passive: false, capture: true })
        handlers.onStart()
        applyWheel(event)
    }

    function endWheel() {
        if (!wheel) return
        const { offset, endTimer } = wheel
        window.removeEventListener('wheel', onWindowWheel, { capture: true })
        clearTimeout(endTimer)
        wheel = null
        if (offset < -config.wheelThreshold) handlers.onDismiss()
        else handlers.onCancel()
    }

    element.addEventListener('pointerdown', onPointerDown)
    element.addEventListener('pointermove', onPointerMove)
    element.addEventListener('pointerup', onPointerUp)
    element.addEventListener('pointercancel', onPointerUp)
    element.addEventListener('wheel', onWheel, { passive: false })

    return function cleanup() {
        element.removeEventListener('pointerdown', onPointerDown)
        element.removeEventListener('pointermove', onPointerMove)
        element.removeEventListener('pointerup', onPointerUp)
        element.removeEventListener('pointercancel', onPointerUp)
        element.removeEventListener('wheel', onWheel)
        if (wheel) {
            window.removeEventListener('wheel', onWindowWheel, { capture: true })
            clearTimeout(wheel.endTimer)
            wheel = null
        }
        drag = null
    }
}
