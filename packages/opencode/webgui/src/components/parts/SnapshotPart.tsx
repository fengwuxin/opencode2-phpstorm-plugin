import { useState } from "react"

interface SnapshotPartProps {
  part: {
    id: string
    type: "snapshot"
    snapshot: string
  }
}

export function SnapshotPart({ part }: SnapshotPartProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="my-1 border border-purple-300 dark:border-purple-700 rounded-lg overflow-hidden bg-purple-50 dark:bg-purple-900/10">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-purple-100 dark:hover:bg-purple-900/20 transition-colors"
      >
        <svg
          className="w-3 h-3 text-purple-600 dark:text-purple-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="text-xs font-medium text-purple-700 dark:text-purple-300 flex-1">快照已创建</span>
        <svg
          viewBox="0 0 24 24"
          className={`w-3 h-3 text-purple-600 dark:text-purple-400 transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
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
        <div className="border-t border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-950">
          <div className="px-3 py-2">
            <div className="text-[10px] uppercase font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
              快照 ID
            </div>
            <div className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 rounded px-2 py-1">
              {part.snapshot}
            </div>
          </div>

          <div className="px-3 py-2 bg-purple-50 dark:bg-purple-900/10 border-t border-purple-100 dark:border-purple-800">
            <div className="text-xs text-purple-700 dark:text-purple-300">
              📸 This snapshot captures the state of files at this point in the conversation
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
