import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from "./common"

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: "danger" | "warning" | "info"
  isLoading?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "确认",
  cancelText = "取消",
  variant = "danger",
  isLoading = false,
}: ConfirmModalProps) {
  const variantStyles = {
    danger: {
      buttonVariant: "danger" as const,
      buttonClass: undefined,
      text: "text-red-900 dark:text-red-100",
    },
    warning: {
      buttonVariant: "primary" as const,
      buttonClass: "bg-amber-500 hover:bg-amber-600 text-white border-transparent",
      text: "text-amber-900 dark:text-amber-100",
    },
    info: {
      buttonVariant: "primary" as const,
      buttonClass: undefined,
      text: "text-blue-900 dark:text-blue-100",
    },
  }

  const styles = variantStyles[variant]

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" closeOnEscape={!isLoading}>
      <ModalHeader>
        <h3 className={`text-lg font-semibold ${styles.text}`}>{title}</h3>
      </ModalHeader>

      <ModalBody>
        <p className="text-sm text-gray-700 dark:text-gray-300">{message}</p>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button variant={styles.buttonVariant} onClick={onConfirm} loading={isLoading} className={styles.buttonClass}>
          {confirmText}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
