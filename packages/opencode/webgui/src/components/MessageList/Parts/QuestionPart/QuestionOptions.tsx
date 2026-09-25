import { t } from "../../../../lib/i18n"
import { cn } from "../../../../utils/classNames"
import type { QuestionInfo } from "@opencode-ai/sdk/v2/client"

interface QuestionOptionsProps {
  question: QuestionInfo
  answers: string[]
  customInput: string
  onToggleOption: (label: string) => void
  onCustomInputChange: (value: string) => void
  isCustomSelected: boolean
  onSelectCustom: () => void
  isEditing: boolean
  onStartEditing: () => void
  onFinishEditing: () => void
}

export function QuestionOptions({
  question,
  answers,
  customInput,
  onToggleOption,
  onCustomInputChange,
  isCustomSelected,
  onSelectCustom,
  isEditing,
  onStartEditing,
  onFinishEditing,
}: QuestionOptionsProps) {
  const isMultiple = question.multiple === true
  const allowCustom = question.custom !== false

  const handleOptionClick = (label: string) => {
    onToggleOption(label)
  }

  const handleCustomClick = () => {
    if (!isEditing) {
      onSelectCustom()
      onStartEditing()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onFinishEditing()
    }
    if (e.key === "Escape") {
      e.preventDefault()
      onFinishEditing()
    }
  }

  return (
    <div className="px-3 py-2">
      {/* Question text */}
      <div className="text-sm text-gray-800 dark:text-gray-200 mb-3">
        {question.question}
        {isMultiple && (
          <span className="text-gray-500 dark:text-gray-400 text-xs ml-2">(select all that apply)</span>
        )}
      </div>

      {/* Options list */}
      <div className="space-y-2">
        {question.options.map((option, index) => {
          const isSelected = answers.includes(option.label)
          return (
            <button
              key={index}
              onClick={() => handleOptionClick(option.label)}
              className={cn(
                "w-full text-left p-2 rounded border transition-colors",
                isSelected
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-[#e4e9f2] dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900"
              )}
            >
              <div className="flex items-start gap-2">
                <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 w-4 flex-shrink-0">
                  {index + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {isMultiple ? (
                      <span
                        className={cn(
                          "w-4 h-4 flex items-center justify-center border rounded text-xs",
                          isSelected
                            ? "border-blue-500 bg-blue-500 text-white"
                            : "border-gray-300 dark:border-gray-600"
                        )}
                      >
                        {isSelected && "✓"}
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "w-4 h-4 flex items-center justify-center border rounded-full",
                          isSelected
                            ? "border-blue-500 bg-blue-500"
                            : "border-gray-300 dark:border-gray-600"
                        )}
                      >
                        {isSelected && <span className="w-2 h-2 bg-white rounded-full" />}
                      </span>
                    )}
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isSelected ? "text-blue-700 dark:text-blue-300" : "text-gray-800 dark:text-gray-200"
                      )}
                    >
                      {option.label}
                    </span>
                    {!isMultiple && isSelected && (
                      <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
                    )}
                  </div>
                  {option.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">{option.description}</p>
                  )}
                </div>
              </div>
            </button>
          )
        })}

        {/* Custom input option */}
        {allowCustom && (
          <div
            className={cn(
              "w-full text-left p-2 rounded border transition-colors",
              isCustomSelected
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-[#e4e9f2] dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900"
            )}
          >
            <button onClick={handleCustomClick} className="w-full text-left">
              <div className="flex items-start gap-2">
                <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 w-4 flex-shrink-0">
                  {question.options.length + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {isMultiple ? (
                      <span
                        className={cn(
                          "w-4 h-4 flex items-center justify-center border rounded text-xs",
                          isCustomSelected
                            ? "border-blue-500 bg-blue-500 text-white"
                            : "border-gray-300 dark:border-gray-600"
                        )}
                      >
                        {isCustomSelected && "✓"}
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "w-4 h-4 flex items-center justify-center border rounded-full",
                          isCustomSelected
                            ? "border-blue-500 bg-blue-500"
                            : "border-gray-300 dark:border-gray-600"
                        )}
                      >
                        {isCustomSelected && <span className="w-2 h-2 bg-white rounded-full" />}
                      </span>
                    )}
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isCustomSelected ? "text-blue-700 dark:text-blue-300" : "text-gray-800 dark:text-gray-200"
                      )}
                    >
                      {t("输入你的回答")}
                    </span>
                    {!isMultiple && isCustomSelected && customInput && (
                      <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
                    )}
                  </div>
                </div>
              </div>
            </button>

            {/* Custom input textarea */}
            {isEditing && (
              <div className="mt-2 ml-6">
                <textarea
                  autoFocus
                  value={customInput}
                  onChange={(e) => onCustomInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={onFinishEditing}
                  placeholder={t("输入你的回答...")}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={2}
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {t("按 Enter 确认，Esc 取消")}
                </p>
              </div>
            )}

            {/* Show custom input value when not editing */}
            {!isEditing && customInput && (
              <div className="mt-1 ml-6">
                <p className="text-xs text-gray-500 dark:text-gray-400">{customInput}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
