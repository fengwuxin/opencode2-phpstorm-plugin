import { useEffect, type ReactNode } from "react"

export type ToastVariant = "info" | "success" | "warning" | "error"

export interface Toast {
  id: string
  title?: string
  message: string
  variant: ToastVariant
  duration?: number // auto-dismiss after this many ms (0 = never)
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastProps {
  toast: Toast
  onDismiss: (id: string) => void
}

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; icon: ReactNode }> = {
  info: {
    bg: "bg-blue-50 dark:bg-blue-950",
    border: "border-blue-300 dark:border-blue-700",
    icon: (
      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  success: {
    bg: "bg-green-50 dark:bg-green-950",
    border: "border-green-300 dark:border-green-700",
    icon: (
      <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  warning: {
    bg: "bg-yellow-50 dark:bg-yellow-950",
    border: "border-yellow-300 dark:border-yellow-700",
    icon: (
      <svg
        className="w-5 h-5 text-yellow-600 dark:text-yellow-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
  },
  error: {
    bg: "bg-red-50 dark:bg-red-950",
    border: "border-red-300 dark:border-red-700",
    icon: (
      <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
}

/**
 * Toast notification component
 * Displays a dismissible notification message with different variants
 */
export function ToastComponent({ toast, onDismiss }: ToastProps) {
  const { bg, border, icon } = VARIANT_STYLES[toast.variant]

  // Auto-dismiss after duration (if specified)
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(toast.id)
      }, toast.duration)

      return () => clearTimeout(timer)
    }
  }, [toast.id, toast.duration, onDismiss])

  return (
    <div
      className={`${bg} ${border} border rounded-lg shadow-lg p-3 min-w-72 max-w-md animate-in slide-in-from-top-2 fade-in duration-200`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">{icon}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {toast.title && (
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{toast.title}</h4>
          )}
          <p className="text-sm text-gray-700 dark:text-gray-300">{toast.message}</p>
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              {toast.action.label}
            </button>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => onDismiss(toast.id)}
          className="flex-shrink-0 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          aria-label="忽略"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

/**
 * Toast container component
 * Renders all active toasts in a fixed position
 */
interface ToastContainerProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastComponent toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  )
}
