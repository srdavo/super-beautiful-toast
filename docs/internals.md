# Internals

Notes for whoever iterates on this next, me included. The README says how to use
the package. This says why it is built the way it is, and which parts bit back
while it was being written.

## The split

```
src/core/          no Vue, no build step needed to read it
  queue.js         what toasts exist. Immutable state, observable.
  stack.js         rank → slot. Pure arithmetic, no DOM.
  timers.js        auto-dismiss with pause and resume.
  gestures.js      drag and wheel on one element, reported as intent.
  morph.js         the button-becomes-toast flight.
  host.js          the orchestrator. Owns everything above.
  env.js           isBrowser, prefersReducedMotion.
  styles.css       all of it, prefixed sbt-, tokens on :where(:root).
  motion/
    engine.js      spring and tween integrator, one shared rAF.
    easing.js      curves, including a spring step response.
    element.js     transform, opacity and blur per element.
    split.js       text into per-character spans.

src/vue/           the adapter, and nothing else
  ToastHost.vue    renders the layer, forwards elements to the host.
  ToastMessage.vue default content.
  ToastIcon.vue    icon resolution in three steps.
  useToast.js      ergonomics.
  plugin.js        optional app.use().
```

The boundary is real, not decorative. `core` never imports from `vue`, and the
adapter contains no animation logic. A React adapter would reimplement
`ToastHost.vue` and reuse everything else, which is the whole reason the queue
replaces its array on every change instead of mutating it.

## Anatomy of one toast

```
.sbt-layer              fixed, inset 0, pointer-events none, high z
  .sbt-announcer ×2     visually hidden live regions (polite, assertive)
  .sbt-stack.sbt-<pos>  position anchor, absolute, pointer-events none  ×8
    .sbt-toast          absolute. Its transform is the STACK's business.
                        ::before extends the hit area by 24px.
      .sbt-shell        the skin: background, radius, shadow. This is what morphs.
        .sbt-body       padding, and the content
          default content, or your component
```

Two layers matter. The shell is the skin and carries the visible geometry; the
body is the content and is focused separately. The mental trick behind the morph
is that the box you watch grow never distorts, and the thing that would distort
is hidden and blurred until it has already arrived.

The `.sbt-toast` and the `.sbt-shell` both carry transforms, on purpose. The
stack owns the toast's transform, the morph owns the shell's. They never touch
each other's.

## The morph

The shell starts as a copy of the button and travels to zero. `x` and `y` are
independent springs with an initial kick; `width`, `height` and `radius` are
tweens; the content unblurs and scales down from 2.

Numbers that matter, and why:

- `stiffness: 144, damping: 14` puts the damping ratio near 0.58, which
  overshoots visibly and settles. Raise damping to kill the bounce.
- The kick (`velocity: 2400`) is applied on both axes with the same magnitude
  but in the direction of the screen centre. Equal pushes over unequal distances
  is what bends the path. Without it the toast slides in a straight line.
- Size lands in 0.32s while position keeps springing for about a second. That
  gap is the whole effect. Match them and it reads as a box being resized.

Colour, shadow and the body's opacity are CSS transitions, not animated
channels. The browser interpolates them, so no colour parsing lives here.

## The deck

Not flex. Every `.sbt-toast` is absolutely positioned and its place comes from
`computeStackLayout`, which turns a rank into `{ y, scale, opacity, zIndex }`.
Rank 0 is the newest and sits in front.

`relayout(position, options)` applies those slots through `motionOf`. Its
`instantId` option places one toast without animating, which is what the
entering toast needs so the morph can measure a slot that is already in place.

Expanding uses the measured `offsetHeight` of each card plus a gap, a spring
curve and a per-card stagger. Collapsing waits 150 ms first, because crossing
the gap between two cards fires `mouseleave` and without the delay the deck
flickers.

## Gotchas, all of them paid for

1. **`backdrop-filter` does not work here.** It blurs up to the nearest backdrop
   root, and a `transform`, `will-change`, `filter` or `opacity < 1` on an
   ancestor creates one. `.sbt-toast` always has a transform, so the shell only
   ever sees its own area. Real glass would need the blurred element to sit
   outside any transformed ancestor, which the morph makes awkward. A
   translucent solid background is the workable version.

2. **The travelling skin must be `absolute` and anchored to its toast, never
   `fixed`.** An earlier version used fixed with viewport coordinates. Since the
   toast carries a transform it becomes the containing block, and the skin
   teleported.

