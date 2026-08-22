/**
 * The morph: the button that triggered the action becomes the toast.
 *
 * The trick, stated plainly: the box you watch grow never distorts, and the
 * thing that WOULD distort, the content, is hidden and blurred until it has
 * already arrived.
 *
 * Frame 0 the skin IS the button: same size, same position, same background,
 * same radius. Then two independent springs carry x and y while width, height
 * and radius ease, and the content pulls focus (scale 2 → 1, blur 8 → 0).
 *
 * Why it reads as expensive rather than as a box being resized: it is not a
 * pre-baked curve, it is a simulation. Two SEPARATE springs on x and y plus an
 * initial kick of equal magnitude on both axes over unequal distances bends the
 * 2D path into an arc. Launched from rest it would travel in a straight line.
 * And the spring is underdamped, so it overshoots and settles. Size lands fast
 * (~0.32s) while position keeps springing for about a second, which reads as
 * "it arrived and is settling in" instead of "a box grew".
 *
 * Colour and shadow are handed to CSS transitions rather than animated frame by
 * frame: the browser interpolates them natively, and this way the package needs
 * no colour parser.
 */

import { createMotion, spring, easing } from './motion/engine.js'
import { Easing } from './motion/easing.js'

export const MORPH_DEFAULTS = {
    /** The travel. Lower damping bounces more; velocity is the initial kick. */
    stiffness: 144,
    damping: 14,
    velocity: 2400,
    /** Seconds. Size lands well before the travel does, which is the point. */
    sizeDuration: 0.32,
    radiusDuration: 0.7,
    contentDuration: 0.32,
    /** Seconds. Colour and shadow, via CSS transitions. */
    colorDuration: 0.4,
    colorDelay: 0.15,
    shadowDuration: 0.6,
    shadowDelay: 0.05,
    /** How out of focus the content starts. */
    contentScale: 2,
    contentBlur: 8,
    /** ms. Safety net: the travel settles on its own well before this. */
    maxDuration: 1100,
}

/**
 * Fades the origin button out as the toast is born (the skin covers it anyway)
 * and brings it back once the toast has landed. Agreed behaviour: in a form,
 * the button comes BACK. It is not left hidden.
 */
export function hideOrigin(element) {
    if (!(element instanceof HTMLElement)) return
    element.style.transition = 'opacity 160ms ease'
    element.style.opacity = '0'
    element.style.pointerEvents = 'none'
}

export function restoreOrigin(element) {
    if (!(element instanceof HTMLElement)) return
    element.style.transition = 'opacity 300ms ease'
    element.style.opacity = ''
    element.style.pointerEvents = ''
    setTimeout(() => { element.style.transition = '' }, 320)
}

/**
 * @param {object} params
 * @param {HTMLElement} params.toastEl   the slot; its transform belongs to the stack
 * @param {HTMLElement} params.shellEl   the skin; this is what travels
 * @param {HTMLElement|null} params.bodyEl
 * @param {HTMLElement} params.origin    the button
 * @param {{background?: string, boxShadow?: string, borderRadius?: string}} [params.originStyle]
 * @param {object} [params.options]
 * @param {() => void} params.onSettle
 * @returns {{ settle: () => void }} settle() is idempotent and safe to call early
 */
