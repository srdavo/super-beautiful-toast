# Changelog

## 0.1.0

First release. Extracted from the toast system of the stepbro apps, where it had
been running in production, and rebuilt as a standalone package.

What changed on the way out:

- Dropped GSAP. The spring integrator, the easing curves, the per-element tween
  and the text splitter are all part of the package now, so it installs with no
  dependencies.
- Dropped Pinia. The queue is a plain observable store, which is also what makes
  a React adapter possible later.
- Split the code into a framework-free core and a Vue adapter.
- Every colour, size and timing is a custom property with a real default, so the
  toasts look finished on a page with no design system.
- Four icons ship as inline SVG. `icon-component` hands names to your own icon
  system instead.
- Added `prefers-reduced-motion` support, two live regions for screen readers,
  `aria-hidden` on cards buried in the deck, and an automatic close button on
  toasts that never expire.
- Added `max` per position, and `key` to collapse repeats.
- Added a `warning` variant.
- The morph is now tunable through options instead of a constant in the file.
  The second, dormant morph style was removed.
