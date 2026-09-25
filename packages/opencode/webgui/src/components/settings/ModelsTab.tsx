import type { Provider } from "@opencode-ai/sdk/client"
import type { SetSettingsFormData, SettingsFormData } from "./types"

interface ModelsTabProps {
  formData: SettingsFormData
  setFormData: SetSettingsFormData
  providers: Provider[]
}

export function ModelsTab({ formData, setFormData, providers }: ModelsTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">默认模型</label>
        <input
          type="text"
          value={formData.model || ""}
          onChange={(e) => setFormData({ ...formData, model: e.target.value })}
          placeholder="例如 anthropic/claude-sonnet-4-5"
          className="modern-input w-full font-mono text-sm"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          格式：provider/model（例如 anthropic/claude-sonnet-4-5）
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">小模型</label>
        <input
          type="text"
          value={formData.small_model || ""}
          onChange={(e) => setFormData({ ...formData, small_model: e.target.value })}
          placeholder="例如 anthropic/claude-haiku-3-5"
          className="modern-input w-full font-mono text-sm"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">用于生成标题等任务</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">启用的 Provider</label>
        <div className="space-y-2">
          {providers.map((provider) => {
            const disabled = formData.disabled_providers || []
            return (
              <label key={provider.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={!disabled.includes(provider.id)}
                  onChange={(e) => {
                    const current = formData.disabled_providers || []
                    if (e.target.checked) {
                      setFormData({ ...formData, disabled_providers: current.filter((id) => id !== provider.id) })
                    } else {
                      setFormData({ ...formData, disabled_providers: [...current, provider.id] })
                    }
                  }}
                  className="rounded border-gray-300 dark:border-gray-700"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{provider.name}</span>
              </label>
            )
          })}
          {providers.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">未找到 Provider。</p>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          默认启用所有 Provider；取消勾选即禁用并隐藏其模型。
        </p>
      </div>
    </div>
  )
}
