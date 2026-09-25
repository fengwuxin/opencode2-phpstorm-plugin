import { useState, useCallback, useMemo } from "react"
import { DiffModal } from "../DiffModal"
import { useOpenFile } from "../../hooks/useOpenFile"
import { useProject } from "../../state/ProjectContext"
import { toDisplayPath } from "../../utils/path"

interface PatchPartProps {
  part: {
    id: string
    type: "patch"
    hash: string
    files: string[]
  }
  sessionID: string
  messageID: string
}

export function PatchPart({ part, sessionID, messageID }: PatchPartProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showDiffModal, setShowDiffModal] = useState(false)
  const openFile = useOpenFile()
  const { worktree } = useProject()

  const files = useMemo(() => {
    return part.files.map((file) => {
      const display = toDisplayPath(file, worktree) || file
      return { file, display }
    })
  }, [part.files, worktree])

  const single = files.length === 1 ? files[0]! : null

  const open = useCallback(
    (entry: { file: string; display: string }) => {
      openFile({ path: entry.file, display: entry.display })
    },
    [openFile],
  )

  const handleOpenSingle = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!single) return
      open(single)
    },
    [open, single],
  )

  return (
    <>
      <div className="my-1 border border-amber-300 dark:border-amber-700 rounded-lg overflow-hidden bg-amber-50 dark:bg-amber-900/10">
        {/* Header */}
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors"
        >
          <svg
            className="w-3 h-3 text-amber-600 dark:text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          <span className="text-xs font-medium text-amber-700 dark:text-amber-300 flex-1">
            {single ? (
              <span
                role="button"
                tabIndex={0}
                onClick={handleOpenSingle}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" && e.key !== " ") return
                  handleOpenSingle(e)
                }}
                className="underline decoration-dotted cursor-pointer hover:opacity-80"
                title={single.display}
                data-tip={single.display}
              >
                {`Edited ${single.display}`}
              </span>
            ) : (
              `Edited ${files.length} files`
            )}
          </span>
          <svg
            viewBox="0 0 24 24"
            className={`w-3 h-3 text-amber-600 dark:text-amber-400 transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div className="border-t border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-950">
            {/* File list */}
            <div className="px-3 py-2">
              <div className="text-[10px] uppercase font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                修改的文件
              </div>
              <div className="space-y-1">
                {files.map((entry) => (
                  <div key={entry.file} className="flex items-center gap-2 text-xs">
                    <svg
                      className="w-3 h-3 text-amber-600 dark:text-amber-400 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() => open(entry)}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") return
                        open(entry)
                      }}
                      className="font-mono text-gray-700 dark:text-gray-300 underline decoration-dotted cursor-pointer hover:opacity-80"
                      title={entry.display}
                      data-tip={entry.display}
                    >
                      {entry.display}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Patch hash */}
            <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
              <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                Patch: {part.hash.substring(0, 8)}
              </div>
            </div>

            {/* 查看差异 button */}
            <div className="px-3 py-2 border-t border-amber-200 dark:border-amber-800">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDiffModal(true)
                }}
                className="w-full px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 rounded hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors flex items-center justify-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                查看差异
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Diff Modal */}
      {showDiffModal && (
        <DiffModal
          isOpen={showDiffModal}
          onClose={() => setShowDiffModal(false)}
          sessionID={sessionID}
          messageID={messageID}
          patchHash={part.hash}
        />
      )}
    </>
  )
}
