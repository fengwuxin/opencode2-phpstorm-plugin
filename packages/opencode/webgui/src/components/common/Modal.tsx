import type { ReactNode } from "react"
import { useEffect } from "react"

/**
 * Props for the Modal component
 */
interface ModalProps {
  /** Control modal visibility */
  isOpen: boolean
  /** Called when the modal should close */
  onClose: () => void
  /** Modal content */
  children: ReactNode
  /** Modal width (default: "md") */
  size?: "sm" | "md" | "lg" | "xl"
  /** Allow ESC key to close (default: true) */
  closeOnEscape?: boolean
  /** Allow backdrop click to close (default: true) */
  closeOnBackdropClick?: boolean
}

const sizeClasses: Record<string, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
}

/**
 * A modal dialog with backdrop, keyboard support, and customizable behavior.
 *
 * @example
 * ```tsx
 * <Modal isOpen={isOpen} onClose={handleClose} size="md">
 *   <ModalHeader onClose={handleClose}>
 *     <h3>确认操作</h3>
 *   </ModalHeader>
 *   <ModalBody>
 *     <p>Are you sure?</p>
 *   </ModalBody>
 *   <ModalFooter>
 *     <Button onClick={handleClose}>取消</Button>
 *     <Button variant="danger">确认</Button>
 *   </ModalFooter>
 * </Modal>
 * ```
 */
export function Modal({
  isOpen,
  onClose,
  children,
  size = "md",
  closeOnEscape = true,
  closeOnBackdropClick = true,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, closeOnEscape, onClose])

  if (!isOpen) return null

  const sizeClass = sizeClasses[size]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all"
      onClick={closeOnBackdropClick ? onClose : undefined}
    >
      <div
        className={`modern-card ${sizeClass} w-full mx-4 overflow-hidden transform transition-all scale-100`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * Props for the ModalHeader component
 */
interface ModalHeaderProps {
  /** Header content */
  children: ReactNode
  /** Optional close button handler */
  onClose?: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * Modal header section with optional close button
 */
export function ModalHeader({ children, onClose, className = "" }: ModalHeaderProps) {
  return (
    <div
      className={`px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between ${className}`}
    >
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
          aria-label="关闭弹窗"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

/**
 * Props for the ModalBody component
 */
interface ModalBodyProps {
  /** Body content */
  children: ReactNode
  /** Additional CSS classes */
  className?: string
}

/**
 * Modal main content area
 */
export function ModalBody({ children, className = "" }: ModalBodyProps) {
  return <div className={`px-4 py-4 ${className}`}>{children}</div>
}

/**
 * Props for the ModalFooter component
 */
interface ModalFooterProps {
  /** Footer content (typically action buttons) */
  children: ReactNode
  /** Additional CSS classes */
  className?: string
}

/**
 * Modal footer section with flex layout for action buttons
 */
export function ModalFooter({ children, className = "" }: ModalFooterProps) {
  return (
    <div
      className={`px-4 py-3 bg-gray-50 dark:bg-gray-950/50 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2 ${className}`}
    >
      {children}
    </div>
  )
}
