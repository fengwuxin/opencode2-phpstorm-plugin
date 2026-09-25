import { t } from "../../../lib/i18n"
interface PermissionBannerProps {
  permission: {
    id: string
    permission: string
    metadata?: Record<string, unknown>
  }
  isResponding: "once" | "always" | "reject" | null
  onRespond: (response: "once" | "always" | "reject") => void
}

export function PermissionBanner({ permission, isResponding, onRespond }: PermissionBannerProps) {
  const title = permission.metadata?.title as string | undefined
  return (
    <div className="px-3 py-2 border-b border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
      <div className="text-xs text-amber-800 dark:text-amber-200 font-medium mb-1">
        {permission.permission === "doom_loop" ? title : t("运行此工具需要授权")}
      </div>
      <div className="flex gap-1.5">
        <button
          className="px-2 py-1 text-xs rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
          onClick={(e) => {
            e.stopPropagation()
            onRespond("once")
          }}
          disabled={isResponding !== null}
        >
          {t("仅本次允许")}
        </button>
        <button
          className="px-2 py-1 text-xs rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
          onClick={(e) => {
            e.stopPropagation()
            onRespond("always")
          }}
          disabled={isResponding !== null}
        >
          Always
        </button>
        <button
          className="ml-auto px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
          onClick={(e) => {
            e.stopPropagation()
            onRespond("reject")
          }}
          disabled={isResponding !== null}
        >
          Reject
        </button>
      </div>
    </div>
  )
}
