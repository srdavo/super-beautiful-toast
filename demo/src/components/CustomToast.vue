<script setup>
/**
 * Custom toast content. Anything passed as `component` is rendered inside the
 * skin instead of the default message, gets its `props`, and closes itself by
 * emitting `close`.
 */
defineProps({
    title: { type: String, default: '' },
    detail: { type: String, default: '' },
})
const emit = defineEmits(['close'])
</script>

<template>
    <div class="custom">
        <div class="dot" />
        <div class="text">
            <strong>{{ title }}</strong>
            <span class="muted">{{ detail }}</span>
        </div>
        <button type="button" @click="emit('close')">Undo</button>
    </div>
</template>

<style scoped>
.custom { display: flex; align-items: center; gap: 12px; min-width: 0; }

.dot {
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
}

.text { display: flex; flex-direction: column; line-height: 1.3; min-width: 0; }
.text strong { font-size: 14px; font-weight: 600; }
.text span { font-size: 12px; opacity: 0.75; }

button {
    flex: none;
    margin-left: 4px;
    padding: 5px 12px;
    border: 1px solid currentColor;
    border-radius: 999px;
    background: transparent;
    color: inherit;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
}
</style>
