import { useEffect, useRef, type RefObject } from "react"

/**
 * Options for useClickOutside hook
 */
interface UseClickOutsideOptions {
  /**
   * Whether the listener is enabled (default: true)
   */
  enabled?: boolean

  /**
   * Event type to listen for (default: "mousedown")
   */
  eventType?: "mousedown" | "mouseup" | "click"

  /**
   * Additional refs to exclude from click-outside detection
   */
  excludeRefs?: RefObject<HTMLElement>[]
}

/**
 * Custom hook to detect clicks outside of a specified element.
 * Useful for closing dropdowns, modals, and popovers.
 *
 * @param ref - Reference to the element to monitor
 * @param handler - Callback function when click outside is detected
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * const dropdownRef = useRef<HTMLDivElement>(null)
 *
 * useClickOutside(dropdownRef, () => {
 *   setIsOpen(false)
 * })
 *
 * return <div ref={dropdownRef}>Dropdown content</div>
 * ```
 *
 * @example
 * ```tsx
 * // With multiple excluded refs
 * const dropdownRef = useRef<HTMLDivElement>(null)
 * const buttonRef = useRef<HTMLButtonElement>(null)
 *
 * useClickOutside(dropdownRef, () => setIsOpen(false), {
 *   excludeRefs: [buttonRef]
 * })
 * ```
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent) => void,
  options: UseClickOutsideOptions = {},
) {
  const { enabled = true, eventType = "mousedown", excludeRefs = [] } = options
  const handlerRef = useRef(handler)

  // Update handler ref when handler changes
  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    if (!enabled) return

    const listener = (event: MouseEvent) => {
      const target = event.target as Node

      // Check if click is inside the main ref
      if (!ref.current || ref.current.contains(target)) {
        return
      }

      // Check if click is inside any excluded refs
      for (const excludeRef of excludeRefs) {
        if (excludeRef.current && excludeRef.current.contains(target)) {
          return
        }
      }

      // Click is outside all refs - trigger handler
      handlerRef.current(event)
    }

    document.addEventListener(eventType, listener)
    return () => document.removeEventListener(eventType, listener)
  }, [ref, enabled, eventType, excludeRefs])
}

/**
 * Hook to detect clicks outside multiple elements.
 * All refs must be clicked outside for the handler to trigger.
 *
 * @param refs - Array of references to monitor
 * @param handler - Callback function when click outside is detected
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * const modalRef = useRef<HTMLDivElement>(null)
 * const sidebarRef = useRef<HTMLDivElement>(null)
 *
 * useClickOutsideMultiple([modalRef, sidebarRef], () => {
 *   closeAll()
 * })
 * ```
 */
export function useClickOutsideMultiple<T extends HTMLElement = HTMLElement>(
  refs: RefObject<T | null>[],
  handler: (event: MouseEvent) => void,
  options: Omit<UseClickOutsideOptions, "excludeRefs"> = {},
) {
  const { enabled = true, eventType = "mousedown" } = options
  const handlerRef = useRef(handler)

  // Update handler ref when handler changes
  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    if (!enabled) return

    const listener = (event: MouseEvent) => {
      const target = event.target as Node

      // Check if click is inside any of the refs
      for (const ref of refs) {
        if (ref.current && ref.current.contains(target)) {
          return
        }
      }

      // Click is outside all refs - trigger handler
      handlerRef.current(event)
    }

    document.addEventListener(eventType, listener)
    return () => document.removeEventListener(eventType, listener)
  }, [refs, enabled, eventType])
}

/**
 * Hook to detect clicks outside with additional escape key support.
 * Useful for modals and dropdowns that should close on both click outside and Escape.
 *
 * @param ref - Reference to the element to monitor
 * @param handler - Callback function when click outside or Escape is detected
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * const modalRef = useRef<HTMLDivElement>(null)
 *
 * useClickOutsideWithEscape(modalRef, () => {
 *   setIsOpen(false)
 * })
 * ```
 */
export function useClickOutsideWithEscape<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  handler: () => void,
  options: UseClickOutsideOptions = {},
) {
  const { enabled = true } = options
  const handlerRef = useRef(handler)

  // Update handler ref when handler changes
  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  // Click outside detection
  useClickOutside(ref, () => handlerRef.current(), options)

  // Escape key detection
  useEffect(() => {
    if (!enabled) return

    const handleEscape = (event: KeyboardEvent) => {
      // Escape cancels an IME composition first; do not close on that keystroke
      if (event.isComposing) return
      if (event.key === "Escape") {
        handlerRef.current()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [enabled])
}
