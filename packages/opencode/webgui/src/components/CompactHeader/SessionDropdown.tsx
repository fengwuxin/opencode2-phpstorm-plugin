import type { Session } from "@opencode-ai/sdk/client"
import { SessionList } from "./SessionList"
import { uiBridgeUpdate } from "../../state/uiBridgeState"

interface SessionDropdownProps {
  sessions: Session[]
  currentSessionId: string | undefined
  filteredSessions: Session[]
  isDropdownOpen: boolean
  isSelectMode: boolean
  selectedSessions: Set<string>
  selectedSessionIndex: number
  searchQuery: string
  editingSessionId: string | null
  editingTitle: string
  searchInputRef: React.RefObject<HTMLInputElement | null>
  editInputRef: React.RefObject<HTMLInputElement | null>
  selectedSessionRef: React.RefObject<HTMLDivElement | null>
  sessionListRef: React.RefObject<HTMLDivElement | null>
  sharingSessionId: string | null
  onSearchChange: (value: string) => void
  onSearchKeyDown: (e: React.KeyboardEvent) => void
  onToggleSelectMode: () => void
  onSessionSelect: (sessionId: string) => void
  onEditStart: (sessionId: string, currentTitle: string, e: React.MouseEvent) => void
  onEditSave: (sessionId: string) => void
  onEditCancel: () => void
  onEditChange: (value: string) => void
  onDeleteStart: (sessionId: string, e: React.MouseEvent) => void
  onBulkDeleteStart: () => void
  onCheckboxChange: (sessionId: string, checked: boolean) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onToggleShare: (sessionId: string, e: React.MouseEvent) => void
}

export function SessionDropdown({
  sessions,
  currentSessionId,
  filteredSessions,
  isDropdownOpen,
  isSelectMode,
  selectedSessions,
  selectedSessionIndex,
  searchQuery,
  editingSessionId,
  editingTitle,
  searchInputRef,
  editInputRef,
  selectedSessionRef,
  sessionListRef,
  sharingSessionId,
  onSearchChange,
  onSearchKeyDown,
  onToggleSelectMode,
  onSessionSelect,
  onEditStart,
  onEditSave,
  onEditCancel,
  onEditChange,
  onDeleteStart,
  onBulkDeleteStart,
  onCheckboxChange,
  onKeyDown,
  onToggleShare,
}: SessionDropdownProps) {
  if (!isDropdownOpen) return null

  const handleSelect = (sessionId: string) => {
    uiBridgeUpdate({ sessionID: sessionId })
    onSessionSelect(sessionId)
  }

  return (
    <div className="absolute top-full left-0 right-0 w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-lg z-50 max-h-96 flex flex-col">
      {/* Search input and select mode toggle */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-800">
        <div className="flex gap-2">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="搜索会话..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={onSearchKeyDown}
            className="flex-1 px-2 py-1 text-sm bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded outline-none focus:border-blue-500 dark:focus:border-blue-500 text-gray-900 dark:text-gray-100"
          />
          <button
            onClick={onToggleSelectMode}
            className={`px-2 h-[30px] flex items-center justify-center rounded border ${
              isSelectMode
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600"
            }`}
            title={isSelectMode ? "取消选择" : "多选会话"}
            data-tip={isSelectMode ? "取消选择" : "多选会话"}
          >
            {isSelectMode ? (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Session list */}
      <SessionList
        sessions={sessions}
        currentSessionId={currentSessionId}
        filteredSessions={filteredSessions}
        isSelectMode={isSelectMode}
        selectedSessions={selectedSessions}
        selectedSessionIndex={selectedSessionIndex}
        editingSessionId={editingSessionId}
        editingTitle={editingTitle}
        editInputRef={editInputRef}
        selectedSessionRef={selectedSessionRef}
        sessionListRef={sessionListRef}
        sharingSessionId={sharingSessionId}
        onSessionSelect={handleSelect}
        onEditStart={onEditStart}
        onEditSave={onEditSave}
        onEditCancel={onEditCancel}
        onEditChange={onEditChange}
        onDeleteStart={onDeleteStart}
        onCheckboxChange={onCheckboxChange}
        onKeyDown={onKeyDown}
        onToggleShare={onToggleShare}
      />

      {/* Bulk delete button (shown in select mode when sessions are selected) */}
      {isSelectMode && selectedSessions.size > 0 && (
        <div className="p-2 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onBulkDeleteStart}
            className="w-full px-3 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete {selectedSessions.size} Session{selectedSessions.size > 1 ? "s" : ""}
          </button>
        </div>
      )}
    </div>
  )
}
