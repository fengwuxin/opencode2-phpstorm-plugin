import { t } from "../../lib/i18n"
interface DiffHeaderProps {
  patchHash: string
  viewMode: "split" | "unified"
  onViewModeChange: (mode: "split" | "unified") => void
  onClose: () => void
  showViewToggle: boolean
}

export function DiffHeader({ patchHash, viewMode, onViewModeChange, onClose, showViewToggle }: DiffHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-3">
        <svg
          className="w-5 h-5 text-amber-600 dark:text-amber-400"
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t("文件差异")}</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{patchHash.substring(0, 8)}</span>
      </div>

      <div className="flex items-center gap-2">
        {/* View mode toggle */}
        {showViewToggle && (
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded p-0.5">
            <button
              onClick={() => onViewModeChange("split")}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === "split"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
              title={t("拆分视图")}
              data-tip={t("拆分视图")}
            >
              Split
            </button>
            <button
              onClick={() => onViewModeChange("unified")}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === "unified"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
              title={t("统一视图")}
              data-tip={t("统一视图")}
            >
              Unified
            </button>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          title={t("关闭 (Esc)")}
          data-tip={t("关闭 (Esc)")}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
