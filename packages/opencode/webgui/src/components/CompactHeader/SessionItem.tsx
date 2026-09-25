import { isDefaultTitle } from "../../state/SessionContext"
import { formatTimestamp } from "./utils"
import { ideBridge } from "../../lib/ideBridge"

interface SessionItemProps {
  session: {
    id: string
    title: string | null
    share?: {
      url: string
    }
    time: {
      created: number
    }
  }
  isActive: boolean
  isEditing: boolean
  isSelectMode: boolean
  isSelected: boolean
  selectedSessionIndex: number
  currentIndex: number
  editingTitle: string
  editInputRef: React.RefObject<HTMLInputElement | null>
  selectedSessionRef: React.RefObject<HTMLDivElement | null>
  isSharing: boolean
  onSelect: () => void
  onEditStart: (e: React.MouseEvent) => void
  onEditSave: () => void
  onEditCancel: () => void
  onEditChange: (value: string) => void
  onDeleteStart: (e: React.MouseEvent) => void
  onCheckboxChange: (checked: boolean) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onToggleShare: (e: React.MouseEvent) => void
}

export function SessionItem({
  session,
  isActive,
  isEditing,
  isSelectMode,
  isSelected,
  selectedSessionIndex,
  currentIndex,
  editingTitle,
  editInputRef,
  selectedSessionRef,
  isSharing,
  onSelect,
  onEditStart,
  onEditSave,
  onEditCancel,
  onEditChange,
  onDeleteStart,
  onCheckboxChange,
  onKeyDown,
  onToggleShare,
}: SessionItemProps) {
  const displayTitle = session.title || "Untitled"
  const hasDefaultTitle = isDefaultTitle(displayTitle)
  const isShared = !!session.share?.url

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (session.share?.url) {
      if (ideBridge.isInstalled()) {
        ideBridge.send({ type: "openUrl", payload: { url: session.share.url } })
      } else {
        window.open(session.share.url, "_blank", "noopener,noreferrer")
      }
    }
  }

  return (
    <div
      ref={currentIndex === selectedSessionIndex ? selectedSessionRef : null}
      tabIndex={-1}
      className={`group px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between outline-none ${
        currentIndex === selectedSessionIndex && !isSelectMode
          ? "bg-blue-50 dark:bg-blue-950"
          : isActive
            ? "bg-blue-50 dark:bg-blue-950"
            : ""
      }`}
      onClick={() => !isEditing && !isSelectMode && onSelect()}
      onKeyDown={onKeyDown}
    >
      {isEditing ? (
        <input
          ref={editInputRef}
          type="text"
          value={editingTitle}
          onChange={(e) => onEditChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onEditSave()
            } else if (e.key === "Escape") {
              onEditCancel()
            }
          }}
          onBlur={onEditSave}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 px-1 py-0.5 text-sm bg-white dark:bg-gray-950 border border-blue-500 rounded outline-none text-gray-900 dark:text-gray-100"
        />
      ) : (
        <>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Checkbox for selection mode */}
            {isSelectMode && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => onCheckboxChange(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
            )}

            {isActive && !isSelectMode && (
              <svg
                className="w-3 h-3 text-blue-600 dark:text-blue-400 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span
              className={`truncate ${
                hasDefaultTitle
                  ? "text-gray-500 dark:text-gray-500 italic"
                  : isActive && !isSelectMode
                    ? "text-blue-900 dark:text-blue-100 font-medium"
                    : "text-gray-700 dark:text-gray-300"
              }`}
            >
              {displayTitle}
            </span>
          </div>

          {/* Edit and Delete buttons (hidden in select mode) */}
          {!isSelectMode && (
            <div className="ml-auto flex items-center gap-2 flex-shrink-0">
              {/* Timestamp (hidden on hover or when active) */}
              <span
                className={`text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ${isActive ? "hidden" : "block group-hover:hidden"}`}
              >
                {formatTimestamp(session.time.created)}
              </span>

              {/* Action buttons (visible on hover or when active) */}
              <div className={`${isActive ? "flex" : "hidden group-hover:flex"} items-center gap-1`}>
                {/* Link button (only shown if shared) */}
                {isShared && (
                  <button
                    onClick={handleLinkClick}
                    className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                    title="打开分享链接"
                    data-tip="打开分享链接"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </button>
                )}
                {/* Share/Unshare button */}
                <button
                  onClick={onToggleShare}
                  disabled={isSharing}
                  className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50"
                  title={isShared ? "取消分享" : "分享会话"}
                  data-tip={isShared ? "取消分享" : "分享会话"}
                >
                  {isShared ? (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                      />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                      />
                    </svg>
                  )}
                </button>
                {/* Edit button */}
                <button
                  onClick={onEditStart}
                  className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  title="编辑标题"
                  data-tip="编辑标题"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </button>
                {/* Delete button */}
                <button
                  onClick={onDeleteStart}
                  className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  title="删除会话"
                  data-tip="删除会话"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
