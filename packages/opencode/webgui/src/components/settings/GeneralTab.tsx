import { useState } from "react"
import { useProject } from "../../state/ProjectContext"
import { getLanguage, setLanguage, t, type Language } from "../../lib/i18n"
import type { SetSettingsFormData, SettingsFormData } from "./types"

interface GeneralTabProps {
  formData: SettingsFormData
  setFormData: SetSettingsFormData
}

export function GeneralTab({ formData, setFormData }: GeneralTabProps) {
  const { worktree } = useProject()
  const [language, setLanguageState] = useState<Language>(getLanguage())
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("界面语言")}</label>
        <select
          value={language}
          onChange={(e) => {
            const next = e.target.value as Language
            setLanguage(next)
            setLanguageState(next)
          }}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t("选择界面语言，立即生效（不写入 opencode 配置）")}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("用户名")}</label>
        <input
          type="text"
          value={formData.username || ""}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          placeholder={t("你的用户名")}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("在对话中显示的自定义用户名")}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("自动更新")}</label>
        <select
          value={formData.update || "auto"}
          onChange={(e) => setFormData({ ...formData, update: e.target.value as "disable" | "notify" | "auto" })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="auto">{t("自动")}</option>
          <option value="notify">{t("仅通知")}</option>
          <option value="disable">{t("禁用")}</option>
        </select>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("opencode 更新方式：自动 / 仅通知 / 从不")}</p>
      </div>

      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.snapshots ?? true}
            onChange={(e) => setFormData({ ...formData, snapshots: e.target.checked })}
            className="rounded border-gray-300 dark:border-gray-700"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">{t("启用快照")}</span>
        </label>
        <p className="mt-1 ml-6 text-xs text-gray-500 dark:text-gray-400">
          {t("在会话期间对文件状态创建快照")}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("工作目录")}</label>
        <div className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900 text-xs font-mono text-gray-900 dark:text-gray-100 truncate">
          {worktree ?? "Unknown"}
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t("OpenCode 服务的启动目录。")}
        </p>
      </div>
    </div>
  )
}
