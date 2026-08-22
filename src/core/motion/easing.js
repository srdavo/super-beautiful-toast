/**
 * Easing curves.
 *
 * Two families live here:
 *
 *   Easing.*      classic curves, including a cubic-bezier solver so any
 *                 CSS-style `cubic-bezier(x1, y1, x2, y2)` can be used.
 *   springEase()  the step response of a DAMPED SPRING sampled as a curve.
 *                 This is the physics behind native iOS and Material springs:
 *                 you tune how far it overshoots and how much it anticipates,
 *                 instead of picking magic numbers out of a preset list.
 *
 * `springEase` is not the same thing as the real spring integrator in
 * `engine.js`. The integrator runs frame by frame and can be retargeted mid
 * flight; this one bakes the motion into a fixed-duration curve. Use the
 * integrator when something travels to a destination, this one when a plain
 * tween just needs a livelier shape.
 */

function clamp01(v) {
    if (!Number.isFinite(v)) return 0
    return Math.min(1, Math.max(0, v))
}

function cubicBezierCoordinate(t, p1, p2) {
    const inv = 1 - t
    return 3 * inv * inv * t * p1 + 3 * inv * t * t * p2 + t * t * t
}

function cubicBezierDerivative(t, p1, p2) {
    const inv = 1 - t
    return 3 * inv * inv * p1 + 6 * inv * t * (p2 - p1) + 3 * t * t * (1 - p2)
}

export const Easing = {
    linear: (t) => t,
    easeIn: (t) => t * t,
    easeOut: (t) => 1 - (1 - t) * (1 - t),
    easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) * (-2 * t + 2)) / 2),

    // Cubic flavours. `easeOutCubic` is the workhorse for settling motion:
    // fast start, long quiet landing.
    easeInCubic: (t) => t * t * t,
    easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),

    /**
     * Solves y for a given x on a cubic bezier, the way CSS does.
     * Newton-Raphson first (8 iterations), bisection as a fallback (16).
     */
    bezier: (x1, y1, x2, y2) => {
        const cx1 = clamp01(x1)
        const cx2 = clamp01(x2)
        return (progress) => {
            const x = clamp01(progress)
            if (x === 0 || x === 1) return x

            let t = x
            let solved = false
            for (let i = 0; i < 8; i += 1) {
                const cx = cubicBezierCoordinate(t, cx1, cx2) - x
                const d = cubicBezierDerivative(t, cx1, cx2)
                if (Math.abs(cx) < 1e-6) { solved = true; break }
                if (Math.abs(d) < 1e-6) break
                const nt = t - cx / d
                if (nt < 0 || nt > 1) break
                t = nt
            }

            if (!solved) {
                let lo = 0
                let hi = 1
                t = x
                for (let i = 0; i < 16; i += 1) {
                    const cx = cubicBezierCoordinate(t, cx1, cx2)
                    if (Math.abs(cx - x) < 1e-6) break
                    if (cx < x) lo = t
                    else hi = t
                    t = (lo + hi) / 2
                }
            }

            return cubicBezierCoordinate(t, y1, y2)
        }
    },
}

// The envelope decays to ~0.4% at t = 1, so the curve settles instead of being
// cut off at the end.
const SPRING_DECAY = 5.6

/**
 * Step response of a damped spring, as an easing function.
 *
 * @param {number} dampingRatio     How much it OVERSHOOTS. Lower bounces more:
 *                                  ~0.5 clearly bounces, ~0.8 barely, 1 not at all.
 * @param {number} [initialVelocity] ANTICIPATION. Negative means it pulls back
 *                                  before setting off. 0 starts straight for the
 *                                  target, which is what you want when the element
 *                                  travels somewhere concrete and hesitation would
 *                                  read as a stutter.
 * @returns {(t: number) => number}
 */
export function springEase(dampingRatio, initialVelocity = 0) {
    const z = Math.min(Math.max(dampingRatio, 0.05), 0.999)
    const wn = SPRING_DECAY / z
    const wd = wn * Math.sqrt(1 - z * z)
    const b = (initialVelocity - SPRING_DECAY) / wd  // sine coefficient from the initial conditions
    return (t) => {
        if (t >= 1) return 1                          // land exactly on 1, no snap
        return 1 + Math.exp(-SPRING_DECAY * t) * (-Math.cos(wd * t) + b * Math.sin(wd * t))
    }
}

/**
 * The same curve as an SVG path string, for anyone driving this with GSAP:
 *
 *   CustomEase.create('mySpring', springEasePath(0.55))
 *
 * The library itself does not use it. It is here because the curve is the
 * interesting part, and it should not be locked inside one animation engine.
 */
export function springEasePath(dampingRatio, initialVelocity = 0, samples = 72) {
    const at = springEase(dampingRatio, initialVelocity)
    let path = 'M0,0'
    for (let i = 1; i <= samples; i += 1) {
        const t = i / samples
        const y = i === samples ? 1 : at(t)
        path += ` L${t.toFixed(4)},${y.toFixed(4)}`
    }
    return path
}
