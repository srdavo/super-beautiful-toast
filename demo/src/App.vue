<script setup>
import { ref, reactive, computed, markRaw } from 'vue'
import { ToastHost, useToast, TOAST_POSITIONS } from 'super-beautiful-toast'
import Section from './components/Section.vue'
import Knob from './components/Knob.vue'
import CustomToast from './components/CustomToast.vue'

const toast = useToast()

// ── Theme ───────────────────────────────────────────────────────────────────
const dark = ref(false)
function toggleTheme() {
    dark.value = !dark.value
    document.documentElement.dataset.theme = dark.value ? 'dark' : 'light'
}

// ── Playground ──────────────────────────────────────────────────────────────
const knobs = reactive({
    stiffness: 144,
    damping: 14,
    velocity: 2400,
    peek: 16,
    scaleStep: 0.05,
    maxVisible: 3,
    gap: 8,
})

const hostOptions = computed(() => ({
    morph: { stiffness: knobs.stiffness, damping: knobs.damping, velocity: knobs.velocity },
    stack: { peek: knobs.peek, scaleStep: knobs.scaleStep, maxVisible: knobs.maxVisible, gap: knobs.gap },
}))

// The host reads its options once, so changing a knob rebuilds it.
const hostKey = computed(() => JSON.stringify(hostOptions.value))

// ── Actions ─────────────────────────────────────────────────────────────────
const messages = [
    'Movement saved',
    'Invitation sent',
    'Draft recovered',
    'Signed in as srdavo',
    'Export ready',
]

function fire(event, options = {}) {
    toast.show({ origin: event.currentTarget, ...options })
}

function throwMany(event) {
    messages.forEach((message, index) => {
        setTimeout(() => {
            toast.show({
                message,
                variant: index % 2 ? 'neutral' : 'success',
                origin: index === 0 ? event.currentTarget : null,
                duration: 8000,
            })
        }, index * 260)
    })
}

let counter = 0
function repeatSameKey(event) {
    counter += 1
    toast.info(`Syncing… ${counter}`, { key: 'sync', origin: event.currentTarget, duration: 3000 })
}

function customContent(event) {
    toast.show({
        component: markRaw(CustomToast),
        props: { title: 'Movement deleted', detail: 'It can still be recovered' },
        origin: event.currentTarget,
        duration: 6000,
    })
}

// ── Live tokens ─────────────────────────────────────────────────────────────
const tokenPresets = {
    default: { '--sbt-radius': '32px', '--sbt-padding': '12px 16px' },
    square: { '--sbt-radius': '10px', '--sbt-padding': '14px 18px' },
    compact: { '--sbt-radius': '999px', '--sbt-padding': '8px 14px' },
}

function applyTokens(name, event) {
    for (const [token, value] of Object.entries(tokenPresets[name])) {
        document.documentElement.style.setProperty(token, value)
    }
    toast.neutral(`Tokens: ${name}`, { origin: event.currentTarget, duration: 2400, icon: null })
}
</script>

<template>
    <ToastHost :key="hostKey" :options="hostOptions" />

    <div class="wrap">
        <header class="hero">
            <div class="hero-top">
                <span class="tag">v0.1.0 · MIT · no dependencies</span>
                <button class="btn square" type="button" @click="toggleTheme">
                    {{ dark ? 'Light' : 'Dark' }}
                </button>
            </div>

            <h1>super-beautiful-toast</h1>
            <p class="lead">
                Toasts for Vue 3 where the button you pressed becomes the toast. Physical springs,
                a card-deck stack, and gestures that let you throw a message away.
            </p>

            <div class="row hero-actions">
                <button
                    class="btn solid big raised"
                    type="button"
                    @click="fire($event, { message: 'This came out of that button', variant: 'success' })"
                >
                    Press me
                </button>
                <button
                    class="btn big square"
                    type="button"
                    @click="fire($event, { message: 'So did this one', variant: 'info', position: 'bottom-right' })"
                >
                    And me, over there
                </button>
            </div>
        </header>

        <Section
            title="The morph"
            hint="Hand the toast the element that triggered it and it grows out of it: same size, same colour, same radius at frame zero. Two independent springs carry it, so the path arcs instead of sliding. Without an origin, it just slides in."
            code="toast.success('Saved', { origin: event.currentTarget })"
        >
            <div class="row">
                <button class="btn" type="button" @click="fire($event, { message: 'From a pill', variant: 'success' })">Pill</button>
                <button class="btn square" type="button" @click="fire($event, { message: 'From a square', variant: 'info' })">Square</button>
                <button class="btn solid raised" type="button" @click="fire($event, { message: 'From a raised button', variant: 'warning' })">Raised</button>
                <button class="btn" type="button" @click="toast.neutral('No origin, plain slide-in')">No origin</button>
            </div>
        </Section>

        <Section
            title="Variants"
            hint="Four presets, each one a pair of custom properties. `variant` is a free string: define .sbt-variant-whatever and use it."
            code="toast.success('Saved')
