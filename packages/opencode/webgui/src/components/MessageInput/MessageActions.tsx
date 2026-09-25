import { Button } from "../common"

interface MessageActionsProps {
  isIdle: boolean
  isButtonDisabled: boolean
  isCompactDisabled: boolean
  onSubmit: () => void
  onAbort: () => void
  onCompactClick: () => void
}

export function MessageActions({
  isIdle,
  isButtonDisabled,
  isCompactDisabled,
  onSubmit,
  onAbort,
  onCompactClick,
}: MessageActionsProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="xs"
        onClick={onCompactClick}
        disabled={isCompactDisabled}
        title="Compact session history"
        data-tip="Compact session history"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M6 12h12M8 17h8" />
        </svg>
        <span>Compact</span>
      </Button>
      {isIdle ? (
        <button
          onClick={onSubmit}
          disabled={isButtonDisabled}
          className="h-6 w-6 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Send (Enter)"
          data-tip="Send (Enter)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      ) : (
        <button
          onClick={onAbort}
          className="h-6 w-6 flex items-center justify-center text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
          title="Stop generation"
          data-tip="Stop generation"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="6" y="6" width="12" height="12" rx="1" ry="1" />
          </svg>
        </button>
      )}
    </div>
  )
}
