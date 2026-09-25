import { useMemo } from "react"
import type { Provider } from "@opencode-ai/sdk/client"
import type { SetSettingsFormData, SettingsFormData } from "./types"

interface ModelsTabProps {
  formData: SettingsFormData
  setFormData: SetSettingsFormData
  providers: Provider[]
}

export function ModelsTab({ formData, setFormData, providers }: ModelsTabProps) {
  const groups = useMemo(
    () =>
      providers
        .map((provider) => ({
          id: provider.id,
          name: provider.name ?? provider.id,
          models: Object.values(provider.models).sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .filter((group) => group.models.length > 0),
    [providers],
  )

  const modelSelect = (value: string | undefined, onChange: (value: string | undefined) => void) => {
    const known = groups.some((group) => group.models.some((model) => `${group.id}/${model.id}` === value))
    return (
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="modern-input w-full font-mono text-sm"
      >
        <option value="">（未设置）</option>
        {value && !known && <option value={value}>{value}</option>}
        {groups.map((group) => (
          <optgroup key={group.id} label={group.name}>
            {group.models.map((model) => (
              <option key={model.id} value={`${group.id}/${model.id}`}>
                {model.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">默认模型</label>
        {modelSelect(formData.model, (model) => setFormData({ ...formData, model }))}
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">新会话默认使用的模型</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">标题模型</label>
        {modelSelect(formData.small_model, (small_model) => setFormData({ ...formData, small_model }))}
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">用于生成标题等轻量任务</p>
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
