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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
        <input
          type="text"
          value={formData.username || ""}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          placeholder="Your username"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Custom username to display in conversations</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Auto-update</label>
        <select
          value={formData.update || "auto"}
          onChange={(e) => setFormData({ ...formData, update: e.target.value as "disable" | "notify" | "auto" })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="auto">Auto</option>
          <option value="notify">Notify</option>
          <option value="disable">Disable</option>
        </select>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Update opencode automatically, on notification or never</p>
      </div>

      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.snapshots ?? false}
            onChange={(e) => setFormData({ ...formData, snapshots: e.target.checked })}
            className="rounded border-gray-300 dark:border-gray-700"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Enable snapshots</span>
        </label>
        <p className="mt-1 ml-6 text-xs text-gray-500 dark:text-gray-400">
          Take snapshots of file state during sessions
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Share Mode</label>
        <select
          value={formData.share || "manual"}
          onChange={(e) => setFormData({ ...formData, share: e.target.value as "manual" | "auto" | "disabled" })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="manual">Manual</option>
          <option value="auto">Auto</option>
          <option value="disabled">Disabled</option>
        </select>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Control session sharing behavior</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Working directory</label>
        <div className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900 text-xs font-mono text-gray-900 dark:text-gray-100 truncate">
          {worktree ?? "Unknown"}
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Directory where the OpenCode server was started.
        </p>
      </div>
    </div>
  )
}
