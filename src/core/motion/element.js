/**
 * Per-element motion: transform, opacity and blur, animated or set outright.
 *
 * This is the piece that replaces a general purpose tween library. It is small
 * because it only ever animates six numbers, and it is reliable because it
 * NEVER reads them back from the DOM: the current transform is kept in memory
 * and the whole string is rewritten from that state every frame. Parsing a
 * matrix out of `getComputedStyle` to find out where an element is mid flight
 * is where this kind of code usually starts lying.
 *
 *   const m = motionOf(el)
 *   m.set({ y: 0, scale: 1 })
 *   m.to({ y: 40 }, { duration: 0.6, ease: Easing.easeOutCubic })
 *   m.get('y')
 *   m.kill()
 *
 * Starting a new animation on a property cancels whatever was driving it, so
 * gestures can interrupt layout animations without fighting them.
 */

import { createMotion, easing as easingTransition, spring as springTransition } from './engine.js'
import { prefersReducedMotion } from '../env.js'

const REST = { x: 0, y: 0, xPercent: 0, yPercent: 0, scale: 1, opacity: 1, blur: 0 }

const controllers = new WeakMap()

class ElementMotion {
    constructor(element) {
        this.element = element
        this.groups = new Map()   // property -> the completion group currently owning it
        this.timers = new Set()   // pending delays, so kill() can cancel them
        this.motion = createMotion({ ...REST }, {
            onChange: () => this.render(),
            onSettle: (key) => this.settle(key),
        })
    }

    get state() {
        return this.motion.state
    }

    render() {
        const { x, y, xPercent, yPercent, scale, opacity, blur } = this.motion.state
        const style = this.element.style
        let transform = `translate(${x}px, ${y}px)`
        if (xPercent) transform += ` translateX(${xPercent}%)`
        if (yPercent) transform += ` translateY(${yPercent}%)`
        if (scale !== 1) transform += ` scale(${scale})`
        style.transform = transform
        style.opacity = String(opacity)
        // Only write a filter when there is one: `blur(0px)` still promotes the
        // element to its own layer and can soften text on some engines.
        style.filter = blur > 0 ? `blur(${blur}px)` : ''
    }

    settle(key) {
        const group = this.groups.get(key)
        if (!group) return
        this.groups.delete(key)
        group.remaining -= 1
        if (group.remaining <= 0 && !group.cancelled) group.onComplete?.()
    }

    /** Claims properties for a new animation, orphaning whatever owned them. */
    claim(keys, onComplete) {
        const group = { remaining: keys.length, cancelled: false, onComplete }
        for (const key of keys) {
            const previous = this.groups.get(key)
            if (previous) previous.cancelled = true
            this.groups.set(key, group)
        }
        return group
    }

    set(props) {
        const keys = Object.keys(props)
        for (const key of keys) {
            const previous = this.groups.get(key)
            if (previous) previous.cancelled = true
            this.groups.delete(key)
        }
        this.motion.animate(props)   // no transition = jump
        this.render()
        return this
    }

    /**
     * @param {Record<string, number>} props
     * @param {object} [options]
     * @param {number} [options.duration] seconds
     * @param {(t: number) => number} [options.ease]
     * @param {object} [options.spring] spring config; wins over duration/ease
     * @param {number} [options.delay] seconds
     * @param {() => void} [options.onComplete]
     */
    to(props, options = {}) {
        const { duration = 0.3, ease, spring, delay = 0, onComplete } = options
        const keys = Object.keys(props)
        if (!keys.length) {
            onComplete?.()
            return this
        }

        // Reduced motion, or an explicitly instant animation: land immediately.
        if (prefersReducedMotion() || (!spring && duration <= 0)) {
            this.set(props)
            onComplete?.()
            return this
        }

        const group = this.claim(keys, onComplete)
        const transition = spring
            ? springTransition(spring)
            : easingTransition({ duration, ease: ease ?? ((t) => t) })
        const transitions = {}
        for (const key of keys) transitions[key] = transition

        const start = () => {
            if (group.cancelled) return
            this.motion.animate(props, transitions)
        }

        if (delay > 0) {
            const timer = setTimeout(() => {
                this.timers.delete(timer)
                start()
            }, delay * 1000)
            this.timers.add(timer)
        } else {
            start()
        }

        return this
    }

    get(key) {
        return this.motion.state[key]
    }

    /** Stops everything without touching the current visual state. */
    kill() {
        this.motion.stop()
        for (const timer of this.timers) clearTimeout(timer)
        this.timers.clear()
        for (const group of this.groups.values()) group.cancelled = true
        this.groups.clear()
        return this
    }
}

/** The controller for an element, created on first use and reused after that. */
export function motionOf(element) {
    let controller = controllers.get(element)
    if (!controller) {
        controller = new ElementMotion(element)
        controllers.set(element, controller)
    }
    return controller
}

export function killMotion(element) {
    controllers.get(element)?.kill()
}
