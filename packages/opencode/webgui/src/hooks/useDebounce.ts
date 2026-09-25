import { useState, useEffect, useRef, useCallback } from "react"

/**
 * Debounces a value by delaying updates until the value has stopped changing
 * for the specified delay period.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * const [searchQuery, setSearchQuery] = useState("")
 * const debouncedQuery = useDebounce(searchQuery, 500)
 *
 * useEffect(() => {
 *   // This will only run 500ms after the user stops typing
 *   performSearch(debouncedQuery)
 * }, [debouncedQuery])
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      window.clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Returns a debounced version of a callback function.
 * The callback will only be invoked after it hasn't been called
 * for the specified delay period.
 *
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @returns A debounced version of the callback
 *
 * @example
 * ```tsx
 * const handleSearch = useDebouncedCallback((query: string) => {
 *   performSearch(query)
 * }, 500)
 *
 * <input onChange={(e) => handleSearch(e.target.value)} />
 * ```
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300,
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<number | null>(null)
  const callbackRef = useRef(callback)

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = window.setTimeout(() => {
        callbackRef.current(...args)
      }, delay)
    },
    [delay],
  )
}

/**
 * Advanced debounce hook with additional control options.
 * Provides manual control over the debounce timer.
 *
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @returns Object with debounced callback and control functions
 *
 * @example
 * ```tsx
 * const { callback, cancel, flush, isPending } = useDebouncedCallbackAdvanced(
 *   (query: string) => performSearch(query),
 *   500
 * )
 *
 * <input
 *   onChange={(e) => callback(e.target.value)}
 *   onBlur={() => flush()} // Execute immediately on blur
 * />
 * <button onClick={cancel}>Cancel Search</button>
 * {isPending && <span>搜索中...</span>}
 * ```
 */
export function useDebouncedCallbackAdvanced<T extends (...args: any[]) => any>(callback: T, delay: number = 300) {
  const timeoutRef = useRef<number | null>(null)
  const callbackRef = useRef(callback)
  const argsRef = useRef<Parameters<T> | null>(null)
  const [isPending, setIsPending] = useState(false)

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const cancel = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
      argsRef.current = null
      setIsPending(false)
    }
  }, [])

  const flush = useCallback(() => {
    if (timeoutRef.current !== null && argsRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
      callbackRef.current(...argsRef.current)
      argsRef.current = null
      setIsPending(false)
    }
  }, [])

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }

      argsRef.current = args
      setIsPending(true)

      timeoutRef.current = window.setTimeout(() => {
        callbackRef.current(...args)
        argsRef.current = null
        timeoutRef.current = null
        setIsPending(false)
      }, delay)
    },
    [delay],
  )

  return {
    callback: debouncedCallback,
    cancel,
    flush,
    isPending,
  }
}
