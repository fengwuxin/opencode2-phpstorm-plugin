import type { SelectHTMLAttributes, ReactNode } from "react"
import { forwardRef } from "react"

/**
 * Select size options
 */
export type SelectSize = "sm" | "md" | "lg"

/**
 * Option type for the Select component
 */
interface SelectOption {
  /** The value of the option */
  value: string
  /** Display text for the option */
  label: string
  /** Whether the option is disabled */
  disabled?: boolean
}

/**
 * Props for the Select component
 */
interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  /** Label text displayed above the select */
  label?: string
  /** Error message (adds red styling and displays below select) */
  error?: string
  /** Helper text displayed below the select */
  helperText?: string
  /** Select size (default: "md") */
  selectSize?: SelectSize
  /** Array of option objects */
  options: SelectOption[]
  /** Placeholder option text */
  placeholder?: string
  /** Icon displayed on the left side */
  leftIcon?: ReactNode
}

const sizeClasses: Record<SelectSize, string> = {
  sm: "h-7 px-2 text-xs",
  md: "h-9 px-3 text-sm",
  lg: "h-10 px-4 text-base",
}

/**
 * A select dropdown component with label, error, helper text, and icon support.
 *
 * @example
 * ```tsx
 * const options = [
 *   { value: 'option1', label: 'Option 1' },
 *   { value: 'option2', label: 'Option 2', disabled: true },
 *   { value: 'option3', label: 'Option 3' },
 * ]
 *
 * <Select
 *   label="请选择"
 *   options={options}
 *   placeholder="请选择..."
 *   error={errors.selection}
 * />
 * ```
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      selectSize = "md",
      options,
      placeholder,
      leftIcon,
      className = "",
      disabled,
      id,
      ...props
    },
    ref,
  ) => {
    const selectId = id || `select-${Math.random().toString(36).substring(7)}`
    const sizeClass = sizeClasses[selectSize]
    const hasError = !!error

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none z-10">
              {leftIcon}
            </div>
          )}

          <select
            ref={ref}
            id={selectId}
            className={`
              w-full modern-input ${sizeClass}
              ${leftIcon ? "pl-10" : ""}
              pr-8
              ${hasError ? "border-red-500 focus:ring-red-500/20 focus:border-red-500" : ""}
              ${disabled ? "bg-gray-100 dark:bg-gray-900 cursor-not-allowed opacity-60" : ""}
              appearance-none cursor-pointer
              ${className}
            `}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {error && (
          <p id={`${selectId}-error`} className="mt-1.5 text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={`${selectId}-helper`} className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    )
  },
)

Select.displayName = "Select"
