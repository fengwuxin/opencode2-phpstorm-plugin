import { useState } from "react"
import { cn } from "../../utils/classNames"

interface RetryPartProps {
  part: {
    id: string
    type: "retry"
    attempt: number
    error: {
      status?: number
      message?: string
      code?: string
    }
    time: {
      created: number
    }
  }
}

export function RetryPart({ part }: RetryPartProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="my-1 border border-orange-300 dark:border-orange-700 rounded-lg overflow-hidden bg-orange-50 dark:bg-orange-900/10">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors"
      >
        <svg
          className="w-3 h-3 text-orange-600 dark:text-orange-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span className="text-xs font-medium text-orange-700 dark:text-orange-300 flex-1">
          Retry attempt {part.attempt}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={cn(
            "w-3 h-3 text-orange-600 dark:text-orange-400 transition-transform duration-150",
            isExpanded && "rotate-90",
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-orange-200 dark:border-orange-800 bg-white dark:bg-gray-950">
          {/* Error details */}
          <div className="px-3 py-2">
            <div className="text-[10px] uppercase font-semibold text-gray-500 dark:text-gray-400 mb-1.5">错误</div>
            <div className="space-y-1">
              {part.error.status && (
                <div className="text-xs text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">状态：</span> {part.error.status}
                </div>
              )}
              {part.error.code && (
                <div className="text-xs text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">代码：</span> {part.error.code}
                </div>
              )}
              {part.error.message && (
                <div className="text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/10 rounded p-2 mt-1">
                  {part.error.message}
                </div>
              )}
            </div>
          </div>

          {/* Timestamp */}
          <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
            <div className="text-[10px] text-gray-500 dark:text-gray-400">
              {new Date(part.time.created).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
