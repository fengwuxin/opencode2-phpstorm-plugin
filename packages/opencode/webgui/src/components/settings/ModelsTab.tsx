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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Model</label>
        <input
          type="text"
          value={formData.model || ""}
          onChange={(e) => setFormData({ ...formData, model: e.target.value })}
          placeholder="e.g., anthropic/claude-sonnet-4-5"
          className="modern-input w-full font-mono text-sm"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Format: provider/model (e.g., anthropic/claude-sonnet-4-5)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Small Model</label>
        <input
          type="text"
          value={formData.small_model || ""}
          onChange={(e) => setFormData({ ...formData, small_model: e.target.value })}
          placeholder="e.g., anthropic/claude-haiku-3-5"
          className="modern-input w-full font-mono text-sm"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Used for tasks like title generation</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enabled Providers</label>
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
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">No providers found.</p>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          All providers are enabled by default; uncheck one to disable it and hide its models.
        </p>
      </div>
    </div>
  )
}
