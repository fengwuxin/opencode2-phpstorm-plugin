import { useState } from "react"
import { sdk } from "../../../../lib/api/sdkClient"

interface UseProviderManagementProps {
  configuredProviders: string[]
  setConfiguredProviders: (providers: string[]) => void
  selectedProviderToAdd: string
  setSelectedProviderToAdd: (provider: string) => void
  apiKeys: Record<string, string>
  setApiKeys: (keys: Record<string, string>) => void
  markProvidersDirty: () => void
}

export function useProviderManagement({
  configuredProviders,
  setConfiguredProviders,
  selectedProviderToAdd,
  setSelectedProviderToAdd,
  apiKeys,
  setApiKeys,
  markProvidersDirty,
}: UseProviderManagementProps) {
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)
  const [providerToDelete, setProviderToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleAddProvider = (providerId: string) => {
    if (!providerId) return
    setSelectedProviderToAdd(providerId)
    setExpandedProvider(providerId)
    // Optimistically add to displayed list via selectedProviderToAdd state
    // It will be permanently added to configuredProviders when saved (API key) or logged in (OAuth)
  }

  const handleDeleteProvider = (providerId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setProviderToDelete(providerId)
  }

  const confirmDeleteProvider = async () => {
    if (!providerToDelete) return

    setIsDeleting(true)
    try {
      await sdk.auth.remove(providerToDelete)
      markProvidersDirty()
      setConfiguredProviders(configuredProviders.filter((id) => id !== providerToDelete))
      if (selectedProviderToAdd === providerToDelete) {
        setSelectedProviderToAdd("")
      }
      // Also clear any pending API key input
      const newApiKeys = { ...apiKeys }
      delete newApiKeys[providerToDelete]
      setApiKeys(newApiKeys)
    } catch (e) {
      console.error("Failed to remove provider", e)
      alert("移除 Provider 失败")
    } finally {
      setIsDeleting(false)
      setProviderToDelete(null)
    }
  }

  return {
    expandedProvider,
    setExpandedProvider,
    providerToDelete,
    setProviderToDelete,
    isDeleting,
    handleAddProvider,
    handleDeleteProvider,
    confirmDeleteProvider,
  }
}
