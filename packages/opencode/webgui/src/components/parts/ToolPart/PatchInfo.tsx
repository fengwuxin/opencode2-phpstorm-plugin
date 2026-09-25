import { t } from "../../../lib/i18n"
interface PatchInfoProps {
  patch: {
    id: string
    type: "patch"
    hash: string
    files: string[]
  }
  sessionID: string
  messageID: string
  onViewDiff: () => void
}

export function PatchInfo({ patch, onViewDiff }: PatchInfoProps) {
  return (
    <div className="border-t border-gray-200 dark:border-gray-700">
      {/* File list */}
      <div className="px-3 py-1.5">
        <div className="text-[10px] uppercase font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
          {t("修改的文件")}
        </div>
        <div className="space-y-0.5">
          {patch.files.map((file) => (
            <div key={file} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
              <svg
                className="w-3 h-3 text-gray-500 dark:text-gray-400 flex-shrink-0"
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
              <span className="font-mono text-gray-700 dark:text-gray-300">{file}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Patch hash */}
      <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
          Patch: {patch.hash.substring(0, 8)}
        </div>
      </div>

      {/* 查看差异 button */}
      <div className="px-3 py-1.5 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onViewDiff()
          }}
          className="w-full px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors flex items-center justify-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          {t("查看差异")}
        </button>
      </div>
    </div>
  )
}
