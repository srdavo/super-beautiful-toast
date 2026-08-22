/**
 * Environment probes. Every one of these has to answer sensibly on a server,
 * where there is no window: the package must import cleanly under SSR and only
 * touch the DOM once it is mounted.
 */

export const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'

/**
 * Whether the user asked the system for less motion.
 *
 * Read on every call rather than cached: the setting can change while the page
 * is open, and a toast that animates because the tab was loaded an hour ago is
 * exactly the failure this query exists to prevent.
 */
export function prefersReducedMotion() {
    if (!isBrowser || typeof window.matchMedia !== 'function') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
