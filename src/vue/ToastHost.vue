<script setup>
/**
 * Mount this once, anywhere. It renders the layer and hands every element to
 * the core host; it holds no animation logic of its own.
 *
 *   <ToastHost />
 */

import { ref, shallowRef, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { toastQueue as sharedQueue, TOAST_POSITIONS } from '../core/queue.js'
import { createToastHost } from '../core/host.js'
import ToastMessage from './ToastMessage.vue'
import '../core/styles.css'

const props = defineProps({
    /** Bring your own queue for an isolated set of toasts. */
    queue: { type: Object, default: () => sharedQueue },
    /** Overrides for the stack, gestures, morph and timings. */
    options: { type: Object, default: () => ({}) },
    /** Render only some anchors; the rest are never created. */
    positions: { type: Array, default: () => TOAST_POSITIONS },
    /** Tag or component used to draw icon names. */
    iconComponent: { type: [String, Object, Function], default: null },
    teleportTo: { type: [String, Object], default: 'body' },
    closeLabel: { type: String, default: 'Dismiss' },
    /** Letter-by-letter reveal of the default content. */
    stagger: { type: Boolean, default: true },
})

const items = shallowRef(props.queue.getItems())
const unsubscribe = props.queue.subscribe((next) => { items.value = next })

const host = createToastHost({ queue: props.queue, options: props.options })

// Teleport needs a document. Rendering nothing until mounted is what makes the
// package safe to import from a server-rendered app.
const mounted = ref(false)
onMounted(() => { mounted.value = true })

onBeforeUnmount(() => {
    unsubscribe()
    host.destroy()
})

/** Newest first, so index 0 is the front of the deck. */
const byPosition = computed(() => {
    const groups = {}
    for (const position of props.positions) groups[position] = []
    for (const item of items.value) {
        if (item.closing) continue
        const group = groups[item.position] ?? groups[props.positions[0]]
        group?.push(item)
    }
    for (const position of props.positions) groups[position].reverse()
    return groups
})

// ── Screen readers ──────────────────────────────────────────────────────────
// The visible stack is a pile of transformed, sometimes transparent cards, a
// bad place to hang a live region. Instead the text is mirrored into two plain
// regions that exist from mount, which is what makes an announcement reliable.
// Errors go to the assertive one; everything else waits its turn.
const polite = ref('')
const assertive = ref('')

async function announce(item) {
    if (!item?.message) return
    const target = item.variant === 'error' ? assertive : polite
    // Clearing first re-announces a repeat of the same text.
    target.value = ''
    await nextTick()
    target.value = item.message
}

// ── Transition hooks ────────────────────────────────────────────────────────
function toastIdOf(element) {
    return Number(element.dataset.sbtId)
}

function onEnter(element, done) {
    const id = toastIdOf(element)
    host.bind(element, id)
    announce(props.queue.get(id))
    host.enter(element, id, done)
}

function onLeave(element, done) {
    host.leave(element, toastIdOf(element), done)
}

function tintStyle(item) {
    if (!item.tint) return null
    return { '--sbt-toast-bg': item.tint.bg, '--sbt-toast-fg': item.tint.fg }
}

defineExpose({ host })
</script>

<template>
    <Teleport v-if="mounted" :to="teleportTo">
        <div class="sbt-layer">
            <div class="sbt-announcer" aria-live="polite" aria-atomic="true">{{ polite }}</div>
            <div class="sbt-announcer" aria-live="assertive" aria-atomic="true">{{ assertive }}</div>

            <div
                v-for="position in positions"
                :key="position"
                class="sbt-stack"
                :class="`sbt-${position}`"
            >
                <TransitionGroup :css="false" @enter="onEnter" @leave="onLeave">
                    <div
                        v-for="toast in byPosition[position]"
                        :key="toast.id"
                        class="sbt-toast"
                        :data-sbt-id="toast.id"
                    >
                        <div
                            class="sbt-shell"
                            :class="`sbt-variant-${toast.variant}`"
                            :style="tintStyle(toast)"
                            data-sbt-shell
                        >
                            <div class="sbt-body" data-sbt-body>
                                <component
                                    :is="toast.component"
                                    v-if="toast.component"
                                    v-bind="toast.props"
                                    @close="queue.dismiss(toast.id)"
                                />
                                <ToastMessage
                                    v-else
                                    :message="toast.message"
                                    :icon="toast.icon"
                                    :icon-component="iconComponent"
                                    :variant="toast.variant"
                                    :closable="toast.closable"
                                    :close-label="closeLabel"
                                    :stagger="stagger"
                                    @close="queue.dismiss(toast.id)"
                                />
                            </div>
                        </div>
                    </div>
                </TransitionGroup>
            </div>
        </div>
    </Teleport>
</template>