toast.error('Could not save')
toast.warning('Check the date')
toast.info('Syncing…')
toast.neutral('Copied')"
        >
            <div class="row">
                <button class="btn" type="button" @click="fire($event, { message: 'Movement saved', variant: 'success' })">success</button>
                <button class="btn" type="button" @click="fire($event, { message: 'Could not save', variant: 'error' })">error</button>
                <button class="btn" type="button" @click="fire($event, { message: 'Check the date', variant: 'warning' })">warning</button>
                <button class="btn" type="button" @click="fire($event, { message: 'Syncing…', variant: 'info' })">info</button>
                <button class="btn" type="button" @click="fire($event, { message: 'Copied to clipboard', variant: 'neutral' })">neutral</button>
            </div>
        </Section>

        <Section
            title="Eight anchors"
            hint="No dead centre. That belongs to modals."
            code="toast.show({ message: 'Down here', position: 'bottom-right' })"
        >
            <div class="positions">
                <button
                    v-for="position in TOAST_POSITIONS"
                    :key="position"
                    class="btn square"
                    type="button"
                    @click="fire($event, { message: position, position })"
                >
                    {{ position }}
                </button>
            </div>
        </Section>

        <Section
            title="The deck"
            hint="Toasts pile up like cards: newest at the front, older ones smaller and further back. Hover to fan them out into rows, and the countdown pauses while you read. On touch, drag one down to open the deck."
            code="// nothing to configure, this is what stacking does
messages.forEach(m => toast.success(m))"
        >
            <div class="row">
                <button class="btn solid" type="button" @click="throwMany">Throw five</button>
                <button class="btn" type="button" @click="toast.dismissAll()">Dismiss all</button>
            </div>
            <p class="muted note">
                Drag one upward, or scroll up over it, to throw it away. Past the limit
                (<code>max</code>, five by default) the oldest one leaves on its own.
            </p>
        </Section>

        <Section
            title="Duration"
            hint="Milliseconds, or 0 to stay put. A toast that never leaves on its own gets a close button automatically, because otherwise a keyboard user is stuck with it."
            code="toast.info('Quick one', { duration: 1500 })
toast.error('Read me', { duration: 0 })          // sticky, closable
toast.show({ message: 'Sticky, no icon', duration: 0, icon: null })"
        >
            <div class="row">
                <button class="btn" type="button" @click="fire($event, { message: 'Gone in a second and a half', duration: 1500 })">1.5s</button>
                <button class="btn" type="button" @click="fire($event, { message: 'Ten long seconds', duration: 10000, variant: 'info' })">10s</button>
                <button class="btn" type="button" @click="fire($event, { message: 'I am not going anywhere', duration: 0, variant: 'error' })">Sticky</button>
            </div>
        </Section>

        <Section
            title="Colour"
            hint="Three levels: redefine the tokens for everything, add a variant class for a new kind, or tint a single toast inline. All of them are CSS custom properties, so nothing needs a rebuild."
            code="/* everything */
