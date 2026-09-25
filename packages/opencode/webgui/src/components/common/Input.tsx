import type { InputHTMLAttributes, ReactNode } from "react"
import { forwardRef } from "react"

/**
 * Input size options
 */
export type InputSize = "sm" | "md" | "lg"

/**
 * Props for the Input component
 */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Label text displayed above the input */
  label?: string
  /** Error message (adds red styling and displays below input) */
  error?: string
  /** Helper text displayed below the input */
  helperText?: string
  /** Input size (default: "md") */
  inputSize?: InputSize
  /** Icon displayed on the left side */
  leftIcon?: ReactNode
  /** Icon displayed on the right side */
  rightIcon?: ReactNode
}

const sizeClasses: Record<InputSize, string> = {
  sm: "h-7 px-2 text-xs",
  md: "h-9 px-3 text-sm",
  lg: "h-10 px-4 text-base",
}

/**
 * A text input component with label, error, helper text, and icon support.
 *
 * @example
 * ```tsx
 * <Input
 *   label="Email"
 *   type="email"
 *   placeholder="Enter your email"
 *   error={errors.email}
 *   helperText="We'll never share your email"
 *   leftIcon={<EmailIcon />}
 * />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, helperText, inputSize = "md", leftIcon, rightIcon, className = "", disabled, id, ...props },
    ref,
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substring(7)}`
    const sizeClass = sizeClasses[inputSize]
    const hasError = !!error

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">{leftIcon}</div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={`
              w-full modern-input ${sizeClass}
              ${leftIcon ? "pl-10" : ""}
              ${rightIcon ? "pr-10" : ""}
              ${hasError ? "border-red-500 focus:ring-red-500/20 focus:border-red-500" : ""}
              ${disabled ? "bg-gray-100 dark:bg-gray-900 cursor-not-allowed opacity-60" : ""}
              ${className}
            `}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    )
  },
)

Input.displayName = "输入"
