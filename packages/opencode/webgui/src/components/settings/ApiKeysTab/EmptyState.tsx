import { t } from "../../../lib/i18n"
export function EmptyState() {
  return (
    <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-8 border border-dashed border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50/50 dark:bg-gray-900/50">
      {t("未配置 Provider，请在上方添加。")}
    </div>
  )
}
