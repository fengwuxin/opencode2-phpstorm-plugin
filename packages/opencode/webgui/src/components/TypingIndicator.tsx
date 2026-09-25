import { t } from "../lib/i18n"
import { useEffect, useState } from "react"
import { useSession } from "../state/SessionContext"

/**
 * Typing indicator component
 *
 * Shows animated dots while the assistant is generating a response.
 * Also renders a compact status banner for session.status events
 * (busy / retry with countdown) similar to the TUI.
 */

interface TypingIndicatorProps {
  /** Whether the indicator should be visible */
  visible: boolean
}

export function TypingIndicator({ visible }: TypingIndicatorProps) {
  const { currentStatus } = useSession()
  const [seconds, setSeconds] = useState<number | null>(null)

  useEffect(() => {
    if (currentStatus.type !== "retry") {
      setSeconds(null)
      return
    }

    const update = () => {
      const diff = currentStatus.next - Date.now()
      if (diff <= 0) {
        setSeconds(0)
        return
      }
      setSeconds(Math.round(diff / 1000))
    }

    update()
    const id = window.setInterval(update, 1000)
    return () => window.clearInterval(id)
  }, [currentStatus])

  const showStatus = currentStatus.type !== "idle" && currentStatus.type !== "busy"

  const statusText = currentStatus.message

  const bannerClass = (() => {
    if (currentStatus.type === "retry") {
      return "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-orange-50 text-orange-800 dark:bg-orange-900/30 dark:text-orange-100 border border-orange-200 dark:border-orange-700"
    }
    if (currentStatus.type === "busy") {
      return "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-100 border border-blue-200 dark:border-blue-700"
    }
    return ""
  })()

  const countdown = currentStatus.type === "retry" && typeof seconds === "number" && seconds > 0 ? seconds : null

  return (
    <div className="my-1 space-y-1 min-h-[1rem]">
      {visible && (
        <button className="relative inline-flex items-center gap-0.5 pr-4 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
          <span className="leading-none">{t("生成中")}</span>
          <div className="flex gap-0.5">
            <div
              className="w-0.5 h-0.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
              style={{ animationDelay: "0ms", animationDuration: "1s" }}
            />
            <div
              className="w-0.5 h-0.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
              style={{ animationDelay: "200ms", animationDuration: "1s" }}
            />
            <div
              className="w-0.5 h-0.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
              style={{ animationDelay: "400ms", animationDuration: "1s" }}
            />
          </div>
        </button>
      )}

      {showStatus && bannerClass && statusText && (
        <div className={bannerClass}>
          <span>{statusText}</span>
          {currentStatus.type === "retry" && (
            <span className="text-[10px] text-orange-700 dark:text-orange-200">
              {countdown !== null ? `retrying in ${countdown}s` : "retrying soon"} · attempt #{currentStatus.attempt}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
