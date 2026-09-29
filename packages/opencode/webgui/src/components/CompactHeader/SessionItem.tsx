import { t } from "../../lib/i18n"
import { isDefaultTitle } from "../../state/SessionContext"
import { formatTimestamp } from "./utils"

interface SessionItemProps {
  session: {
    id: string
    title: string | null
    share?: {
      url: string
    }
    time: {
      created: number
      updated?: number
    }
  }
  isActive: boolean
  isEditing: boolean
  isSelectMode: boolean
  isSelected: boolean
  isFavorite: boolean
  selectedSessionIndex: number
  currentIndex: number
  editingTitle: string
  editInputRef: React.RefObject<HTMLInputElement | null>
  selectedSessionRef: React.RefObject<HTMLDivElement | null>
  onSelect: () => void
  onEditStart: (e: React.MouseEvent) => void
  onEditSave: () => void
  onEditCancel: () => void
  onEditChange: (value: string) => void
  onDeleteStart: (e: React.MouseEvent) => void
  onToggleFavorite: (e: React.MouseEvent) => void
  onCheckboxChange: (checked: boolean) => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

export function SessionItem({
  session,
  isActive,
  isEditing,
  isSelectMode,
  isSelected,
  isFavorite,
  selectedSessionIndex,
  currentIndex,
  editingTitle,
  editInputRef,
  selectedSessionRef,
  onSelect,
  onEditStart,
  onEditSave,
  onEditCancel,
  onEditChange,
  onDeleteStart,
  onToggleFavorite,
  onCheckboxChange,
  onKeyDown,
}: SessionItemProps) {
  const displayTitle = session.title || "Untitled"
  const hasDefaultTitle = isDefaultTitle(displayTitle)

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
              {/* Timestamp (last activity; hidden on hover or when active) */}
              <span
                className={`text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ${isActive ? "hidden" : "block group-hover:hidden"}`}
              >
                {formatTimestamp(session.time.updated ?? session.time.created)}
              </span>

              {/* Action buttons (visible on hover, when active, or when favorited) */}
              <div className={`${isActive || isFavorite ? "flex" : "hidden group-hover:flex"} items-center gap-1`}>
                {/* Favorite button */}
                <button
                  onClick={onToggleFavorite}
                  className={`p-1 ${
                    isFavorite
                      ? "text-yellow-500 dark:text-yellow-400"
                      : "text-gray-500 dark:text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400"
                  }`}
                  title={isFavorite ? t("取消收藏") : t("收藏会话")}
                  data-tip={isFavorite ? t("取消收藏") : t("收藏会话")}
                >
                  {isFavorite ? (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  )}
                </button>
                {/* Edit button */}
                <button
                  onClick={onEditStart}
                  className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  title={t("编辑标题")}
                  data-tip={t("编辑标题")}
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
                  title={t("删除会话")}
                  data-tip={t("删除会话")}
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
