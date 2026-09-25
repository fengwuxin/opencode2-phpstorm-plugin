import type { Provider } from "@opencode-ai/sdk/client"
import { useState } from "react"
import { useDropdown } from "../../../hooks/useDropdown"
import { useProviders } from "../../../state/ProvidersContext"
import { ConfirmModal } from "../../ConfirmModal"
import { useApiKeys } from "./hooks/useApiKeys"
import { useOAuthFlow } from "./hooks/useOAuthFlow"
import { useProviderManagement } from "./hooks/useProviderManagement"
import { ProviderDropdown } from "./ProviderDropdown"
import { ProviderCard } from "./ProviderCard"
import { EmptyState } from "./EmptyState"
import { useDisplayedProviders, useAvailableProviders, useFilteredProviders } from "./utils"

interface ApiKeysTabProps {
  providers: Provider[]
  configuredProviders: string[]
  setConfiguredProviders: (providers: string[]) => void
  apiKeys: Record<string, string>
  setApiKeys: (keys: Record<string, string>) => void
  showApiKeys: Record<string, boolean>
  setShowApiKeys: (show: Record<string, boolean>) => void
}

export function ApiKeysTab({
  providers,
  configuredProviders,
  setConfiguredProviders,
  apiKeys,
  setApiKeys,
  showApiKeys,
  setShowApiKeys,
}: ApiKeysTabProps) {
  const { markProvidersDirty } = useProviders()
  const [selectedProviderToAdd, setSelectedProviderToAdd] = useState<string>("")
  const { isOpen, searchTerm, setSearchTerm, dropdownRef, close, toggle } = useDropdown()

  // Derived state
  const displayedProviders = useDisplayedProviders(providers, configuredProviders, selectedProviderToAdd)
  const availableProviders = useAvailableProviders(providers, configuredProviders)
  const filteredAvailableProviders = useFilteredProviders(availableProviders, searchTerm)

  // Hooks for API methods
  const { methods, loadingMethods } = useApiKeys(displayedProviders)

  // Hooks for OAuth flow
  const oAuthFlow = useOAuthFlow({
    configuredProviders,
    setConfiguredProviders,
    selectedProviderToAdd,
    setSelectedProviderToAdd,
    markProvidersDirty,
  })

  // Hooks for provider management
  const providerManagement = useProviderManagement({
    configuredProviders,
    setConfiguredProviders,
    selectedProviderToAdd,
    setSelectedProviderToAdd,
    apiKeys,
    setApiKeys,
    markProvidersDirty,
  })

  const handleSelectProvider = (providerId: string) => {
    providerManagement.handleAddProvider(providerId)
    close()
  }

  const handleManualCodeCancel = () => {
    oAuthFlow.handleCancel(oAuthFlow.manualCodeState?.providerId || "")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          配置 API 密钥或登录 AI Provider，密钥会被安全保存。
        </p>
      </div>

      <ProviderDropdown
        isOpen={isOpen}
        searchTerm={searchTerm}
        filteredProviders={filteredAvailableProviders}
        dropdownRef={dropdownRef}
        onToggle={toggle}
        onSearchChange={setSearchTerm}
        onSelectProvider={handleSelectProvider}
      />

      <div className="space-y-2">
        {displayedProviders.length === 0 ? (
          <EmptyState />
        ) : (
          displayedProviders.map((provider) => {
            const providerMethods = methods[provider.id] || []
            const isLoading = loadingMethods[provider.id]
            const isTemporary = !configuredProviders.includes(provider.id)
            const isExpanded = providerManagement.expandedProvider === provider.id
            const isConnected = configuredProviders.includes(provider.id)

            return (
              <ProviderCard
                key={provider.id}
                provider={provider}
                isExpanded={isExpanded}
                isConnected={isConnected}
                isTemporary={isTemporary}
                isLoading={isLoading}
                methods={providerMethods}
                authStatus={oAuthFlow.authStatus[provider.id] || ""}
                authInstructions={oAuthFlow.authInstructions[provider.id]}
                manualCodeState={oAuthFlow.manualCodeState}
                manualCodeInput={oAuthFlow.manualCodeInput}
                apiKey={apiKeys[provider.id] || ""}
                showApiKey={showApiKeys[provider.id] || false}
                onToggleExpand={() => providerManagement.setExpandedProvider(isExpanded ? null : provider.id)}
                onDelete={providerManagement.handleDeleteProvider}
                onOAuthLogin={oAuthFlow.handleOAuthLogin}
                onCancelOAuth={oAuthFlow.handleCancel}
                onManualCodeChange={oAuthFlow.setManualCodeInput}
                onManualCodeSubmit={oAuthFlow.handleManualCodeSubmit}
                onManualCodeCancel={handleManualCodeCancel}
                onApiKeyChange={(value) => setApiKeys({ ...apiKeys, [provider.id]: value })}
                onToggleApiKeyVisibility={() =>
                  setShowApiKeys({ ...showApiKeys, [provider.id]: !showApiKeys[provider.id] })
                }
              />
            )
          })
        )}
      </div>

      <ConfirmModal
        isOpen={!!providerManagement.providerToDelete}
        onClose={() => providerManagement.setProviderToDelete(null)}
        onConfirm={providerManagement.confirmDeleteProvider}
        title="移除 Provider"
        message={`Are you sure you want to remove ${providerManagement.providerToDelete}? This will remove any stored authentication tokens.`}
        confirmText="移除"
        cancelText="取消"
        variant="danger"
        isLoading={providerManagement.isDeleting}
      />
    </div>
  )
}
