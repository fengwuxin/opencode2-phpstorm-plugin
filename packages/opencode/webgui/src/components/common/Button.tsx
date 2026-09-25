import { t } from "../../lib/i18n"
import type { ButtonHTMLAttributes, ReactNode } from "react"

/**
 * Button variant types defining the visual style
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"

/**
 * Button size options
 */
export type ButtonSize = "xs" | "sm" | "md" | "lg"

/**
 * Props for the Button component
 */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant (default: "primary") */
  variant?: ButtonVariant
  /** Button size (default: "md") */
  size?: ButtonSize
  /** Show loading spinner and disable button (default: false) */
  loading?: boolean
  /** Button content */
  children: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "modern-button-primary",
  secondary: "modern-button-secondary",
  ghost: "modern-button-ghost",
  danger: "modern-button-danger",
}

const sizeClasses: Record<ButtonSize, string> = {
  xs: "h-6 px-2 text-xs",
  sm: "h-7 px-2.5 text-sm",
  md: "h-9 px-3 text-sm",
  lg: "h-10 px-4 text-base",
}

/**
 * A flexible button component with multiple variants, sizes, and loading state support.
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Click me
 * </Button>
 *
 * <Button variant="danger" loading={isSubmitting}>
 *   Delete
 * </Button>
 * ```
 */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const variantClass = variantClasses[variant]
  const sizeClass = sizeClasses[size]

  const title = typeof props.title === "string" ? props.title : undefined
  const tip = typeof title === "string" && title.length > 0 ? title : undefined

  return (
    <button
      className={`modern-button ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled || loading}
      data-tip={tip}
      {...props}
    >
      {loading ? (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{t("加载中...")}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
