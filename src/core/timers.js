/**
 * Auto-dismiss timers that can be paused and picked up again.
 *
 * A toast that keeps counting down while the pointer is resting on it is a
 * toast that vanishes mid-sentence, so hovering pauses and leaving resumes from
 * the remaining time rather than from the start.
 */

export function createTimerSet(onExpire) {
    const timers = new Map()   // id -> { handle, remaining, startedAt }

    function arm(id, ms) {
        const handle = setTimeout(() => {
            timers.delete(id)
            onExpire(id)
        }, ms)
        timers.set(id, { handle, remaining: ms, startedAt: performance.now() })
    }

    return {
        /** Duration 0 (or missing) means the toast stays until dismissed. */
        start(id, duration) {
            if (!duration || duration <= 0) return
            this.clear(id)
            arm(id, duration)
        },

        pause(id) {
            const timer = timers.get(id)
            if (!timer || !timer.handle) return
            clearTimeout(timer.handle)
            timer.remaining = Math.max(0, timer.remaining - (performance.now() - timer.startedAt))
            timer.handle = null
        },

        resume(id) {
            const timer = timers.get(id)
            if (!timer || timer.handle) return
            if (timer.remaining <= 0) {
                timers.delete(id)
                onExpire(id)
                return
            }
            arm(id, timer.remaining)
        },

        clear(id) {
            const timer = timers.get(id)
            if (timer && timer.handle) clearTimeout(timer.handle)
            timers.delete(id)
        },

        clearAll() {
            for (const timer of timers.values()) {
                if (timer.handle) clearTimeout(timer.handle)
            }
            timers.clear()
        },

        has: (id) => timers.has(id),
    }
}
