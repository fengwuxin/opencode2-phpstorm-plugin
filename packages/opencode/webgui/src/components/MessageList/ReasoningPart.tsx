import { t } from "../../lib/i18n"
import type { Part } from "../../state/MessagesContext"
import { MarkdownRenderer } from "../MarkdownRenderer"
import { CollapsiblePart } from "./CollapsiblePart"

interface ReasoningPartProps {
  part: Part & { type: "reasoning" }
  durationMs?: number
}

export function ReasoningPart({ part, durationMs }: ReasoningPartProps) {
  const label = durationMs !== undefined ? `Thought for ${Math.max(1, Math.floor(durationMs / 1000))}s` : t("思考中...")

  return (
    <CollapsiblePart
      trigger={<span className="leading-none">{label}</span>}
      triggerClassName="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      content={<MarkdownRenderer>{part.text || ""}</MarkdownRenderer>}
      contentClassName="mt-1 text-xs text-gray-600 dark:text-gray-400 pl-3 border-l-2 border-purple-300 dark:border-purple-700"
    />
  )
}
