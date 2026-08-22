<script setup>
import Snippet from './Snippet.vue'

defineProps({
    title: { type: String, required: true },
    hint: { type: String, default: '' },
    code: { type: String, default: '' },
})
</script>

<template>
    <section class="section">
        <h2>{{ title }}</h2>
        <p v-if="hint" class="muted hint">{{ hint }}</p>
        <div class="body"><slot /></div>
        <Snippet v-if="code" :code="code" />
    </section>
</template>

<style scoped>
.section {
    padding: 44px 0;
    border-top: 1px solid var(--line);
}

h2 { font-size: 21px; }

.hint {
    margin: 6px 0 0;
    max-width: 62ch;
    font-size: 14px;
}

.body { margin-top: 20px; }
</style>