:root { --sbt-bg: #202026; --sbt-radius: 10px; }

/* one toast */
toast.show({ message: 'Just this one', tint: { bg: '#2b1b4d', fg: '#e9ddff' } })"
        >
            <div class="row">
                <button class="btn" type="button" @click="applyTokens('default', $event)">Round</button>
                <button class="btn" type="button" @click="applyTokens('square', $event)">Squared</button>
                <button class="btn" type="button" @click="applyTokens('compact', $event)">Compact</button>
                <button
                    class="btn"
                    type="button"
                    @click="fire($event, { message: 'Tinted just for me', tint: { bg: '#2b1b4d', fg: '#e9ddff' }, icon: 'info' })"
                >
                    Inline tint
                </button>
            </div>
        </Section>

        <Section
            title="Icons"
            hint="Four icons ship as inline SVG, so a blank page looks finished. Anything else you pass is printed as-is, so an emoji works. Point `icon-component` at your own icon system and the name is handed to it instead."
            code="toast.success('Uses the built-in check')
toast.show({ message: 'Party', icon: '🎉' })
toast.show({ message: 'No icon at all', icon: null })

<ToastHost icon-component=&quot;md-icon&quot; />   <!-- your icon font -->"
        >
            <div class="row">
                <button class="btn" type="button" @click="fire($event, { message: 'Built-in check', variant: 'success' })">Built-in</button>
                <button class="btn" type="button" @click="fire($event, { message: 'Party time', icon: '🎉' })">Emoji</button>
                <button class="btn" type="button" @click="fire($event, { message: 'Nothing but text', icon: null })">None</button>
            </div>
        </Section>

        <Section
            title="Your own content"
            hint="Pass a component instead of a message and it renders inside the skin, props and all. Emit `close` to dismiss yourself."
            code="toast.show({
    component: markRaw(MyToast),
    props: { title: 'Movement deleted' },
    duration: 6000,
})"
        >
            <div class="row">
                <button class="btn" type="button" @click="customContent">Custom component</button>
            </div>
        </Section>

        <Section
            title="Repeats"
            hint="Give a toast a key and pressing the same button again refreshes the one already on screen instead of stacking copies of it."
            code="toast.info(`Syncing… ${n}`, { key: 'sync' })"
        >
            <div class="row">
                <button class="btn" type="button" @click="repeatSameKey">Press repeatedly</button>
            </div>
        </Section>

        <Section
            title="Playground"
            hint="The morph is a simulation, not a baked curve, so these are physics rather than presets. Lower damping bounces more; velocity is the kick that bends the path."
            code="<ToastHost :options=&quot;{
    morph: { stiffness: 144, damping: 14, velocity: 2400 },
    stack: { peek: 16, scaleStep: 0.05, maxVisible: 3 },
}&quot; />"
        >
            <div class="knobs">
                <Knob v-model="knobs.stiffness" label="stiffness" :min="40" :max="400" :step="4" hint="how hard it pulls" />
                <Knob v-model="knobs.damping" label="damping" :min="6" :max="40" hint="lower bounces more" />
                <Knob v-model="knobs.velocity" label="velocity" :min="0" :max="4000" :step="100" hint="the initial kick" />
                <Knob v-model="knobs.peek" label="peek" :min="0" :max="40" hint="px each older card shows" />
                <Knob v-model="knobs.scaleStep" label="scaleStep" :min="0" :max="0.15" :step="0.01" hint="shrink per card" />
                <Knob v-model="knobs.maxVisible" label="maxVisible" :min="1" :max="6" hint="cards drawn collapsed" />
            </div>
            <div class="row playground-actions">
                <button class="btn solid" type="button" @click="fire($event, { message: 'Feel that', variant: 'success' })">Fire one</button>
                <button class="btn" type="button" @click="throwMany">Throw five</button>
            </div>
        </Section>

        <Section
            title="Install"
            code="npm install super-beautiful-toast"
        >
            <p class="muted install-note">
                Then mount the host once and call it from anywhere.
            </p>
        </Section>

        <footer class="footer muted">
            <span>MIT · <a href="https://github.com/srdavo/super-beautiful-toast">github.com/srdavo/super-beautiful-toast</a></span>
        </footer>
    </div>
</template>

<style scoped>
.hero { padding: 72px 0 48px; }

.hero-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 56px;
}

.tag {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 0.02em;
}

h1 {
    font-size: clamp(38px, 7vw, 62px);
    line-height: 1.02;
    letter-spacing: -0.035em;
}

.lead {
    max-width: 56ch;
    margin: 20px 0 0;
    font-size: 17px;
    color: var(--muted);
}

.hero-actions { margin-top: 36px; }

.positions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
}

.note { margin: 16px 0 0; font-size: 13px; }

.knobs {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 22px 32px;
}

.playground-actions { margin-top: 26px; }

.install-note { margin: 0; }

.footer {
    padding: 40px 0;
    border-top: 1px solid var(--line);
    font-size: 13px;
}

.footer a { color: inherit; }
</style>
