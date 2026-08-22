/**
 * The card-deck layout, as pure arithmetic.
 *
 * Toasts are not laid out by flow. Every one is absolutely positioned and its
 * place comes from its RANK (rank 0 = newest = the front of the deck). This
 * file turns a rank into a slot and nothing else: no DOM, no animation, no
 * framework. That makes the stacking behaviour the one part of this library
 * that can be reasoned about, and tested, on its own.
 *
 * Collapsed: the front card sits at full size, each older one shrinks, peeks
 * out behind it and drops a layer. Expanded: real rows, spaced by their own
 * measured heights.
 */

export const STACK_DEFAULTS = {
    /** px each older card peeks out while collapsed */
    peek: 16,
    /** scale removed per card of depth */
    scaleStep: 0.05,
    /** smallest a card may shrink to */
    minScale: 0.7,
    /** cards drawn while collapsed; the rest wait at opacity 0 */
    maxVisible: 3,
    /** px between cards once expanded */
    gap: 8,
    baseZ: 1000,
}

/** Which way the deck grows: down from the top edge, up from the bottom. */
export function stackDirection(position) {
    return position.startsWith('bottom') ? -1 : 1
}

/** Centred positions are anchored with left:0/right:0 and pulled back by half. */
export function stackXPercent(position) {
    return position.endsWith('center') ? -50 : 0
}

/**
 * @param {number} count       how many toasts are in this position
 * @param {object} params
 * @param {string} params.position
 * @param {boolean} params.expanded
 * @param {number[]} params.heights  measured height per rank, only used when expanded
 * @param {object} [params.options]  overrides of STACK_DEFAULTS
 * @returns {Array<{y: number, scale: number, opacity: number, xPercent: number, zIndex: number, visible: boolean}>}
 */
export function computeStackLayout(count, { position, expanded, heights = [], options = {} }) {
    const config = { ...STACK_DEFAULTS, ...options }
    const direction = stackDirection(position)
    const xPercent = stackXPercent(position)
    const slots = []

    let cumulative = 0
    for (let rank = 0; rank < count; rank += 1) {
        let slot
        if (expanded) {
            slot = { y: direction * cumulative, scale: 1, opacity: 1, visible: true }
            cumulative += (heights[rank] ?? 0) + config.gap
        } else {
            const visible = rank < config.maxVisible
            slot = {
                y: direction * rank * config.peek,
                scale: Math.max(config.minScale, 1 - rank * config.scaleStep),
                opacity: visible ? 1 : 0,
                visible,
            }
        }
        slot.xPercent = xPercent
        slot.zIndex = config.baseZ - rank
        slots.push(slot)
    }

    return slots
}
