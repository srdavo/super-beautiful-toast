<script setup>
/**
 * Default toast content: an optional icon, the message, an optional close
 * button. Quiet by design, because the skin (background, radius, shadow, padding) is
 * the host's job, so this only lays out what is inside.
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { splitChars } from '../core/motion/split.js'
import { motionOf } from '../core/motion/element.js'
import { Easing } from '../core/motion/easing.js'
import { prefersReducedMotion } from '../core/env.js'
import ToastIcon from './ToastIcon.vue'

const props = defineProps({
    message: { type: String, default: '' },
    icon: { type: String, default: null },
    iconComponent: { type: [String, Object, Function], default: null },
    variant: { type: String, default: 'neutral' },
    closable: { type: Boolean, default: false },
    closeLabel: { type: String, default: 'Dismiss' },
    /** Reveal the message letter by letter. */
    stagger: { type: Boolean, default: true },
})

const emit = defineEmits(['close'])

// Only short messages get the letter reveal: past this a long string is
// hundreds of spans, which janks, and the effect is lost anyway.
const STAGGER_MAX_CHARS = 64
// Wait for the toast to almost arrive, or the reveal is spent mid-flight.
const STAGGER_DELAY = 0.225
const STAGGER_STEP = 0.02

const messageRef = ref(null)
let split = null

onMounted(() => {
    const element = messageRef.value
    if (!props.stagger || !element || !props.message) return
    if (props.message.length > STAGGER_MAX_CHARS || prefersReducedMotion()) return

    split = splitChars(element)
    let pending = split.chars.length
    split.chars.forEach((char, index) => {
        const motion = motionOf(char)
        motion.set({ opacity: 0, yPercent: 40, blur: 4 })
        motion.to({ opacity: 1, yPercent: 0, blur: 0 }, {
            duration: 0.4,
            ease: Easing.easeOutCubic,
            delay: STAGGER_DELAY + index * STAGGER_STEP,
            onComplete() {
                pending -= 1
                // Put the plain text back once every letter has landed: the
                // spans exist for the animation, not for the document.
                if (pending <= 0) {
                    split?.revert()
                    split = null
                }
            },
        })
    })
})

onUnmounted(() => split?.revert())
</script>

<template>
    <div class="sbt-content">
        <ToastIcon :name="icon" :component="iconComponent" />
        <span ref="messageRef" class="sbt-message">{{ message }}</span>
        <button
            v-if="closable"
            type="button"
            class="sbt-close"
            :aria-label="closeLabel"
            @click="emit('close')"
        >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false">
                <path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4Z" />
            </svg>
        </button>
    </div>
</template>
