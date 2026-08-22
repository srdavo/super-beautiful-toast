<script setup>
defineProps({
    label: { type: String, required: true },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 100 },
    step: { type: Number, default: 1 },
    hint: { type: String, default: '' },
})
const model = defineModel({ type: Number, required: true })
</script>

<template>
    <label class="knob">
        <span class="top">
            <span class="label">{{ label }}</span>
            <span class="value">{{ model }}</span>
        </span>
        <input v-model.number="model" type="range" :min="min" :max="max" :step="step" />
        <span v-if="hint" class="muted hint">{{ hint }}</span>
    </label>
</template>

<style scoped>
.knob { display: flex; flex-direction: column; gap: 6px; }

.top { display: flex; justify-content: space-between; align-items: baseline; }
.label { font-size: 13px; font-weight: 500; }
.value { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--muted); }
.hint { font-size: 11px; }

input[type='range'] {
    width: 100%;
    accent-color: var(--text);
}
</style>
