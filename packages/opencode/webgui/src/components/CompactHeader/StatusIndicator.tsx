import type { ConnectionState } from "../../lib/api/events"
import { t } from "../../lib/i18n"
import { CONNECTION_COLORS, CONNECTION_TOOLTIPS } from "./utils"

interface StatusIndicatorProps {
  connectionState: ConnectionState
}

export function StatusIndicator({ connectionState }: StatusIndicatorProps) {
  const tip = t(CONNECTION_TOOLTIPS[connectionState])
  return (
    <div
      className={`w-2 h-2 rounded-full ${CONNECTION_COLORS[connectionState]} ${
        connectionState === "connecting" || connectionState === "error" ? "animate-pulse" : ""
      }`}
      title={tip}
      data-tip={tip}
    />
  )
}
