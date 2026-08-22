/**
 * The host: everything that happens to a toast between entering and leaving.
 *
 * Stacking, hover, timers, gestures, the morph and the exit all live here, and
 * none of it knows what rendered the DOM. A framework adapter is left with two
 * jobs. Draw the elements, and tell the host when one appears or disappears:
 *
 *   const host = createToastHost({ queue })
 *   host.bind(element, id)        // ref callback; pass null to unbind
 *   host.enter(element, id, done) // from the enter transition
 *   host.leave(element, id, done) // from the leave transition
 *
 * That is the whole contract, and it is why the Vue adapter is thin.
 */

import { computeStackLayout, stackDirection, stackXPercent, STACK_DEFAULTS } from './stack.js'
import { createTimerSet } from './timers.js'
import { attachGestures, GESTURE_DEFAULTS } from './gestures.js'
import { morphFromOrigin, MORPH_DEFAULTS } from './morph.js'
import { motionOf } from './motion/element.js'
import { Easing, springEase } from './motion/easing.js'
import { prefersReducedMotion } from './env.js'
import { TOAST_POSITIONS } from './queue.js'

export const HOST_DEFAULTS = {
    /** Cards moving back, forward or into place. Long and only decelerating. */
    relayoutDuration: 0.6,
    /** Opening and closing the deck. A real spring, plus a cascade. */
    expandDuration: 0.55,
    expandDamping: 0.55,
    expandStagger: 0.06,
    /** The plain slide-in, used when there is no origin to morph from. */
    enterDuration: 0.5,
    enterDistance: 12,
    enterBlur: 6,
    /** The exit. It continues along the axis a dismiss gesture uses. */
    exitDuration: 0.3,
    exitDistance: 24,
    exitBlur: 4,
    /** ms of grace when the pointer crosses the gap between cards. */
    collapseDelay: 150,
    /** px of travel that fades a dragged toast fully out. */
    fadeDistance: 120,
    stack: STACK_DEFAULTS,
    gestures: GESTURE_DEFAULTS,
    morph: MORPH_DEFAULTS,
}

