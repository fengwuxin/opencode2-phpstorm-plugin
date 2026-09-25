import { t } from "../../lib/i18n"
import type { Session } from "@opencode-ai/sdk/client"
import { SessionItem } from "./SessionItem"

interface SessionListProps {
  sessions: Session[]
  currentSessionId: string | undefined
  filteredSessions: Session[]
  isSelectMode: boolean
  selectedSessions: Set<string>
  selectedSessionIndex: number
  editingSessionId: string | null
  editingTitle: string
  editInputRef: React.RefObject<HTMLInputElement | null>
  selectedSessionRef: React.RefObject<HTMLDivElement | null>
  sessionListRef: React.RefObject<HTMLDivElement | null>
  sharingSessionId: string | null
  onSessionSelect: (sessionId: string) => void
  onEditStart: (sessionId: string, currentTitle: string, e: React.MouseEvent) => void
  onEditSave: (sessionId: string) => void
  onEditCancel: () => void
  onEditChange: (value: string) => void
  onDeleteStart: (sessionId: string, e: React.MouseEvent) => void
  onCheckboxChange: (sessionId: string, checked: boolean) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onToggleShare: (sessionId: string, e: React.MouseEvent) => void
}

export function SessionList({
  sessions,
  currentSessionId,
  filteredSessions,
  isSelectMode,
  selectedSessions,
  selectedSessionIndex,
  editingSessionId,
  editingTitle,
  editInputRef,
  selectedSessionRef,
  sessionListRef,
  sharingSessionId,
  onSessionSelect,
  onEditStart,
  onEditSave,
  onEditCancel,
  onEditChange,
  onDeleteStart,
  onCheckboxChange,
  onKeyDown,
  onToggleShare,
}: SessionListProps) {
  if (filteredSessions.length === 0) {
    return (
      <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
        {sessions.length === 0 ? t("还没有会话") : t("没有匹配的会话")}
      </div>
    )
  }

  return (
    <div className="overflow-y-auto flex-1" ref={sessionListRef}>
      {filteredSessions.map((session, index) => {
        const isActive = session.id === currentSessionId
        const isEditing = editingSessionId === session.id
        const displayTitle = session.title || "Untitled"

        return (
          <SessionItem
            key={session.id}
            session={session}
            isActive={isActive}
            isEditing={isEditing}
            isSelectMode={isSelectMode}
            isSelected={selectedSessions.has(session.id)}
            selectedSessionIndex={selectedSessionIndex}
            currentIndex={index}
            editingTitle={editingTitle}
            editInputRef={editInputRef}
            selectedSessionRef={selectedSessionRef}
            isSharing={sharingSessionId === session.id}
            onSelect={() => onSessionSelect(session.id)}
            onEditStart={(e) => onEditStart(session.id, displayTitle, e)}
            onEditSave={() => onEditSave(session.id)}
            onEditCancel={onEditCancel}
            onEditChange={onEditChange}
            onDeleteStart={(e) => onDeleteStart(session.id, e)}
            onCheckboxChange={(checked) => onCheckboxChange(session.id, checked)}
            onKeyDown={onKeyDown}
            onToggleShare={(e) => onToggleShare(session.id, e)}
          />
        )
      })}
    </div>
  )
}
