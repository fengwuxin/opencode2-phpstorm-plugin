import { useState, forwardRef, useImperativeHandle, useCallback } from "react"
import type { ConnectionState } from "../../lib/api/events"
import { useTheme } from "../../state/ThemeContext"
import { useSession, isDefaultTitle } from "../../state/SessionContext"
import { useSessionUsage } from "../../hooks/useSessionUsage"
import { ConfirmModal } from "../ConfirmModal"
import { SettingsPanel } from "../SettingsPanel"
import { useSessionDropdown } from "./hooks/useSessionDropdown"
import { useSessionActions } from "./hooks/useSessionActions"
import { StatusIndicator } from "./StatusIndicator"
import { ActionButtons } from "./ActionButtons"
import { UsageDisplay } from "./UsageDisplay"
import { SessionDropdown } from "./SessionDropdown"
import { sdk } from "../../lib/api/sdkClient"
import { useToast } from "../../state/ToastContext"

interface CompactHeaderProps {
  connectionState: ConnectionState
  onNewSession: () => void
  isCreatingSession: boolean
  onOpenCommandPalette: () => void
}

const CompactHeader = forwardRef<
  {
    toggleSessionDropdown: () => void
  },
  CompactHeaderProps
>(({ connectionState, onNewSession, isCreatingSession, onOpenCommandPalette }, ref) => {
  const { theme, toggleTheme } = useTheme()
  const { currentSession, setCurrentSession, sessions, setSessions, switchSession, updateSessionTitle, deleteSession } =
    useSession()
  const usage = useSessionUsage()
  const toast = useToast()

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [sharingSessionId, setSharingSessionId] = useState<string | null>(null)

  const handleToggleShareSession = useCallback(
    async (sessionId: string, e: React.MouseEvent) => {
      e.stopPropagation()
      const session = sessions.find((s) => s.id === sessionId)
      if (!session) return

      setSharingSessionId(sessionId)
      const sessionIsShared = !!session.share?.url

      if (sessionIsShared) {
        const res = await sdk.session.unshare({ path: { id: sessionId } })
        if (res.data) {
          // Update session in the list for immediate UI feedback
          setSessions(sessions.map((s) => (s.id === sessionId ? res.data! : s)))
          if (currentSession?.id === sessionId) {
            setCurrentSession(res.data)
          }
          toast.showToast("已取消会话分享", { variant: "success" })
        } else {
          toast.showToast("取消分享失败", { variant: "error" })
        }
      } else {
        const res = await sdk.session.share({ path: { id: sessionId } })
        if (res.data) {
          // Update session in the list for immediate UI feedback
          setSessions(sessions.map((s) => (s.id === sessionId ? res.data! : s)))
          if (currentSession?.id === sessionId) {
            setCurrentSession(res.data)
          }
          if (res.data.share?.url) {
            await navigator.clipboard.writeText(res.data.share.url)
            toast.showToast("分享链接已复制到剪贴板", { variant: "success" })
          }
        } else {
          toast.showToast("分享会话失败", { variant: "error" })
        }
      }
      setSharingSessionId(null)
    },
    [sessions, currentSession, setCurrentSession, setSessions, toast],
  )

  // Session dropdown management
  const dropdown = useSessionDropdown(sessions)

  // Session actions (edit, delete)
  const actions = useSessionActions({
    sessions,
    currentSessionId: currentSession?.id,
    updateSessionTitle,
    deleteSession,
  })

  // Expose toggleSessionDropdown method via ref
  useImperativeHandle(
    ref,
    () => ({
      toggleSessionDropdown: dropdown.toggleDropdown,
    }),
    [dropdown.toggleDropdown],
  )

  const handleSessionSelect = async (sessionId: string) => {
    await switchSession(sessionId)
    dropdown.closeDropdown()
  }

  const handleDeleteConfirm = () => {
    actions.handleDeleteConfirm(actions.deleteConfirm, dropdown.selectedSessions, () => {
      dropdown.setSelectedSessions(new Set())
    })
  }

  const handleBulkDeleteStart = () => {
    actions.handleBulkDeleteStart(dropdown.selectedSessions)
    dropdown.setIsDropdownOpen(false)
  }

  const handleDeleteStart = (sessionId: string, e: React.MouseEvent) => {
    actions.handleDeleteStart(sessionId, e)
    dropdown.setIsDropdownOpen(false)
  }

  const currentTitle = currentSession?.title || "Untitled"
  const truncatedTitle = currentTitle.length > 30 ? currentTitle.slice(0, 30) + "..." : currentTitle
  const currentHasDefaultTitle = isDefaultTitle(currentTitle)

  return (
    <>
      <header className="h-9 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex items-center justify-between px-2 flex-shrink-0 relative">
        {/* Left: Session dropdown */}
        <div className="flex items-center gap-1.5" ref={dropdown.dropdownRef}>
          <button
            onClick={dropdown.toggleDropdown}
            className={`flex items-center gap-1 text-sm hover:text-gray-900 dark:hover:text-gray-100 ${
              currentHasDefaultTitle ? "text-gray-500 dark:text-gray-500 italic" : "text-gray-700 dark:text-gray-300"
            }`}
            title={currentTitle}
            data-tip={currentTitle}
          >
            <span>{currentSession ? truncatedTitle : "无会话"}</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Usage summary in header */}
          <UsageDisplay usage={usage} />

          {/* Dropdown menu */}
          <SessionDropdown
            sessions={sessions}
            currentSessionId={currentSession?.id}
            filteredSessions={dropdown.filteredSessions}
            isDropdownOpen={dropdown.isDropdownOpen}
            isSelectMode={dropdown.isSelectMode}
            selectedSessions={dropdown.selectedSessions}
            selectedSessionIndex={dropdown.selectedSessionIndex}
            searchQuery={dropdown.searchQuery}
            editingSessionId={actions.editingSessionId}
            editingTitle={actions.editingTitle}
            searchInputRef={dropdown.searchInputRef}
            editInputRef={actions.editInputRef}
            selectedSessionRef={dropdown.selectedSessionRef}
            sessionListRef={dropdown.sessionListRef}
            sharingSessionId={sharingSessionId}
            onSearchChange={dropdown.setSearchQuery}
            onSearchKeyDown={dropdown.handleSearchKeyDown}
            onToggleSelectMode={dropdown.toggleSelectMode}
            onSessionSelect={handleSessionSelect}
            onEditStart={actions.handleEditStart}
            onEditSave={actions.handleEditSave}
            onEditCancel={actions.handleEditCancel}
            onEditChange={actions.setEditingTitle}
            onDeleteStart={handleDeleteStart}
            onBulkDeleteStart={handleBulkDeleteStart}
            onCheckboxChange={dropdown.handleSessionCheckboxChange}
            onKeyDown={(e) => dropdown.handleKeyDown(e, handleSessionSelect)}
            onToggleShare={handleToggleShareSession}
          />
        </div>

        {/* Right: Connection status, theme toggle, and new session button */}
        <div className="flex items-center gap-1">
          <StatusIndicator connectionState={connectionState} />
          <ActionButtons
            theme={theme}
            toggleTheme={toggleTheme}
            onOpenCommandPalette={onOpenCommandPalette}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onNewSession={onNewSession}
            isCreatingSession={isCreatingSession}
          />
        </div>
      </header>

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={!!actions.deleteConfirm}
        onClose={actions.handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title={actions.deleteConfirm === "bulk" ? "删除会话" : "删除会话"}
        message={
          actions.deleteConfirm === "bulk"
            ? `确定删除选中的 ${dropdown.selectedSessions.size} 个会话？此操作不可撤销。`
            : "确定删除此会话？此操作不可撤销。"
        }
        confirmText="删除"
        cancelText="取消"
        variant="danger"
        isLoading={actions.isDeleting}
      />

      {/* Settings panel */}
      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  )
})

CompactHeader.displayName = "CompactHeader"

export { CompactHeader }
