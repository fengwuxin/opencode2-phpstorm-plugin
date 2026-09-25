import type { ButtonHTMLAttributes, ReactNode } from "react"

/**
 * IconButton size options
 */
export type IconButtonSize = "sm" | "md" | "lg"

/**
 * Props for the IconButton component
 */
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button size (default: "md") */
  size?: IconButtonSize
  /** Icon content to display */
  icon: ReactNode
  /** Required accessibility label describing the button action */
  "aria-label": string
}

const sizeClasses: Record<IconButtonSize, string> = {
  sm: "w-6 h-6",
  md: "w-7 h-7",
  lg: "w-8 h-8",
}

const iconSizeClasses: Record<IconButtonSize, string> = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-5 h-5",
}

/**
 * A button component designed specifically for icons with consistent sizing and accessibility.
 *
 * @example
 * ```tsx
 * <IconButton
 *   size="md"
 *   icon={<XMarkIcon />}
 *   aria-label="关闭对话框"
 *   onClick={handleClose}
 * />
 * ```
 */
export function IconButton({ size = "md", icon, className = "", "aria-label": ariaLabel, ...props }: IconButtonProps) {
  const sizeClass = sizeClasses[size]
  const iconSizeClass = iconSizeClasses[size]

  const title = typeof props.title === "string" ? props.title : undefined
  const tip = typeof title === "string" && title.length > 0 ? title : undefined

  return (
    <button
      className={`modern-icon-button ${sizeClass} flex items-center justify-center ${className}`}
      aria-label={ariaLabel}
      data-tip={tip}
      {...props}
    >
      <div className={iconSizeClass}>{icon}</div>
    </button>
  )
}
