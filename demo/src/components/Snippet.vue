<script setup>
import { ref } from 'vue'
import { useToast } from 'super-beautiful-toast'

const props = defineProps({ code: { type: String, required: true } })
const toast = useToast()
const element = ref(null)

async function copy(event) {
    try {
        await navigator.clipboard.writeText(props.code)
        toast.neutral('Copied', { origin: event.currentTarget, duration: 2000, icon: null })
    } catch {
        toast.error('Clipboard blocked', { origin: event.currentTarget })
    }
}
</script>

<template>
    <div ref="element" class="snippet">
        <pre><code>{{ code }}</code></pre>
        <button class="copy" type="button" @click="copy">copy</button>
    </div>
</template>

<style scoped>
.snippet {
    position: relative;
    margin-top: 18px;
    background: var(--code-bg);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    overflow: hidden;
}

pre {
    margin: 0;
    padding: 16px 18px;
    overflow-x: auto;
    color: var(--text);
}

.copy {
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 4px 10px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface);
    color: var(--muted);
    font-size: 11px;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s ease;
}

.snippet:hover .copy { opacity: 1; }
.copy:hover { color: var(--text); }
</style>
