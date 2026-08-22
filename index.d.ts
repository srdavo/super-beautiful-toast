import type { Component, DefineComponent, Plugin } from 'vue'

export type ToastPosition =
    | 'top-left' | 'top-center' | 'top-right'
    | 'center-left' | 'center-right'
    | 'bottom-left' | 'bottom-center' | 'bottom-right'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral' | (string & {})

export interface ToastTint {
    bg: string
    fg: string
}

export interface ToastOriginStyle {
    background?: string
    boxShadow?: string
    borderRadius?: string
}

export interface ToastOptions {
    message?: string
    /** A built-in name (check_circle, error, warning, info), an emoji, or null. */
    icon?: string | null
    variant?: ToastVariant
    position?: ToastPosition
    /** Milliseconds. 0 stays until dismissed. */
    duration?: number
    /** The element the toast grows out of. */
    origin?: HTMLElement | null
    originStyle?: ToastOriginStyle | null
    component?: Component | null
    props?: Record<string, unknown>
    tint?: ToastTint | null
    /** Defaults to true when duration is 0. */
    closable?: boolean
    /** Repeats with the same key refresh the live toast instead of stacking. */
    key?: string | null
}

export interface ToastItem extends Required<Pick<ToastOptions, 'message' | 'variant' | 'position' | 'duration'>> {
    id: number
    icon: string | null
    origin: HTMLElement | null
    originStyle: ToastOriginStyle | null
    component: Component | null
    props: Record<string, unknown>
    tint: ToastTint | null
    closable: boolean
    closing: boolean
    key: string | null
    restartedAt: number
}

export interface QueueSettings {
    position: ToastPosition
    duration: number
    /** Live toasts per position. 0 means no limit. */
    max: number
}

export interface ToastQueue {
    show(options?: ToastOptions): number
    dismiss(id: number): void
    dismissAll(): void
    remove(id: number): void
    get(id: number): ToastItem | null
    subscribe(listener: (items: ToastItem[]) => void): () => void
    configure(settings: Partial<QueueSettings>): void
    getItems(): ToastItem[]
    getSettings(): QueueSettings
}

export interface ToastApi {
    show(options: ToastOptions): number
    success(message: string, options?: ToastOptions): number
    error(message: string, options?: ToastOptions): number
    warning(message: string, options?: ToastOptions): number
    info(message: string, options?: ToastOptions): number
    neutral(message: string, options?: ToastOptions): number
    dismiss(id: number): void
    dismissAll(): void
    configure(settings: Partial<QueueSettings>): void
    queue: ToastQueue
}

export interface MorphOptions {
    stiffness?: number
    damping?: number
    velocity?: number
    sizeDuration?: number
    radiusDuration?: number
    contentDuration?: number
    colorDuration?: number
    colorDelay?: number
    shadowDuration?: number
    shadowDelay?: number
    contentScale?: number
    contentBlur?: number
    maxDuration?: number
}

export interface StackOptions {
    peek?: number
    scaleStep?: number
    minScale?: number
    maxVisible?: number
    gap?: number
    baseZ?: number
}

export interface GestureOptions {
    swipeThreshold?: number
    wheelThreshold?: number
    expandDragThreshold?: number
    downwardResistance?: number
    fadeDistance?: number
    wheelEndDelay?: number
}

export interface HostOptions {
    morph?: MorphOptions
    stack?: StackOptions
    gestures?: GestureOptions
    relayoutDuration?: number
    expandDuration?: number
    expandDamping?: number
    expandStagger?: number
    enterDuration?: number
    enterDistance?: number
    enterBlur?: number
    exitDuration?: number
    exitDistance?: number
    exitBlur?: number
    collapseDelay?: number
    fadeDistance?: number
}

export interface ToastHostProps {
    queue?: ToastQueue
    options?: HostOptions
    positions?: ToastPosition[]
    iconComponent?: string | Component | null
    teleportTo?: string | HTMLElement
    closeLabel?: string
    stagger?: boolean
}

export declare const ToastHost: DefineComponent<ToastHostProps>
export declare const ToastMessage: DefineComponent<{
    message?: string
    icon?: string | null
    iconComponent?: string | Component | null
    variant?: ToastVariant
    closable?: boolean
    closeLabel?: string
    stagger?: boolean
}>
export declare const ToastIcon: DefineComponent<{ name?: string | null, component?: string | Component | null }>

export declare function useToast(queue?: ToastQueue): ToastApi
export declare function createToastApi(queue: ToastQueue): ToastApi
export declare const toast: ToastApi

export declare function createToastQueue(settings?: Partial<QueueSettings>): ToastQueue
export declare const toastQueue: ToastQueue

export declare const TOAST_POSITIONS: readonly ToastPosition[]
export declare const DEFAULT_SETTINGS: QueueSettings
export declare const HOST_DEFAULTS: Required<Omit<HostOptions, 'morph' | 'stack' | 'gestures'>> & {
    morph: Required<MorphOptions>
    stack: Required<StackOptions>
    gestures: Required<GestureOptions>
}
export declare const STACK_DEFAULTS: Required<StackOptions>
export declare const MORPH_DEFAULTS: Required<MorphOptions>
export declare const GESTURE_DEFAULTS: Required<GestureOptions>

export interface PluginOptions {
    componentName?: string
    defaults?: Partial<QueueSettings>
}

export declare const SuperBeautifulToast: Plugin<PluginOptions>
export default SuperBeautifulToast

declare module 'vue' {
    interface ComponentCustomProperties {
        $toast: ToastApi
    }
}
