import { useState, useEffect, useMemo } from "react"
import { sdk } from "../../../lib/api/sdkClient"
import { disabledProviderIds } from "../../../lib/provider-config"
import type { Provider } from "@opencode-ai/sdk/client"
import type { SettingsFormData } from "../../settings/types"

interface ProviderWithAuth extends Provider {
  hasAuth?: boolean
  authKey?: string
}

interface IntegrationInfo {
  name?: string
  connections?: unknown[]
}

function catalogProvider(id: string, name: string) {
  return { id, name, source: "config", env: [], options: {}, models: {} } as unknown as ProviderWithAuth
}

export function useSettingsForm(isOpen: boolean, customApi?: boolean) {
  const [formData, setFormData] = useState<SettingsFormData>({})
  const [originalFormData, setOriginalFormData] = useState<SettingsFormData>({})
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({})
  const [providers, setProviders] = useState<ProviderWithAuth[]>([])
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([])
  const [integrations, setIntegrations] = useState<Record<string, IntegrationInfo>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const fetchData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch config
        const configResponse = await sdk.config.get()

        if (configResponse.error) {
          throw new Error("Failed to load config")
        }

        if (configResponse.data) {
          const configData = structuredClone(configResponse.data) as SettingsFormData & { experimental?: unknown }
          // The server normalizes `disabled_providers` into `experimental.policies`, so the
          // effective disabled set has to be derived from either shape.
          const disabled = disabledProviderIds(configData as unknown as Record<string, unknown>)
          configData.disabled_providers = disabled
          setFormData(configData)
          setOriginalFormData(configData)
        } else {
          setFormData({})
          setOriginalFormData({})
        }

        // Fetch providers
        const providersRes = await sdk.config.providers()
        if (providersRes.error) {
          throw new Error("Failed to load providers")
        }
        if (providersRes.data) {
          setProviders(providersRes.data.providers.sort((a, b) => a.name.localeCompare(b.name)))
        }

        // Fetch configured providers (requires custom API)
        if (customApi !== false) {
          const authList = await sdk.auth.list()
          setConfiguredProviders(Object.keys(authList))
          setIntegrations(authList as Record<string, IntegrationInfo>)
        }

        // Reset API keys to empty (they should be entered fresh)
        setApiKeys({})
      } catch (err) {
        setError(String(err))
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [isOpen, customApi])

  /**
   * Every provider the user can toggle: the enabled ones from the server, plus connected
   * providers and currently disabled ones so they stay visible and can be re-enabled.
   */
  const providerCatalog = useMemo(() => {
    const disabled = new Set(formData.disabled_providers ?? [])
    const map = new Map<string, ProviderWithAuth>()
    for (const provider of providers) map.set(provider.id, provider)
    for (const [id, integration] of Object.entries(integrations)) {
      const connections = Array.isArray(integration.connections) ? integration.connections : []
      if (!disabled.has(id) && connections.length === 0) continue
      if (!map.has(id)) map.set(id, catalogProvider(id, integration.name ?? id))
    }
    for (const id of disabled) {
      if (!map.has(id)) map.set(id, catalogProvider(id, id))
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [providers, integrations, formData.disabled_providers])

  return {
    formData,
    setFormData,
    originalFormData,
    setOriginalFormData,
    apiKeys,
    setApiKeys,
    showApiKeys,
    setShowApiKeys,
    providers,
    providerCatalog,
    configuredProviders,
    setConfiguredProviders,
    isLoading,
    error,
  }
}