3. **Freeze the body's width before the shell shrinks to the button.** Otherwise
   the text rewraps mid-flight, because the button is narrower, and the geometry
   jumps at the end.

4. **A shadow will not interpolate from `none`,** which is what buttons usually
   have, so it used to appear all at once on arrival. The morph starts from a
   transparent cast of the toast's own shadow instead: same offsets and blur,
   alpha zero.

5. **A CSS `transition: transform` on the shell fights the morph.** The engine
   writes the transform every frame and the transition drags behind it. The
   morph sets `transition: none` at frame zero, then installs transitions for
   colour and shadow only, and clears everything when it settles.

6. **`mouseenter` and `mouseleave` fire when ELEMENTS move, not only pointers.**
   During a morph the shell flies under a stationary cursor and fires both. So
   hover is gated while anything in that position is mid-morph, and when the
   morph settles the state is re-derived from `element.matches(':hover')`, which
   is a real hit test. Trusting the events is how decks open on their own.

7. **A leaving card keeps the z-index of its rank.** Lifted to the top, a card
   from the back jumps over the front one as it fades. Only rank 0 stays above.

8. **The letter reveal is for short messages only.** Past 64 characters it is
   hundreds of spans, it janks, and the effect is lost anyway. The spans are
   reverted once the last one lands.

   Splitting also has to leave the layout alone, and that is less obvious than
   it sounds. `ToastMessage` splits on mount, which runs BEFORE the enter hook,
   so the morph freezes the body's width around text that is already a row of
   inline-blocks. That row does not measure the same as the run of text it
   replaced (here 66.9px against 67.4px, and the sign of the difference depends
   on the string), so when the split reverted, the real text no longer fitted
   the frozen width and broke onto a second line until the morph settled and
   released it. `splitChars` now keeps words whole, holds a single-line text to
   one line, and freezes the box at the size it had before the split.

9. **Centred positions do not use `translate(-50%)` on the stack.** The stack is
   `left: 0; right: 0` and the toast gets `xPercent: -50` from the engine, so
   the centring composes with the rank transform instead of being overwritten
   by it.

10. **Never read the current transform back from the DOM.** `element.js` keeps
    every channel in memory and rewrites the whole transform string from that.
    Parsing a matrix out of `getComputedStyle` to find out where something is
    mid-flight is where this kind of code starts lying, especially when a
    gesture interrupts an animation.

11. **A CSS transition needs a reflow between the two values,** or the browser
    coalesces them and you get a jump. `void shell.offsetWidth` before setting
    the target colour is what arms it.

12. **The queue is immutable on purpose.** Both the array and the changed item
    are replaced. A `shallowRef` in Vue and a `useSyncExternalStore` in React
    both need identity changes to notice, and a deep reactive proxy over items
    holding DOM elements and components is a bad idea for other reasons.

13. **Vue re-invokes function refs whose identity changes,** so binding through
    `:ref="el => host.bind(el, id)"` unbinds and rebinds on every render. The
    host binds from the `@enter` hook instead, which receives the element once,
    and unbinds when the exit finishes.

14. **Every stack spans the full width, side anchors included.** An absolutely
    positioned box given only one horizontal offset shrinks to fit its
    contents, and the contents here are absolute too, so they contribute
    nothing: the stack measured 0px and every toast inside it wrapped to one
    character per line, then settled into a squashed two-line card. The centred
    anchors hid the bug because they already carried `left: 0; right: 0` for
    centring. The distance from the screen edge belongs to the toast, not to
    the stack.

## Lifecycle

Every morph registers an idempotent `settle()`. It is called by its own safety
timeout, or early by `leave()` if the toast is dismissed mid-flight. Nothing is
left frozen either way.

Gestures are locked while a toast is morphing. Timers pause on hover, on drag,
and for the whole position while the deck is open.

`destroy()` clears timers, detaches every gesture, settles every morph in
flight, and is called from `onBeforeUnmount`.

## Reduced motion

Two places handle it. `element.to()` lands instantly instead of animating, which
covers the stack, the exit and the letter reveal. And `host.enter()` skips the
morph entirely, so nothing is measured, hidden or restored. CSS turns off the
hover lift.

## Known limits

- `center-left` and `center-right` are anchored at `top: 50%` and grow
  downward. The deck as a whole is not vertically centred.
- Some browsers synthesise `mouseenter` after a touch, so hover and the drag
  gesture can both fire on a touch device. It has not been a problem in practice.
- The morph fades the body in and the letter reveal fades the letters in, which
  can read as a double fade. Drop one if it bothers you.
- No React or vanilla adapter yet. The core is ready for one.
