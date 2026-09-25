import { t } from "../../../lib/i18n"
import { useState } from "react"

interface ToolDetailsProps {
  input?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export function ToolDetails({ input, metadata }: ToolDetailsProps) {
  const [showDetails, setShowDetails] = useState(false)

  const hasInput = input && Object.keys(input).length > 0
  const hasMetadata = metadata && Object.keys(metadata).filter((k) => k !== "output" && k !== "preview").length > 0

  if (!hasInput && !hasMetadata) {
    return null
  }

  return (
    <div className="border-t border-gray-100 dark:border-gray-800">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
      >
        <span className="font-medium">{t("详情")}</span>
        <svg
          viewBox="0 0 24 24"
          className={`w-3 h-3 transition-transform duration-150 ${showDetails ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {showDetails && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          {/* Input arguments */}
          {hasInput && (
            <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-800">
              <div className="text-[10px] uppercase font-semibold text-gray-500 dark:text-gray-400 mb-1">{t("输入")}</div>
              <div className="text-xs bg-white dark:bg-gray-900 rounded p-1.5 overflow-x-auto">
                <pre className="font-mono text-gray-700 dark:text-gray-300">{JSON.stringify(input, null, 2)}</pre>
              </div>
            </div>
          )}

          {/* Metadata */}
          {hasMetadata && (
            <div className="px-3 py-1.5">
              <div className="text-[10px] uppercase font-semibold text-gray-500 dark:text-gray-400 mb-1">Metadata</div>
              <div className="text-xs bg-white dark:bg-gray-900 rounded p-1.5 overflow-x-auto max-h-40 overflow-y-auto">
                <pre className="font-mono text-gray-700 dark:text-gray-300">
                  {JSON.stringify(
                    Object.fromEntries(Object.entries(metadata!).filter(([k]) => k !== "output" && k !== "preview")),
                    null,
                    2,
                  )}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
