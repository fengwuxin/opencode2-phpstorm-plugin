import { t } from "../../lib/i18n"
import { useLayoutEffect, useMemo, useRef } from "react"
import { useCommandSearch, type CommandResult } from "../../hooks/useCommandSearch"
import { useMentionNavigation } from "../../hooks/useMentionNavigation"
import type { CommandMetadata } from "./CommandPlugin/CommandHandler"

interface CommandPopoverProps {
  query: string
  position: { top: number; left: number; placement: "top" | "bottom" }
  onSelect: (metadata: CommandMetadata) => void
  onClose: () => void
  onReposition?: () => void
}

export function CommandPopover({ query, position, onSelect, onClose, onReposition }: CommandPopoverProps) {
  const { results, isLoading } = useCommandSearch(query)
  const rootRef = useRef<HTMLDivElement>(null)

  const transform = useMemo(
    () => (position.placement === "top" ? "translateY(-100%)" : "translateY(0)"),
    [position.placement],
  )

  useLayoutEffect(() => {
    if (!onReposition) return
    const node = rootRef.current
    if (!node) return

    onReposition()
    const frame = requestAnimationFrame(() => onReposition())

    if (typeof ResizeObserver === "undefined") {
      return () => cancelAnimationFrame(frame)
    }

    const observer = new ResizeObserver(() => onReposition())
    observer.observe(node)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [onReposition, isLoading, results.length])

  const handleSelect = (index: number) => {
    if (results[index]) {
      onSelect(results[index].metadata)
    }
  }

  const { selectedIndex, setSelectedIndex, listRef } = useMentionNavigation({
    itemCount: results.length,
    onSelect: handleSelect,
    onClose,
    isOpen: true,
  })

  if (results.length === 0 && !isLoading) {
    return (
      <div
        ref={rootRef}
        className="absolute z-50 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded shadow-lg"
        style={{ top: position.top, left: position.left, transform, maxWidth: "calc(100vw - 16px)" }}
        data-command-popover
      >
        <div className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
          {query ? t("未找到命令") : t("输入以搜索命令...")}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className="absolute z-50 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded shadow-lg"
      style={{ top: position.top, left: position.left, transform, maxWidth: "calc(100vw - 16px)" }}
      data-command-popover
    >
      <div ref={listRef} className="max-h-64 overflow-y-auto" style={{ maxWidth: "calc(100vw - 16px)" }}>
        {isLoading && results.length === 0 ? (
          <div className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">{t("加载命令...")}</div>
        ) : (
          <div className="py-0.5">
            {results.map((result, index) => (
              <CommandItem
                key={result.id}
                result={result}
                isSelected={index === selectedIndex}
                index={index}
                onClick={() => onSelect(result.metadata)}
                onMouseEnter={() => setSelectedIndex(index)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface CommandItemProps {
  result: CommandResult
  isSelected: boolean
  index: number
  onClick: () => void
  onMouseEnter: () => void
}

function CommandItem({ result, isSelected, index, onClick, onMouseEnter }: CommandItemProps) {
  const { metadata } = result
  const typeLabel = metadata.source === "skill" ? "Skill" : metadata.source === "mcp" ? "MCP" : "Command"
  const badgeClass = metadata.source === "skill"
    ? "text-emerald-600 dark:text-emerald-400"
    : metadata.source === "mcp"
      ? "text-indigo-600 dark:text-indigo-400"
      : "text-amber-600 dark:text-amber-400"

  return (
    <div
      data-index={index}
      className={`px-2 py-1 cursor-pointer flex items-center gap-1.5 ${
        isSelected ? "bg-blue-50 dark:bg-blue-950" : "hover:bg-gray-50 dark:hover:bg-gray-800"
      }`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      <div
        className={`flex-shrink-0 ${
          isSelected ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className={`text-xs truncate ${
              isSelected ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-900 dark:text-gray-100"
            }`}
          >
            /{metadata.name}
          </span>
          <span className={`text-xs font-medium ${badgeClass}`}>{typeLabel}</span>
        </div>
        {metadata.description && (
          <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{metadata.description}</div>
        )}
      </div>
    </div>
  )
}
