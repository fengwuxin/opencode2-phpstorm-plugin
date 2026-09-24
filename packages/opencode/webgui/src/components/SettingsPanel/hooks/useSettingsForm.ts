import { useState, useEffect } from "react"
import { sdk } from "../../../lib/api/sdkClient"
import type { Provider } from "@opencode-ai/sdk/client"
import type { SettingsFormData } from "../../settings/types"

interface ProviderWithAuth extends Provider {
  hasAuth?: boolean
  authKey?: string
}

export function useSettingsForm(isOpen: boolean, customApi?: boolean) {
  const [formData, setFormData] = useState<SettingsFormData>({})
  const [originalFormData, setOriginalFormData] = useState<SettingsFormData>({})
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({})
  const [providers, setProviders] = useState<ProviderWithAuth[]>([])
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([])
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
          const configData = structuredClone(configResponse.data)
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
    configuredProviders,
    setConfiguredProviders,
    isLoading,
    error,
  }
}
