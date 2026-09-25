import { t } from "../../lib/i18n"
import type { SetSettingsFormData, SettingsFormData } from "./types"

interface AdvancedTabProps {
  formData: SettingsFormData
  setFormData: SetSettingsFormData
}

export function AdvancedTab({ formData, setFormData }: AdvancedTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("监听忽略规则")}</label>
        <textarea
          value={formData.watcher?.ignore?.join("\n") || ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              watcher: { ignore: e.target.value.split("\n").filter((line) => line.trim()) },
            })
          }
          placeholder="node_modules&#10;dist&#10;.git"
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("要忽略的文件模式（每行一个）")}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("插件")}</label>
        <textarea
          value={formData.plugins?.join("\n") || ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              plugins: e.target.value.split("\n").filter((line) => line.trim()),
            })
          }
          placeholder="plugin-name&#10;another-plugin"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("插件名称（每行一个）")}</p>
      </div>
    </div>
  )
}
