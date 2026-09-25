import { useDropdown } from "../hooks/useDropdown"

interface VariantSelectorProps {
  variants: string[] | undefined
  selectedVariant: string | undefined
  onSelect: (variant: string | undefined) => void
  disabled?: boolean
  isReasoningModel?: boolean
}

const formatVariantName = (variant: string) => {
  return variant.charAt(0).toUpperCase() + variant.slice(1)
}

export function VariantSelector({
  variants,
  selectedVariant,
  onSelect,
  disabled,
  isReasoningModel,
}: VariantSelectorProps) {
  const { isOpen, dropdownRef, close, toggle } = useDropdown()

  const hasVariants = variants && variants.length > 0
  const isDisabled = disabled || !hasVariants

  const handleSelect = (variant: string | undefined) => {
    onSelect(variant)
    close()
  }

  const getCurrentDisplay = () => {
    if (selectedVariant) return formatVariantName(selectedVariant)
    if (isDisabled && !isReasoningModel) return ""
    return "默认"
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggle}
        disabled={isDisabled}
        className="h-6 px-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        title="选择思考深度"
        data-tip="选择思考深度"
      >
        {/* Sparkles icon */}
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          />
        </svg>
        {getCurrentDisplay()}
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-1 min-w-[140px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden flex flex-col">
          {/* Options list */}
          <div className="overflow-y-auto flex-1">
            {/* Default option */}
            <button
              onClick={() => handleSelect(undefined)}
              className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 ${
                selectedVariant === undefined
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                  : "text-gray-900 dark:text-gray-100"
              }`}
            >
              <span className="font-medium">默认</span>
              {selectedVariant === undefined && (
                <svg className="w-4 h-4 ml-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>

            {/* Variant options */}
            {variants?.map((variant) => {
              const isSelected = selectedVariant === variant

              return (
                <button
                  key={variant}
                  onClick={() => handleSelect(variant)}
                  className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 last:border-0 ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                      : "text-gray-900 dark:text-gray-100"
                  }`}
                >
                  <span className="font-medium">{formatVariantName(variant)}</span>
                  {isSelected && (
                    <svg className="w-4 h-4 ml-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
