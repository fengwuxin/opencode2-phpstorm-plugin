import { cn } from "../../../../utils/classNames"
import type { QuestionInfo } from "@opencode-ai/sdk/v2/client"

interface ConfirmTabProps {
  questions: QuestionInfo[]
  answers: string[][]
  onSubmit: () => void
  onDismiss: () => void
  isLoading: boolean
}

export function ConfirmTab({ questions, answers, onSubmit, onDismiss, isLoading }: ConfirmTabProps) {
  const allAnswered = questions.every((_, index) => (answers[index]?.length ?? 0) > 0)

  return (
    <div className="px-3 py-2">
      {/* Review header */}
      <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">确认你的回答</div>

      {/* Summary of answers */}
      <div className="space-y-2 mb-4">
        {questions.map((question, index) => {
          const questionAnswers = answers[index] ?? []
          const hasAnswer = questionAnswers.length > 0

          return (
            <div
              key={index}
              className={cn(
                "p-2 rounded border",
                hasAnswer
                  ? "border-[#e4e9f2] dark:border-gray-700 bg-white dark:bg-gray-900"
                  : "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20"
              )}
            >
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{question.header}</div>
              {hasAnswer ? (
                <div className="text-sm text-gray-800 dark:text-gray-200">{questionAnswers.join(", ")}</div>
              ) : (
                <div className="text-sm text-amber-600 dark:text-amber-400">(not answered)</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onSubmit}
          disabled={isLoading || !allAnswered}
          className={cn(
            "px-3 py-1.5 text-xs rounded font-medium transition-colors",
            allAnswered
              ? "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
          )}
        >
          {isLoading ? "提交中..." : "Submit"}
        </button>
        <button
          onClick={onDismiss}
          disabled={isLoading}
          className="px-3 py-1.5 text-xs rounded font-medium bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          Dismiss
        </button>
      </div>

      {/* Help text */}
      {!allAnswered && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
          提交前请先回答所有问题。
        </p>
      )}
    </div>
  )
}
