import { t } from "../../lib/i18n"
export function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center text-gray-500 dark:text-gray-400">
        <p className="text-lg font-medium mb-2">{t("我准备好啦")}</p>
        <p className="text-sm">{t("说句话，我就开工啦～")}</p>
      </div>
    </div>
  )
}
