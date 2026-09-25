import { t } from "../../lib/i18n"
import { useLayoutEffect, useMemo, useRef } from "react"
import { useMentionSearch, type MentionResult } from "../../hooks/useMentionSearch"
import { useMentionNavigation } from "../../hooks/useMentionNavigation"
import type { MentionMetadata } from "./MentionNode"

interface MentionPopoverProps {
  query: string
  position: { top: number; left: number; placement: "top" | "bottom" }
  onSelect: (metadata: MentionMetadata) => void
  onClose: () => void
  onReposition?: () => void
}

export function MentionPopover({ query, position, onSelect, onClose, onReposition }: MentionPopoverProps) {
  const { results, isLoading } = useMentionSearch(query)
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
        data-mention-popover
      >
        <div className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
          {query ? t("没有结果") : t("输入以搜索...")}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className="absolute z-50 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded shadow-lg"
      style={{ top: position.top, left: position.left, transform, maxWidth: "calc(100vw - 16px)" }}
      data-mention-popover
    >
      <div ref={listRef} className="max-h-64 overflow-y-auto" style={{ maxWidth: "calc(100vw - 16px)" }}>
        {isLoading && results.length === 0 ? (
          <div className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">{t("加载中...")}</div>
        ) : (
          <div className="py-0.5">
            {results.map((result, index) => (
              <MentionItem
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

interface MentionItemProps {
  result: MentionResult
  isSelected: boolean
  index: number
  onClick: () => void
  onMouseEnter: () => void
}

function MentionItem({ result, isSelected, index, onClick, onMouseEnter }: MentionItemProps) {
  const { metadata, current, special } = result

  const getIcon = () => {
    if (special === "all-opened") {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      )
    }
    switch (metadata.type) {
      case "file":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        )
      case "directory":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        )
      case "agent":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        )
      case "symbol":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
        )
    }
  }

  const getTypeBadge = () => {
    if (special === "all-opened") {
      return <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{t("特殊")}</span>
    }
    switch (metadata.type) {
      case "file":
        return <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{t("文件")}</span>
      case "directory":
        return <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Dir</span>
      case "agent":
        return <span className="text-xs text-green-600 dark:text-green-400 font-medium">Agent</span>
      case "symbol":
        return <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">{t("符号")}</span>
    }
  }

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
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className={`text-xs truncate ${
              isSelected ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-900 dark:text-gray-100"
            } ${current ? "font-bold" : ""}`}
          >
            @{metadata.display}
          </span>
          {current && <span className="text-[10px] font-bold text-gray-900 dark:text-gray-100">current</span>}
          {getTypeBadge()}
        </div>
        {metadata.path && metadata.type === "symbol" && (
          <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{metadata.path}</div>
        )}
      </div>
    </div>
  )
}
