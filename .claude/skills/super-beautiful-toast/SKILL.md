---
name: super-beautiful-toast
description: Toast notifications where the button becomes the toast. Use when showing a toast, snackbar or notification in a Vue 3 app; when the morph, the card stack, the dismiss gestures or the toast theming misbehave; or when changing the package itself (src/core, src/vue, styles.css, the demo).
---

# super-beautiful-toast

Vue 3 toasts with a shared-element morph out of the triggering button, a
card-deck stack, and drag or scroll to dismiss. No runtime dependencies.

Full usage lives in `README.md`. Design decisions and every gotcha live in
`docs/internals.md`. Read the second one before changing anything under
`src/core/`.

## Showing a toast

```js
import { toast } from 'super-beautiful-toast'

toast.success('Saved', { origin: event.currentTarget })   // morphs out of the button
toast.error('Could not save')                             // slides in
toast.info('Syncing…', { key: 'sync' })                   // repeats refresh, never stack
toast.show({ message: 'Undo?', component: markRaw(MyToast), duration: 0 })
```

The host is mounted once at the app root. Adding a second one duplicates every
toast unless it gets its own queue through `createToastQueue()`.

Three things bite when integrating:

- **A button inside a modal that closes on success.** The morph measures the
  button, so fire the toast, `await nextTick()`, then close the modal. Closing
  first leaves nothing to morph from and you silently get a plain slide-in.
- **Custom content needs `markRaw`.** A component passed through a reactive
  wrapper without it gets proxied, and Vue warns.
- **Colours come from tokens, never from a class you add.** Retheme with the
  `--sbt-*` custom properties. Restyling `.sbt-shell` directly fights the morph,
  which reads that element's computed background and radius.

## Changing the package

Layout, and the rule that keeps it worth having:

```
src/core/   plain DOM and numbers. NEVER imports vue.
src/vue/    renders and forwards elements to the core host. No animation logic.
```

A React adapter is planned, and it only stays cheap while that line holds.

Invariants to preserve:

- **No runtime dependencies.** The spring integrator, the easings, the tween and
  the text splitter are all in `src/core/motion/`. Add to them rather than
  reaching for a library.
- **Every visual value is a token with a literal fallback,** declared on
  `:where(:root)` in `src/core/styles.css`. The package has to look finished on
  a page with no design system, which is what a reference to someone else's
  design tokens breaks.
- **The queue replaces state, never mutates it.** Both the array and the changed
  item. Vue's `shallowRef` and React's `useSyncExternalStore` both depend on it.
- **Class names are public API.** They are unscoped, prefixed `sbt-`, and people
  target them. Renaming one is a breaking change.
- **Read `element.js` before animating anything by hand.** Transform state is
  kept in memory and never read back from the DOM, and mixing in a direct
  `style.transform` write corrupts it.

## Verifying a change

```sh
npm run build          # the package, both entries plus style.css
npm run demo           # the showcase, with sliders for the physics
```

The demo resolves the library to `../src`, so it hot-reloads while you work and
is the fastest way to see a change. Every feature has a section there. Adding a
feature without adding its section leaves it undemonstrated and, in practice,
untested.
