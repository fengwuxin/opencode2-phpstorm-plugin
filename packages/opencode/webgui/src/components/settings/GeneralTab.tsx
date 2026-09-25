import { useProject } from "../../state/ProjectContext"
import type { SetSettingsFormData, SettingsFormData } from "./types"

interface GeneralTabProps {
  formData: SettingsFormData
  setFormData: SetSettingsFormData
}

export function GeneralTab({ formData, setFormData }: GeneralTabProps) {
  const { worktree } = useProject()
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">用户名</label>
        <input
          type="text"
          value={formData.username || ""}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          placeholder="你的用户名"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">在对话中显示的自定义用户名</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">自动更新</label>
        <select
          value={formData.update || "auto"}
          onChange={(e) => setFormData({ ...formData, update: e.target.value as "disable" | "notify" | "auto" })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="auto">自动</option>
          <option value="notify">仅通知</option>
          <option value="disable">禁用</option>
        </select>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">opencode 更新方式：自动 / 仅通知 / 从不</p>
      </div>

      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.snapshots ?? false}
            onChange={(e) => setFormData({ ...formData, snapshots: e.target.checked })}
            className="rounded border-gray-300 dark:border-gray-700"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">启用快照</span>
        </label>
        <p className="mt-1 ml-6 text-xs text-gray-500 dark:text-gray-400">
          在会话期间对文件状态创建快照
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">分享模式</label>
        <select
          value={formData.share || "manual"}
          onChange={(e) => setFormData({ ...formData, share: e.target.value as "manual" | "auto" | "disabled" })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="manual">手动</option>
          <option value="auto">自动</option>
          <option value="disabled">禁用</option>
        </select>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">控制会话分享行为</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">工作目录</label>
        <div className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900 text-xs font-mono text-gray-900 dark:text-gray-100 truncate">
          {worktree ?? "Unknown"}
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          OpenCode 服务的启动目录。
        </p>
      </div>
    </div>
  )
}
