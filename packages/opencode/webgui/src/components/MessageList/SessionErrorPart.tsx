import { useSession } from "../../state/SessionContext"
import { useCallback } from "react"
import { useCustomApi } from "../../state/IdeBridgeContext"
import type { SessionErrorPart as SessionErrorPartType } from "../../types/messages"

interface SessionErrorPartProps {
  part: SessionErrorPartType
}

export function SessionErrorPart({ part }: SessionErrorPartProps) {
  const { currentSession, retrySession, isIdle } = useSession()
  const customApi = useCustomApi()

  const handleRetry = useCallback(() => {
    if (currentSession?.id) {
      retrySession(currentSession.id)
    }
  }, [currentSession?.id, retrySession])

  return (
    <div className="modern-card overflow-hidden border-red-200 dark:border-red-900/30">
      <div className="px-3 py-2 bg-red-50 dark:bg-red-900/10 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 text-red-600 dark:text-red-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-red-600 dark:text-red-400 mb-0.5">
              会话错误
            </div>
            <div className="text-sm text-red-700 dark:text-red-300">
              {part.message}
            </div>
          </div>
        </div>

        {isIdle && customApi && (
          <button
            onClick={handleRetry}
            className="shrink-0 flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium bg-white dark:bg-white/5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
            Retry
          </button>
        )}
      </div>
    </div>
  )
}

