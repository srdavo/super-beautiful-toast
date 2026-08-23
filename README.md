# super-beautiful-toast

Toast notifications for Vue 3 where the button you pressed becomes the toast.

Press "Save" and the button itself lifts off, travels, grows and settles into the message. The path is a spring simulation, not a canned curve, so it arcs and overshoots the way real objects do. Toasts pile up like a deck of cards, fan out when you hover them, and can be thrown away with a drag or a scroll.

No dependencies. Around 13 kB gzipped, styles included.

```sh
npm install super-beautiful-toast
```

## Demo

**[srdavo.github.io/super-beautiful-toast](https://srdavo.github.io/super-beautiful-toast/)**

Every feature has a section, and the morph and the deck have sliders for their
physics. Or run it against your own changes:

```sh
npm install
npm run demo        # hot-reloads from src/
```

## Quick start

Mount the host once, anywhere in your tree. It teleports to `<body>` on its own.

```vue
<script setup>
import { ToastHost } from 'super-beautiful-toast'
import 'super-beautiful-toast/style.css'
</script>

<template>
    <RouterView />
    <ToastHost />
</template>
```

Then call it from wherever, component or not:

```js
import { toast } from 'super-beautiful-toast'

toast.success('Movement saved')
toast.error('Could not save')
toast.info('Syncing…')
toast.neutral('Copied to clipboard')
```

Inside a component you can also use `useToast()`, which returns the same API.

Every call returns an id, so you can close a toast by hand later:

```js
const id = toast.info('Uploading…', { duration: 0 })
await upload()
toast.dismiss(id)
```

## The morph

Pass the element that triggered the action and the toast grows out of it:

```js
function save(event) {
    toast.success('Saved', { origin: event.currentTarget })
}
```

At frame zero the toast is a copy of your button: same size, same position, same background, same corner radius. Then it travels. Without an `origin` you get a plain slide-in, which is the right thing when nothing on screen caused the message.

One case needs care. If the button lives in a modal that closes on success, the button is gone before the toast can measure it. Fire the toast, wait a tick, then close:

```js
await save(payload)
toast.success('Created', { origin: event.currentTarget })
await nextTick()
closeModal()
```

## Options

Anything accepted by `toast.show(options)` also works as the second argument of `success`, `error`, `warning`, `info` and `neutral`.

| Option | Type | Default | What it does |
|---|---|---|---|
| `message` | string | `''` | The text. |
| `icon` | string \| null | per variant | A built-in name, an emoji, or `null` for none. See [Icons](#icons). |
| `variant` | string | `'neutral'` | `success`, `error`, `warning`, `info`, `neutral`, or one of your own. |
| `position` | string | `'top-center'` | One of the eight anchors below. |
| `duration` | number | `4000` | Milliseconds. `0` stays until dismissed. |
| `origin` | HTMLElement | `null` | The element that becomes the toast. |
| `originStyle` | object | read from `origin` | `{ background, boxShadow, borderRadius }` if you want the morph to start from something other than the button's computed style. |
| `component` | Component | `null` | Your own content instead of the default message. |
| `props` | object | `{}` | Props for that component. |
| `tint` | `{ bg, fg }` | `null` | Colours for this toast only. Any CSS colour, including `var(...)`. |
| `closable` | boolean | `true` when `duration` is `0` | Shows a close button. |
| `key` | string | `null` | Repeats with the same key refresh the live toast instead of stacking copies. |

Global defaults:

```js
toast.configure({ position: 'bottom-right', duration: 6000, max: 3 })
```

`max` is how many live toasts a position holds. When a new one arrives past the limit, the oldest leaves. Set it to `0` for no limit.

## Positions

`top-left` · `top-center` (default) · `top-right` · `center-left` · `center-right` · `bottom-left` · `bottom-center` · `bottom-right`

There is no dead centre. That belongs to modals.

To render only some of them:

```vue
<ToastHost :positions="['top-center', 'bottom-right']" />
```

## The deck

Toasts in the same position stack like cards. The newest sits in front at full size; each older one shrinks, peeks out behind it and drops a layer. Three are drawn at a time and the rest wait.

Hover the deck and it fans out into full rows, with the countdowns paused while you read. Move away and it collapses again. On touch, where there is no hover, dragging a card down opens it.

Every card can be thrown away: drag it up past 48 px, or scroll up over it. Both continue from wherever the card is, so an interrupted gesture never snaps back first.

## Theming

Every value is a custom property declared on `:where(:root)`, which carries no specificity. Redefining one anywhere in your own CSS wins, with no `!important` and no cascade fight.

```css
:root {
    --sbt-bg: #202026;
    --sbt-fg: #f2f2f5;
    --sbt-radius: 12px;
    --sbt-shadow: 0 2px 20px rgba(0, 0, 0, 0.5);
}
```

| Token | Default | |
|---|---|---|
| `--sbt-bg` / `--sbt-fg` | `#ffffff` / `#1b1b1f` | Neutral surface. Dark values apply under `prefers-color-scheme: dark`. |
| `--sbt-radius` | `32px` | Corner radius of the card. |
| `--sbt-shadow` | two-layer soft shadow | |
| `--sbt-padding` | `12px 16px` | |
| `--sbt-max-width` | `min(460px, 100vw - 32px)` | |
| `--sbt-gap` | `10px` | Between icon and text. |
| `--sbt-font-family` | `inherit` | Along with `--sbt-font-size`, `--sbt-line-height`, `--sbt-font-weight`. |
| `--sbt-z-index` | `2100` | |
| `--sbt-edge-offset` | `16px` | Distance from the screen edge. |
| `--sbt-success-bg` / `-fg` | green pair | Same for `error`, `warning`, `info`. |

Three levels of control, from broad to narrow:

```css
/* 1. everything */
:root { --sbt-bg: #202026; }

/* 2. a variant of your own */
.sbt-variant-launch { --sbt-toast-bg: #2b1b4d; --sbt-toast-fg: #e9ddff; }
```

```js
toast.show({ message: 'Deploying', variant: 'launch' })

// 3. one toast
toast.show({ message: 'Just this one', tint: { bg: '#2b1b4d', fg: '#e9ddff' } })
```

Class names are stable and unscoped, all prefixed `sbt-`, so `.sbt-shell`, `.sbt-body` and `.sbt-message` are safe to target directly.

## Icons

Four icons ship as inline SVG: `check_circle`, `error`, `warning`, `info`. They are what the variants use by default, so a blank page looks finished with no font to load.

Anything else you pass is printed as it is, which makes emoji work:

```js
toast.show({ message: 'Shipped', icon: '🎉' })
toast.show({ message: 'No icon', icon: null })
```

To use your own icon system, point the host at it. The name is handed to that component as its content:

```vue
<ToastHost icon-component="md-icon" />
<!-- renders <md-icon class="sbt-icon">check_circle</md-icon> -->
```

It accepts a tag name or a component, so an icon font, a custom element or a Vue component all work.

## Your own content

```js
import MyToast from './MyToast.vue'

toast.show({
    component: markRaw(MyToast),
    props: { orderId: 42 },
    duration: 0,
})
```

Your component gets those props inside the toast skin and can close itself by emitting `close`. The skin, the stacking, the gestures and the timer all keep working.

## Tuning

The host takes an options object. Everything below is optional, and what you leave out keeps its default.

```vue
<ToastHost :options="{
    morph: { stiffness: 144, damping: 14, velocity: 2400 },
    stack: { peek: 16, scaleStep: 0.05, maxVisible: 3, gap: 8 },
    gestures: { swipeThreshold: 48, wheelThreshold: 80 },
    relayoutDuration: 0.6,
    expandDuration: 0.55,
}" />
```

| Group | Key | Default | What it changes |
|---|---|---|---|
| `morph` | `stiffness` | `144` | How hard the toast is pulled toward its slot. |
| | `damping` | `14` | Lower bounces more. At `24` it barely overshoots. |
| | `velocity` | `2400` | The initial kick. This is what bends the path into an arc. Set it to `0` and the toast travels in a straight line. |
| | `sizeDuration` | `0.32` | Seconds for width and height. Landing well before the travel does is what makes it read as arriving rather than growing. |
| | `contentScale` / `contentBlur` | `2` / `8` | How far out of focus the content starts. |
| `stack` | `peek` | `16` | Pixels each older card shows. |
| | `scaleStep` | `0.05` | Size lost per card of depth. |
| | `maxVisible` | `3` | Cards drawn while collapsed. |
| | `gap` | `8` | Pixels between cards once expanded. |
| `gestures` | `swipeThreshold` | `48` | Pixels dragged up before letting go dismisses. |
| | `wheelThreshold` | `80` | Same for scroll. |
| | `expandDragThreshold` | `24` | Downward touch drag that opens the deck. |

The demo has sliders for all of them.

## Accessibility

Toasts are the opposite of modals: they never block the page, never trap focus and never dim anything behind them. The layer ignores the pointer entirely, so only the cards themselves are clickable.

- Text is mirrored into two visually hidden live regions that exist from mount, one polite and one assertive. Errors go to the assertive one. Regions that appear at the same moment as their content are unreliable, which is why these are separate from the visible cards.
- Cards hidden behind the deck are marked `aria-hidden`, so a screen reader reads what is on screen and nothing else.
- A toast with `duration: 0` gets a close button automatically. Without it, a keyboard user would have no way out, since the dismiss gestures need a pointer.
- Under `prefers-reduced-motion: reduce` there is no morph and no travel. Toasts appear and disappear in place, and the hover lift is off.

## Server-side rendering

The package imports cleanly on a server and renders nothing until it is mounted, so Nuxt and any other SSR setup work without a client-only wrapper.

## Using it without Vue

The engine has no Vue in it. The queue, the deck arithmetic, the gestures, the morph and the animation loop are plain DOM and plain numbers, and the Vue adapter is built entirely out of them.

```js
import { createToastQueue, createToastHost, computeStackLayout } from 'super-beautiful-toast/core'
```

A host needs three calls from whatever renders the DOM: `bind(element, id)` when a toast appears, `enter(element, id, done)` and `leave(element, id, done)` from its transition. That is the whole contract. A React adapter is on the list.

## How the travel works

Two things make the movement read as physical instead of animated.

The path is a simulation. `x` and `y` are two independent springs, integrated frame by frame with semi-implicit Euler, and both get an initial kick of the same size. Because the distances on each axis are different, equal pushes produce unequal curves, and the resulting 2D path bends. Launched from rest it would travel in a straight line.

The spring is underdamped. At `stiffness: 144, damping: 14` the damping ratio lands near 0.58, so the toast passes its target and settles back. Size finishes in about a third of a second while position keeps springing for roughly one, and that gap is what reads as "it arrived and is settling in".

Colour and shadow are handed to CSS transitions rather than animated in JavaScript. The browser interpolates them natively, and the package needs no colour parser. One catch worth knowing: a shadow will not interpolate from `none`, which is what most buttons have, so the morph starts from a transparent cast of the toast's own shadow instead.

## Not in this version

- No `action` button in the default content. Use `component` for an undo.
- No promise helper (`toast.promise(...)`).
- No React or vanilla adapter yet, though the core is ready for one.
- The `center-left` and `center-right` anchors sit at `top: 50%` and grow downward rather than centring the deck as a whole.

## Browser support

Anything with `Intl.Segmenter`, `Element.setPointerCapture` and `color-mix`, which means Safari 16.4+, Chrome 111+ and Firefox 113+. The letter reveal falls back to `Array.from` where `Intl.Segmenter` is missing.

## License

MIT © [Luis David](https://github.com/srdavo)
