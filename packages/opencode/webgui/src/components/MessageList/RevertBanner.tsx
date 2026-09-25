import { t } from "../../lib/i18n"
interface RevertBannerProps {
  onRedo: () => void
  onRestore: () => void
  isRevertBusy: boolean
}

export function RevertBanner({ onRedo, onRestore, isRevertBusy }: RevertBannerProps) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between text-xs px-2 py-1.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
      <div className="truncate mr-2">{t("上一条消息之后的改动已回退。")}</div>
      <div className="flex gap-2">
        <button
          className="px-2 py-1 rounded bg-amber-200 hover:bg-amber-300 dark:bg-amber-800 dark:hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onRedo}
          disabled={isRevertBusy}
        >
          Redo
        </button>
        <button
          className="px-2 py-1 rounded bg-amber-200 hover:bg-amber-300 dark:bg-amber-800 dark:hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onRestore}
          disabled={isRevertBusy}
        >
          Restore
        </button>
      </div>
    </div>
  )
}
