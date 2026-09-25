import type { ConnectionState } from "../lib/api/events"
import type { ReactNode } from "react"

interface OfflineBannerProps {
  connectionState: ConnectionState
  onRetry?: () => void
}

interface StateConfig {
  bg: string
  border: string
  iconColor: string
  textColor: string
  subtextColor: string
  buttonColor: string
  title: string
  message: string
  icon: ReactNode
}

const STATE_CONFIGS: Record<"disconnected" | "error", StateConfig> = {
  disconnected: {
    bg: "bg-yellow-50 dark:bg-yellow-950",
    border: "border-b border-yellow-200 dark:border-yellow-800",
    iconColor: "text-yellow-600 dark:text-yellow-400",
    textColor: "text-yellow-900 dark:text-yellow-100",
    subtextColor: "text-yellow-700 dark:text-yellow-300",
    buttonColor: "bg-yellow-600 hover:bg-yellow-700 text-white",
    title: "未连接",
    message: "与服务器的连接已断开，正在重连...",
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
  },
  error: {
    bg: "bg-red-50 dark:bg-red-950",
    border: "border-b border-red-200 dark:border-red-800",
    iconColor: "text-red-600 dark:text-red-400",
    textColor: "text-red-900 dark:text-red-100",
    subtextColor: "text-red-700 dark:text-red-300",
    buttonColor: "bg-red-600 hover:bg-red-700 text-white",
    title: "连接错误",
    message: "连接 OpenCode 服务失败，正在重试...",
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
}

/**
 * Offline banner component
 * Displays a banner at the top of the screen when connection is lost or has errors
 */
export function OfflineBanner({ connectionState, onRetry }: OfflineBannerProps) {
  if (connectionState === "connected" || connectionState === "connecting") {
    return null
  }

  const config = STATE_CONFIGS[connectionState] ?? STATE_CONFIGS.disconnected

  return (
    <div className={`w-full px-4 py-2 flex items-center justify-between ${config.bg} ${config.border}`} role="alert">
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={config.iconColor}>{config.icon}</div>

        {/* Message */}
        <div>
          <p className={`text-sm font-medium ${config.textColor}`}>{config.title}</p>
          <p className={`text-xs ${config.subtextColor}`}>{config.message}</p>
        </div>
      </div>

      {/* Retry button */}
      {onRetry && (
        <button
          onClick={onRetry}
          className={`px-3 py-1 text-sm font-medium rounded transition-colors ${config.buttonColor}`}
        >
          立即重试
        </button>
      )}
    </div>
  )
}