export function morphFromOrigin({ toastEl, shellEl, bodyEl, origin, originStyle, options = {}, onSettle }) {
    const config = { ...MORPH_DEFAULTS, ...options }

    const shellRect = shellEl.getBoundingClientRect()
    const originRect = origin.getBoundingClientRect()
    const originComputed = getComputedStyle(origin)
    const from = {
        background: originStyle?.background ?? originComputed.background,
        boxShadow: originStyle?.boxShadow ?? originComputed.boxShadow,
        radius: parseFloat(originStyle?.borderRadius ?? originComputed.borderRadius) || 0,
    }

    const shellComputed = getComputedStyle(shellEl)
    const toBackground = shellComputed.background
    const toShadow = shellComputed.boxShadow
    const toRadius = parseFloat(shellComputed.borderRadius) || 16

    // A shadow will not interpolate from `none`, which is what a button usually
    // has, so it used to pop into existence on arrival. Starting from a
    // transparent CAST of the toast's own shadow, same offset and blur with
    // alpha 0. That gives the browser two comparable values, and it fades in
    // during the travel.
    const fromShadow = (toShadow && toShadow !== 'none')
        ? toShadow.replace(/rgba?\([^)]*\)/g, 'rgba(0,0,0,0)')
        : toShadow

    // Freeze the slot at its resting size, and the body at its final width, before
    // the skin shrinks down to the button. Without the second one the text
    // rewraps mid-flight (the button is usually narrower) and the geometry jumps
    // at the end.
    toastEl.style.width = `${shellRect.width}px`
    toastEl.style.height = `${shellRect.height}px`
    if (bodyEl) {
        bodyEl.style.width = `${bodyEl.getBoundingClientRect().width}px`
        bodyEl.style.flex = '0 0 auto'
    }

    const fromX = originRect.left - shellRect.left
    const fromY = originRect.top - shellRect.top

    // Kick toward the middle of the screen, so the arc bends inward.
    const launchX = (originRect.left + originRect.width / 2) < window.innerWidth / 2 ? 1 : -1
    const launchY = (originRect.top + originRect.height / 2) < window.innerHeight / 2 ? 1 : -1

    // Frame 0: the skin IS the button. Absolute and anchored to its own toast,
    // NOT fixed. The toast carries a transform, which makes it the containing
    // block, and a fixed skin teleports the moment the stack shifts.
    const shellStyle = shellEl.style
    shellStyle.position = 'absolute'
    shellStyle.top = '0px'
    shellStyle.left = '0px'
    shellStyle.width = `${originRect.width}px`
    shellStyle.height = `${originRect.height}px`
    shellStyle.borderRadius = `${from.radius}px`
    shellStyle.background = from.background
    shellStyle.boxShadow = fromShadow
    shellStyle.transform = `translate(${fromX}px, ${fromY}px)`
    // No CSS transition on transform: the engine writes it every frame and a
    // transition would drag behind it and read as lag.
    shellStyle.transition = 'none'

    if (bodyEl) {
        bodyEl.style.transform = `scale(${config.contentScale})`
        bodyEl.style.transformOrigin = 'center center'
        bodyEl.style.filter = `blur(${config.contentBlur}px)`
        bodyEl.style.opacity = '0'
    }

    hideOrigin(origin)

    // Hand colour and shadow to the browser. The reflow is what makes the new
    // values a transition instead of a jump.
    void shellEl.offsetWidth
    shellStyle.transition = [
        `background ${config.colorDuration}s ease-out ${config.colorDelay}s`,
        `box-shadow ${config.shadowDuration}s ease-out ${config.shadowDelay}s`,
    ].join(', ')
    shellStyle.background = toBackground
    shellStyle.boxShadow = toShadow
    if (bodyEl) {
        bodyEl.style.transition = `opacity ${config.colorDuration}s ease-out ${config.colorDelay}s`
        bodyEl.style.opacity = '1'
    }

    let x = fromX
    let y = fromY
    const motion = createMotion(
        {
            x: fromX,
            y: fromY,
            width: originRect.width,
            height: originRect.height,
            radius: from.radius,
            contentScale: config.contentScale,
            contentBlur: config.contentBlur,
        },
        {
            onChange(key, value) {
                switch (key) {
                    case 'x': x = value; shellStyle.transform = `translate(${x}px, ${y}px)`; break
                    case 'y': y = value; shellStyle.transform = `translate(${x}px, ${y}px)`; break
                    case 'width': shellStyle.width = `${value}px`; break
                    case 'height': shellStyle.height = `${value}px`; break
                    case 'radius': shellStyle.borderRadius = `${value}px`; break
                    case 'contentScale': if (bodyEl) bodyEl.style.transform = `scale(${value})`; break
                    case 'contentBlur': if (bodyEl) bodyEl.style.filter = `blur(${value}px)`; break
                }
            },
        },
    )

    const travel = { stiffness: config.stiffness, damping: config.damping, velocity: config.velocity }
    motion.animate(
        {
            x: 0,
            y: 0,
            width: shellRect.width,
            height: shellRect.height,
            radius: toRadius,
            contentScale: 1,
            contentBlur: 0,
        },
        {
            x: spring({ ...travel, direction: launchX }),
            y: spring({ ...travel, direction: launchY }),
            width: easing({ duration: config.sizeDuration, ease: Easing.bezier(0.8, 0.3, 0.5, 0.8) }),
            height: easing({ duration: config.sizeDuration, ease: Easing.bezier(0.8, 0.3, 0.5, 0.8) }),
            radius: easing({ duration: config.radiusDuration, ease: Easing.easeOut }),
            contentScale: easing({ duration: config.contentDuration, ease: Easing.easeOut }),
            contentBlur: easing({ duration: config.contentDuration, ease: Easing.easeOut }),
        },
    )

    let settled = false
    const safety = setTimeout(() => settle(), config.maxDuration)

    /** Idempotent: the safety net calls it, and so does an early dismiss. */
    function settle() {
        if (settled) return
        settled = true
        clearTimeout(safety)
        motion.stop()

        // Hand every frozen property back to the stylesheet.
        for (const property of ['position', 'top', 'left', 'width', 'height', 'borderRadius',
            'background', 'boxShadow', 'transform', 'transition']) {
            shellStyle[property] = ''
        }
        toastEl.style.width = ''
        toastEl.style.height = ''
        if (bodyEl) {
            for (const property of ['transform', 'transformOrigin', 'filter', 'opacity', 'width', 'flex', 'transition']) {
                bodyEl.style[property] = ''
            }
        }
        restoreOrigin(origin)
        onSettle?.()
    }

    return { settle }
}
