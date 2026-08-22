/**
 * The animation engine: a small, physically honest spring and tween integrator
 * sharing one requestAnimationFrame across the whole process.
 *
 *   spring({ stiffness, damping, mass, velocity, restSpeed, restDelta })
 *     Semi-implicit Euler with a 1/60s sub-step so stiff springs stay stable.
 *     Retargeting mid flight keeps the current velocity, which is what makes
 *     an interrupted animation feel like it was caught rather than restarted.
 *
 *   easing({ duration, ease })
 *     A classic tween. `ease` is any function from easing.js.
 *
 *   createMotion(initial, { onChange })
 *     A bag of named numeric channels. `animate(targets, transitions)` starts
 *     or retargets them one by one; each channel unsubscribes when it settles.
 *
 * The integrator follows the model used by @liquid-dom/react, reimplemented
 * here so the package carries no dependencies.
 */

// ─── Transition factories ────────────────────────────────────────────────────

export function spring(opts = {}) {
    return {
        type: 'spring',
        stiffness: 300,
        damping: 30,
        mass: 1,
        velocity: 0,
        restSpeed: 0.01,
        restDelta: 0.01,
        ...opts,
    }
}

export function easing(opts = {}) {
    return {
        type: 'easing',
        duration: 0.25,
        ease: (t) => t,
        ...opts,
    }
}

// ─── Channel: one animated property ──────────────────────────────────────────

class Channel {
    constructor(value) {
        this.current = value
        this.origin = value
        this.target = value
        this.velocity = 0
        this.elapsed = 0
        this.config = null
        this.active = false
        this.onChange = null
        this.onSettle = null
    }

    setTarget(target, config) {
        if (target === this.current && (!config || !this.active)) {
            this.target = target
            this.active = false
            return
        }

        // No transition: jump.
        if (!config) {
            this.current = target
            this.target = target
            this.origin = target
            this.velocity = 0
            this.elapsed = 0
            this.active = false
            this.onChange?.(this.current)
            return
        }

        if (config.type === 'spring') {
            // velocity = 0  → smooth retarget, KEEPS the current velocity.
            // velocity > 0  → re-applies a signed kick on every call.
            // direction     → overrides the sign of that kick, for when you want
            //                 to launch somewhere the target does not point to.
            const v = config.velocity || 0
            if (v !== 0) {
                const sign = config.direction !== undefined
                    ? Math.sign(config.direction)
                    : Math.sign(target - this.current)
                this.velocity = Math.abs(v) * sign
            }
            this.target = target
            this.config = config
            this.active = true
        } else {
            // A tween always restarts from where it is.
            this.origin = this.current
            this.target = target
            this.velocity = 0
            this.elapsed = 0
            this.config = config
            this.active = this.target !== this.current
            if (!this.active) {
                this.onChange?.(this.current)
                this.onSettle?.()
            }
        }
    }

    step(dtSeconds) {
        if (!this.active) return false
        const c = this.config

        if (c.type === 'spring') {
            const subDt = Math.min(0.064, dtSeconds)
            const steps = Math.max(1, Math.ceil(subDt / (1 / 60)))
            const stepDt = subDt / steps
            for (let i = 0; i < steps; i += 1) {
                const displacement = this.current - this.target
                const springForce = -c.stiffness * displacement
                const dampingForce = -c.damping * this.velocity
                const acceleration = (springForce + dampingForce) / c.mass
                this.velocity += acceleration * stepDt
                this.current += this.velocity * stepDt
            }
            if (
                Math.abs(this.velocity) <= c.restSpeed
                && Math.abs(this.target - this.current) <= c.restDelta
            ) {
                this.current = this.target
                this.velocity = 0
                this.active = false
                this.onChange?.(this.current)
                this.onSettle?.()
                return true
            }
        } else {
            this.elapsed += dtSeconds
            const duration = c.duration > 0 ? c.duration : 1e-6
            const progress = Math.min(1, Math.max(0, this.elapsed / duration))
            const eased = c.ease(progress)
            this.current = this.origin + (this.target - this.origin) * eased
            if (progress >= 1) {
                this.current = this.target
                this.active = false
                this.onChange?.(this.current)
                this.onSettle?.()
                return true
            }
        }

        this.onChange?.(this.current)
        return false
    }
}

// ─── The shared loop ─────────────────────────────────────────────────────────

class MotionLoop {
    constructor() {
        this.channels = new Set()
        this.lastTime = 0
        this.frameId = 0
        this.tick = this.tick.bind(this)
    }

    add(channel) {
        this.channels.add(channel)
        this.kick()
    }

    remove(channel) {
        this.channels.delete(channel)
    }

    kick() {
        if (this.frameId || typeof requestAnimationFrame === 'undefined') return
        this.lastTime = performance.now()
        this.frameId = requestAnimationFrame(this.tick)
    }

    tick(now) {
        // Clamped: a backgrounded tab hands back a huge delta, and a spring fed
        // half a second in one step explodes.
        const dt = Math.min(0.1, Math.max(0, (now - this.lastTime) / 1000))
        this.lastTime = now

        for (const channel of [...this.channels]) {
            channel.step(dt)
            if (!channel.active) this.channels.delete(channel)
        }

        this.frameId = this.channels.size > 0 ? requestAnimationFrame(this.tick) : 0
    }
}

const loop = new MotionLoop()

/**
 * @param {Record<string, number>} initial
 * @param {{ onChange?: (key: string, value: number) => void,
 *           onSettle?: (key: string) => void }} [opts]
 * @returns {{ state: Record<string, number>, animate: Function, stop: Function }}
 */
export function createMotion(initial, opts = {}) {
    const onChange = opts.onChange ?? (() => {})
    const onSettle = opts.onSettle ?? (() => {})
    const state = { ...initial }
    const channels = {}

    for (const key of Object.keys(initial)) {
        const channel = new Channel(initial[key])
        channel.onChange = (v) => {
            state[key] = v
            onChange(key, v)
        }
        channel.onSettle = () => onSettle(key)
        channels[key] = channel
    }

    function animate(targets, transitions = {}) {
        for (const [key, value] of Object.entries(targets)) {
            const channel = channels[key]
            if (!channel) continue
            channel.setTarget(value, transitions[key] ?? transitions.default ?? null)
            if (channel.active) loop.add(channel)
        }
    }

    function stop() {
        for (const channel of Object.values(channels)) {
            loop.remove(channel)
            channel.active = false
        }
    }

    return { state, animate, stop }
}

export { loop as motionLoop }