export function createToastHost({ queue, options = {} }) {
    const config = { ...HOST_DEFAULTS, ...options }
    const stackOptions = { ...STACK_DEFAULTS, ...(options.stack ?? {}) }
    const relayoutEase = Easing.easeOutCubic
    const expandEase = springEase(config.expandDamping)
    const enterEase = springEase(0.58, -3.5)

    const elements = new Map()        // id -> element
    const detachers = new Map()       // id -> gesture cleanup
    const expanded = new Set()        // positions currently open
    const collapseTimers = new Map()  // position -> timeout
    const morphing = new Set()        // ids mid-morph
    const morphControllers = new Map()
    const dragging = new Set()        // ids under an active gesture

    const timers = createTimerSet((id) => queue.dismiss(id))

    // ── Reading the queue ───────────────────────────────────────────────────
    /** Live toasts of a position, newest first, so rank 0 is the front card. */
    function itemsAt(position) {
        return queue.getItems()
            .filter((item) => !item.closing && item.position === position)
            .reverse()
    }

    function positionOf(id) {
        const item = queue.get(id)
        return item && TOAST_POSITIONS.includes(item.position) ? item.position : null
    }

    // ── Layout ──────────────────────────────────────────────────────────────
    /**
     * Puts every card of a position where its rank says it belongs.
     * `instantId` skips the animation for the entering toast, so the
     * morph measures a slot that is already in place.
     */
    function relayout(position, { instantId = null, duration, ease, stagger = 0 } = {}) {
        const items = itemsAt(position)
        const isExpanded = expanded.has(position)
        const heights = items.map((item) => elements.get(item.id)?.offsetHeight ?? 0)
        const slots = computeStackLayout(items.length, {
            position,
            expanded: isExpanded,
            heights,
            options: stackOptions,
        })

        items.forEach((item, rank) => {
            const element = elements.get(item.id)
            const slot = slots[rank]
            if (!element || !slot) return

            element.style.zIndex = String(slot.zIndex)
            element.style.pointerEvents = slot.visible ? 'auto' : 'none'
            // A card the reader cannot see should not be read out either.
            element.setAttribute('aria-hidden', slot.visible ? 'false' : 'true')

            const target = { xPercent: slot.xPercent, y: slot.y, scale: slot.scale, opacity: slot.opacity }
            const motion = motionOf(element)
            if (item.id === instantId || dragging.has(item.id)) {
                // Mid-gesture the finger owns y; only depth follows.
                if (dragging.has(item.id)) motion.set({ xPercent: slot.xPercent, scale: slot.scale })
                else motion.set(target)
                return
            }
            motion.to(target, {
                duration: duration ?? config.relayoutDuration,
                ease: ease ?? relayoutEase,
                delay: stagger * rank,
            })
        })
    }

    // ── Opening and closing the deck ────────────────────────────────────────
    function isBusy(position) {
        return itemsAt(position).some((item) => morphing.has(item.id))
    }

    function expand(position) {
        if (expanded.has(position)) return
        expanded.add(position)
        // Reading them should not cost you the time to read them.
        itemsAt(position).forEach((item) => timers.pause(item.id))
        relayout(position, {
            duration: config.expandDuration,
            ease: expandEase,
            stagger: config.expandStagger,
        })
    }

    function collapse(position) {
        if (!expanded.has(position)) return
        expanded.delete(position)
        itemsAt(position).forEach((item) => timers.resume(item.id))
        relayout(position, {
            duration: config.expandDuration,
            ease: expandEase,
            stagger: config.expandStagger,
        })
    }

    function toggle(position) {
        if (expanded.has(position)) collapse(position)
        else expand(position)
    }

    function onPointerEnter(position, id) {
        // Cards flying under a still cursor fire enter/leave of their own. While
        // anything is mid-morph those events are noise, so the deck stays shut;
        // afterSettle re-checks against a real hit test.
        if (isBusy(position)) return
        clearTimeout(collapseTimers.get(position))
        collapseTimers.delete(position)
        expand(position)
    }

    function onPointerLeave(position, id) {
        if (morphing.has(id)) return
        // Crossing the gap between two cards fires a leave. Waiting a moment
        // means re-entering cancels it, so the deck does not flicker.
        clearTimeout(collapseTimers.get(position))
        collapseTimers.set(position, setTimeout(() => {
            collapseTimers.delete(position)
            collapse(position)
        }, config.collapseDelay))
    }

    /**
     * After a morph settles, decide the hover state from where the cursor
     * ACTUALLY is. `:hover` is a hit test, whereas the enter/leave events fired
     * during the flight are about elements moving, not the pointer. Trusting
     * those is how decks end up opening on their own.
     */
    function afterSettle(position) {
        if (isBusy(position)) return
        const hovered = itemsAt(position).some((item) => elements.get(item.id)?.matches(':hover'))
        if (hovered) expand(position)
    }

    // ── Binding an element ──────────────────────────────────────────────────
    function bind(element, id) {
        if (!element) {
            unbind(id)
            return
        }
        elements.set(id, element)

        const position = positionOf(id) ?? 'top-center'
        const enter = () => onPointerEnter(position, id)
        const leave = () => onPointerLeave(position, id)
        element.addEventListener('mouseenter', enter)
        element.addEventListener('mouseleave', leave)

        const detachGestures = attachGestures(element, {
            isLocked: () => morphing.has(id),
            onStart() {
                dragging.add(id)
                motionOf(element).kill()
                timers.pause(id)
            },
            onMove(offset) {
                const motion = motionOf(element)
                const base = slotYOf(id)
                motion.set({
                    y: base + offset,
                    opacity: Math.max(0, 1 + Math.min(0, offset) / config.fadeDistance),
                })
            },
            onCancel() {
                dragging.delete(id)
                motionOf(element).to({ y: slotYOf(id), opacity: 1 }, {
                    duration: 0.25,
                    ease: Easing.easeOutCubic,
                })
                if (!expanded.has(positionOf(id))) timers.resume(id)
            },
            onDismiss() {
                dragging.delete(id)
                queue.dismiss(id)
            },
            onToggleExpand() {
                dragging.delete(id)
                const currentPosition = positionOf(id)
                motionOf(element).to({ y: slotYOf(id), opacity: 1 }, { duration: 0.25, ease: Easing.easeOutCubic })
                if (currentPosition) toggle(currentPosition)
            },
        }, config.gestures)

        detachers.set(id, () => {
            element.removeEventListener('mouseenter', enter)
            element.removeEventListener('mouseleave', leave)
            detachGestures()
        })
    }

    function unbind(id) {
        detachers.get(id)?.()
        detachers.delete(id)
        elements.delete(id)
        dragging.delete(id)
    }

    /** Where the stack says this toast should sit right now. */
    function slotYOf(id) {
        const position = positionOf(id)
        if (!position) return 0
        const items = itemsAt(position)
        const rank = items.findIndex((item) => item.id === id)
        if (rank < 0) return 0
        const heights = items.map((item) => elements.get(item.id)?.offsetHeight ?? 0)
        const slots = computeStackLayout(items.length, {
            position,
            expanded: expanded.has(position),
            heights,
            options: stackOptions,
        })
        return slots[rank]?.y ?? 0
    }

    // ── Enter ───────────────────────────────────────────────────────────────
    function enter(element, id, done) {
        const item = queue.get(id)
        const position = item?.position ?? 'top-center'
        elements.set(id, element)

        if (item) timers.start(id, item.duration)
        if (expanded.has(position)) timers.pause(id)   // deck open: do not count yet

        // The newcomer lands in slot 0 instantly; everyone else animates back.
        relayout(position, { instantId: id })

        const shell = element.querySelector('[data-sbt-shell]')
        const body = element.querySelector('[data-sbt-body]')
        const origin = item?.origin

        const canMorph = shell && origin instanceof HTMLElement
            && origin.isConnected && !prefersReducedMotion()

        if (!canMorph) {
            slideIn(element, position, done)
            return
        }

        morphing.add(id)
        const controller = morphFromOrigin({
            toastEl: element,
            shellEl: shell,
            bodyEl: body,
            origin,
            originStyle: item.originStyle,
            options: config.morph,
            onSettle() {
                morphing.delete(id)
                morphControllers.delete(id)
                afterSettle(position)
                done?.()
            },
        })
        morphControllers.set(id, controller)
    }

    /** No origin, or reduced motion: come in from the edge and focus. */
    function slideIn(element, position, done) {
        const direction = stackDirection(position)
        const motion = motionOf(element)
        const restY = motion.get('y')
        motion.set({
            xPercent: stackXPercent(position),
            y: restY - config.enterDistance * direction,
            opacity: 0,
            blur: config.enterBlur,
        })
        motion.to({ y: restY, opacity: 1, blur: 0 }, {
            duration: config.enterDuration,
            ease: enterEase,
            onComplete: done,
        })
    }

    // ── Leave ───────────────────────────────────────────────────────────────
    function leave(element, id, done) {
        // Dismissed mid-morph: settle it first so nothing is left frozen.
        morphControllers.get(id)?.settle()

        const item = queue.get(id)
        const position = item?.position ?? 'top-center'
        const motion = motionOf(element)
        motion.kill()

        // A card leaving keeps the depth of its rank: one from the back should
        // fade out BEHIND the front card, not jump over it. Only the front card
        // (rank 0, so z === baseZ) stays on top while it goes.
        if (Number(element.style.zIndex) === stackOptions.baseZ) {
            element.style.zIndex = String(stackOptions.baseZ + 1)
        }

        // Continue from wherever it is. If it was dragged, it carries on rather
        // than snapping back to its slot first.
        motion.to({
            y: motion.get('y') - config.exitDistance,
            opacity: 0,
            blur: config.exitBlur,
        }, {
            duration: config.exitDuration,
            ease: Easing.easeInCubic,
            onComplete() {
                timers.clear(id)
                unbind(id)
                queue.remove(id)
                done?.()
            },
        })

        relayout(position)   // the survivors move up a rank
    }

    // ── Timer control from outside (the close button, custom content) ───────
    function destroy() {
        timers.clearAll()
        for (const timer of collapseTimers.values()) clearTimeout(timer)
        collapseTimers.clear()
        for (const id of [...detachers.keys()]) unbind(id)
        for (const controller of morphControllers.values()) controller.settle()
        morphControllers.clear()
        morphing.clear()
        expanded.clear()
    }

    return {
        bind,
        unbind,
        enter,
        leave,
        relayout,
        expand,
        collapse,
        pause: (id) => timers.pause(id),
        resume: (id) => timers.resume(id),
        destroy,
        isExpanded: (position) => expanded.has(position),
    }
}
