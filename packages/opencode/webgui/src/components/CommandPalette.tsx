import { t } from "../lib/i18n"
import { useState, useEffect, useRef } from "react"
import type { Session } from "@opencode-ai/sdk/client"

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  sessions: Session[]
  onNewSession: () => void
  onSwitchSession: (sessionId: string) => void
  onOpenSettings: () => void
  onShowHelp: () => void
}

interface Command {
  id: string
  label: string
  description?: string
  icon: string
  action: () => void
  category: "Action" | "Session"
}

export function CommandPalette({
  isOpen,
  onClose,
  sessions,
  onNewSession,
  onSwitchSession,
  onOpenSettings,
  onShowHelp,
}: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const commandListRef = useRef<HTMLDivElement>(null)
  const selectedItemRef = useRef<HTMLButtonElement>(null)

  // Build commands list
  const commands: Command[] = [
    {
      id: "new-session",
      label: t("新建会话"),
      description: t("创建新会话"),
      icon: "➕",
      action: () => {
        onNewSession()
        onClose()
      },
      category: "Action",
    },
    {
      id: "settings",
      label: "Settings",
      description: t("打开设置面板"),
      icon: "⚙️",
      action: () => {
        onOpenSettings()
        onClose()
      },
      category: "Action",
    },
    {
      id: "help",
      label: t("快捷键"),
      description: t("显示所有快捷键"),
      icon: "❓",
      action: () => {
        onShowHelp()
        onClose()
      },
      category: "Action",
    },
    // Add sessions
    ...sessions.map((session) => ({
      id: `session-${session.id}`,
      label: session.title || "Untitled",
      description: `Switch to session`,
      icon: "💬",
      action: () => {
        onSwitchSession(session.id)
        onClose()
      },
      category: "Session" as const,
    })),
  ]

  // Filter commands based on search query
  const filteredCommands = commands.filter((cmd) => {
    const query = searchQuery.toLowerCase()
    return cmd.label.toLowerCase().includes(query) || cmd.description?.toLowerCase().includes(query)
  })

  // Reset selected index when filtered commands change
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery])

  // Scroll selected item into view
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      })
    }
  }, [selectedIndex])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      setSearchQuery("")
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredCommands.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1))
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    }
    if (e.key === "Enter") {
      e.preventDefault()
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action()
      }
    }
    if (e.key === "Escape") {
      e.preventDefault()
      onClose()
    }
  }

  if (!isOpen) return null

  // Group commands by category
  const commandsByCategory = filteredCommands.reduce(
    (acc, cmd, idx) => {
      if (!acc[cmd.category]) {
        acc[cmd.category] = []
      }
      acc[cmd.category].push({ ...cmd, globalIndex: idx })
      return acc
    },
    {} as Record<string, Array<Command & { globalIndex: number }>>,
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="command-palette-title"
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-lg border border-gray-300 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="border-b border-gray-200 p-2 dark:border-gray-700">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("输入命令或搜索会话...")}
            className="w-full border-0 bg-transparent text-base text-gray-900 placeholder-gray-500 outline-none dark:text-gray-100 dark:placeholder-gray-400"
            id="command-palette-title"
            aria-label={t("搜索命令和会话")}
          />
        </div>

        {/* Commands List */}
        <div className="max-h-96 overflow-y-auto" ref={commandListRef}>
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">No results found for "{searchQuery}"</div>
          ) : (
            Object.entries(commandsByCategory).map(([category, cmds]) => (
              <div key={category}>
                <div className="bg-gray-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  {category === "Action" ? t("操作") : t("最近会话")}
                </div>
                {cmds.map((cmd) => (
                  <button
                    key={cmd.id}
                    ref={cmd.globalIndex === selectedIndex ? selectedItemRef : null}
                    onClick={cmd.action}
                    className={`w-full px-3 py-2 text-left transition-colors ${
                      cmd.globalIndex === selectedIndex
                        ? "bg-blue-50 dark:bg-blue-950"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cmd.icon}</span>
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {cmd.label}
                        </span>
                        {cmd.category === "Action" && cmd.description && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">– {cmd.description}</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer with navigation hint */}
        <div className="border-t border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          <span className="inline-flex items-center gap-2">
            <kbd className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs font-semibold dark:border-gray-600 dark:bg-gray-700">
              ↑↓
            </kbd>
            Navigate
            <kbd className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs font-semibold dark:border-gray-600 dark:bg-gray-700">
              Enter
            </kbd>
            Select
            <kbd className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs font-semibold dark:border-gray-600 dark:bg-gray-700">
              Esc
            </kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  )
}
