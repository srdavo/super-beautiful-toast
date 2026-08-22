/**
 * Splits an element's text into per-character spans so they can be staggered,
 * and puts it back exactly as it was afterwards.
 *
 * Replaces a text-splitting plugin with the thirty lines this actually needs.
 * Segmentation uses `Intl.Segmenter` when the browser has it, so an accented
 * letter, an emoji or a family emoji counts as ONE character instead of being
 * torn into broken code points.
 *
 * The contract worth stating: SPLITTING MUST NOT CHANGE THE LAYOUT. A row of
 * inline-blocks does not measure the same as the run of text it replaced, and
 * it offers a line-breaking opportunity between every pair of them. Both are
 * invisible until something downstream measures the element and holds it to
 * that number. Two rules keep the box honest:
 *
 *   - Words stay whole, so the only break opportunities are the ones the
 *     original text already had.
 *   - The box keeps the size it had before the split, and a text that fitted
 *     on one line is held to one line.
 *
 * Call this before any ancestor is transformed. It measures in layout pixels,
 * and a scaled ancestor would make it freeze the wrong size.
 */

const segmenter = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null

function graphemes(text) {
    if (segmenter) return Array.from(segmenter.segment(text), (s) => s.segment)
    return Array.from(text)
}

/**
 * @param {HTMLElement} element
 * @returns {{ chars: HTMLElement[], revert: () => void }}
 */
export function splitChars(element) {
    const original = element.innerHTML
    const text = element.textContent ?? ''

    // Measured before anything is replaced: this is the size to preserve.
    const rect = element.getBoundingClientRect()
    const lineHeight = parseFloat(getComputedStyle(element).lineHeight) || rect.height
    const singleLine = rect.height <= lineHeight * 1.5

    const chars = []
    const fragment = document.createDocumentFragment()
    let word = null

    for (const grapheme of graphemes(text)) {
        // Whitespace stays plain text, and closes the current word: wrapping it
        // would take away the one break opportunity the text is allowed to keep.
        if (!grapheme.trim()) {
            word = null
            fragment.appendChild(document.createTextNode(grapheme))
            continue
        }
        if (!word) {
            word = document.createElement('span')
            word.style.display = 'inline-block'
            word.style.whiteSpace = 'nowrap'
            fragment.appendChild(word)
        }
        const span = document.createElement('span')
        span.textContent = grapheme
        span.style.display = 'inline-block'
        span.style.willChange = 'transform, opacity'
        word.appendChild(span)
        chars.push(span)
    }

    const style = element.style
    const restore = {
        width: style.width,
        height: style.height,
        whiteSpace: style.whiteSpace,
    }
    style.width = `${rect.width}px`
    style.height = `${rect.height}px`
    if (singleLine) style.whiteSpace = 'nowrap'

    element.textContent = ''
    element.appendChild(fragment)

    let reverted = false
    return {
        chars,
        revert() {
            if (reverted) return
            reverted = true
            element.innerHTML = original
            style.width = restore.width
            style.height = restore.height
            style.whiteSpace = restore.whiteSpace
        },
    }
}
