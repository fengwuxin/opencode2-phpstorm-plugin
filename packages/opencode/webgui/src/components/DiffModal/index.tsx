import { t } from "../../lib/i18n"
import { useEffect, useState } from "react"
import { useDiffData } from "./hooks/useDiffData"
import { DiffHeader } from "./DiffHeader"
import { DiffNavigation } from "./DiffNavigation"
import { DiffViewer } from "./DiffViewer"

interface DiffModalProps {
  isOpen: boolean
  onClose: () => void
  sessionID: string
  messageID: string
  patchHash: string
}

export function DiffModal({ isOpen, onClose, sessionID, messageID, patchHash }: DiffModalProps) {
  const { diffs, isLoading, error } = useDiffData(sessionID, messageID, isOpen)
  const [viewMode, setViewMode] = useState<"split" | "unified">("split")
  const [selectedFile, setSelectedFile] = useState<number>(0)

  // Reset UI state when diffs change
  useEffect(() => {
    if (diffs.length > 0) {
      setViewMode("split")
      setSelectedFile(0)
    }
  }, [diffs])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const currentDiff = diffs[selectedFile]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-6xl h-[90vh] flex flex-col border border-gray-200 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <DiffHeader
          patchHash={patchHash}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onClose={onClose}
          showViewToggle={!isLoading && diffs.length > 0}
        />

        {/* File tabs (if multiple files) */}
        {!isLoading && <DiffNavigation diffs={diffs} selectedFile={selectedFile} onSelectFile={setSelectedFile} />}

        {/* Content area */}
        <div className="flex-1 overflow-auto">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mb-2"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t("加载差异...")}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="max-w-md text-center">
                <svg
                  className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-gray-700 dark:text-gray-300">{error}</p>
              </div>
            </div>
          )}

          {!isLoading && !error && diffs.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg
                  className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3"
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
                <p className="text-sm text-gray-600 dark:text-gray-400">{t("没有改动")}</p>
              </div>
            </div>
          )}

          {!isLoading && !error && currentDiff && (
            <DiffViewer
              before={currentDiff.before}
              after={currentDiff.after}
              viewMode={viewMode}
              fileName={currentDiff.file}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-950 rounded-b-lg border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {!isLoading && diffs.length > 0 && (
                <span>{diffs.length === 1 ? "1 file changed" : `${diffs.length} files changed`}</span>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
