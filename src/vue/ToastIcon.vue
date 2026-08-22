<script setup>
/**
 * The icon slot, resolved in three steps:
 *
 *   1. An `icon-component` was configured → render that with the name inside,
 *      which is how icon fonts and custom elements expect to be fed
 *      (`<md-icon>check_circle</md-icon>`, `<i class="fa">…</i>`).
 *   2. The name is one this package ships → an inline SVG. No font to load, no
 *      request, correct on a blank page.
 *   3. Anything else → printed as-is, so an emoji or a "✓" just works.
 */

const props = defineProps({
    name: { type: String, default: null },
    component: { type: [String, Object, Function], default: null },
})

// Filled, 24×24, drawn on the same grid as Material Symbols so swapping between
// these and an icon font does not shift the layout.
const BUILT_IN = {
    check_circle: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.2 14.4-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4-7 7Z',
    error: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z',
    info: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z',
    warning: 'M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z',
}
</script>

<template>
    <component
        :is="component"
        v-if="component && name"
        class="sbt-icon"
        aria-hidden="true"
    >{{ name }}</component>

    <svg
        v-else-if="name && BUILT_IN[name]"
        class="sbt-icon"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
    >
        <path :d="BUILT_IN[name]" />
    </svg>

    <span v-else-if="name" class="sbt-icon" aria-hidden="true">{{ name }}</span>
</template>
