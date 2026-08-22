/**
 * Splits an element's text into per-character spans so they can be staggered,
 * and puts it back exactly as it was afterwards.
 *
 * Replaces a text-splitting plugin with the twenty lines this actually needs.
 * Segmentation uses `Intl.Segmenter` when the browser has it, so an accented
 * letter, an emoji or a family emoji counts as ONE character instead of being
 * torn into broken code points.
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
    const chars = []
    const fragment = document.createDocumentFragment()

    for (const grapheme of graphemes(text)) {
        // Whitespace stays plain text: wrapping it would break line breaking.
        if (!grapheme.trim()) {
            fragment.appendChild(document.createTextNode(grapheme))
            continue
        }
        const span = document.createElement('span')
        span.textContent = grapheme
        span.style.display = 'inline-block'
        span.style.willChange = 'transform, opacity'
        fragment.appendChild(span)
        chars.push(span)
    }

    element.textContent = ''
    element.appendChild(fragment)

    let reverted = false
    return {
        chars,
        revert() {
            if (reverted) return
            reverted = true
            element.innerHTML = original
        },
    }
}
