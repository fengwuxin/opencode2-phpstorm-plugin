import { useEffect, useState } from "react"
import { sdk } from "../../lib/api/sdkClient"
import { ConfirmModal } from "../ConfirmModal"
import { GeneralTab } from "../settings/GeneralTab"
import { ApiKeysTab } from "../settings/ApiKeysTab"
import { ModelsTab } from "../settings/ModelsTab"
import { AdvancedTab } from "../settings/AdvancedTab"
import { useProviders } from "../../state/ProvidersContext.tsx"
import { useCustomApi } from "../../state/IdeBridgeContext"
import { useSettingsForm } from "./hooks/useSettingsForm"
import { useUnsavedChanges } from "./hooks/useUnsavedChanges"
import { TabBar } from "./TabBar"
import { SettingsHeader } from "./SettingsHeader"
import { SettingsFooter } from "./SettingsFooter"

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

type TabType = "general" | "api-keys" | "models" | "advanced"

/**
 * Config fields the settings panel owns. They are written to the global
 * opencode.json(c) on save; other fields shown in the tabs are read-only.
 */
const CONFIG_FIELDS = [
  "username",
  "update",
  "snapshots",
  "share",
  "watcher",
  "plugins",
  "model",
  "small_model",
  "disabled_providers",
] as const

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("general")
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const { markProvidersDirty } = useProviders()
  const customApi = useCustomApi()

  const {
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
  } = useSettingsForm(isOpen, customApi)

  const { hasUnsavedChanges, showCloseConfirm, setShowCloseConfirm } = useUnsavedChanges(
    formData,
    originalFormData,
    apiKeys,
  )

  // Close handler with unsaved changes check
  const handleClose = () => {
    if (hasUnsavedChanges() && !isSaving) {
      setShowCloseConfirm(true)
    } else {
      onClose()
    }
  }

  // Force close without confirmation
  const forceClose = () => {
    setShowCloseConfirm(false)
    onClose()
  }

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving) {
        handleClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, isSaving, hasUnsavedChanges])

  const handleSave = async () => {
    setIsSaving(true)
    setSuccessMessage(null)
    setSaveError(null)

    try {
      // Only the fields owned by this panel are written, and only when they changed:
      // opencode validates its config strictly, so unrelated form state must not leak in.
      const patch = Object.fromEntries(
        CONFIG_FIELDS.filter(
          (field) => JSON.stringify(formData[field]) !== JSON.stringify(originalFormData[field]),
        ).map((field) => [field, formData[field]]),
      )

      if (Object.keys(patch).length > 0) {
        const configResponse = await sdk.config.update({
          body: patch,
        })

        if (configResponse.error) {
          throw new Error(configResponse.error.message)
        }

        // Keep the form in sync with what was just saved.
        const savedData = structuredClone(formData)
        setFormData(savedData)
        setOriginalFormData(savedData)
      }

      // Save API keys (only when custom API is available)
      if (customApi) {
        const apiKeyEntries = Object.entries(apiKeys).filter(([_, key]) => key && key.trim())

        for (const [providerID, key] of apiKeyEntries) {
          await sdk.auth.set(providerID, {
            type: "api",
            key: key.trim(),
          })
        }

        // Clear API keys after successful save
        setApiKeys({})
      }

      setSuccessMessage("Settings saved successfully")
      markProvidersDirty()
      setTimeout(() => {
        setSuccessMessage(null)
        onClose()
      }, 1500)
    } catch (err) {
      // Keep the panel open and surface the reason instead of failing silently
      setSaveError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="modern-card w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col shadow-2xl">
          <SettingsHeader onClose={handleClose} />

          <TabBar activeTab={activeTab} onTabChange={setActiveTab} hideApiKeys={!customApi} />

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-3 py-3">
            {saveError && (
              <div className="mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 text-sm text-red-800 dark:text-red-200">
                {saveError}
              </div>
            )}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500 dark:text-gray-400">Loading settings...</div>
              </div>
            ) : error ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 text-sm text-red-800 dark:text-red-200">
                {error}
              </div>
            ) : (
              <>
                {activeTab === "general" && <GeneralTab formData={formData} setFormData={setFormData} />}

                {customApi && activeTab === "api-keys" && (
                  <ApiKeysTab
                    providers={providers}
                    configuredProviders={configuredProviders}
                    setConfiguredProviders={setConfiguredProviders}
                    apiKeys={apiKeys}
                    setApiKeys={setApiKeys}
                    showApiKeys={showApiKeys}
                    setShowApiKeys={setShowApiKeys}
                  />
                )}

                {activeTab === "models" && (
                  <ModelsTab
                    formData={formData}
                    setFormData={setFormData}
                    providers={providers}
                    configuredProviders={configuredProviders}
                  />
                )}

                {activeTab === "advanced" && <AdvancedTab formData={formData} setFormData={setFormData} />}
              </>
            )}
          </div>

          <SettingsFooter
            isSaving={isSaving}
            isLoading={isLoading}
            hasUnsavedChanges={hasUnsavedChanges()}
            successMessage={successMessage}
            onSave={handleSave}
            onCancel={handleClose}
          />
        </div>
      </div>

      {/* Unsaved changes confirmation */}
      <ConfirmModal
        isOpen={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        onConfirm={forceClose}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to close without saving?"
        confirmText="Discard Changes"
        cancelText="Keep Editing"
        variant="warning"
      />
    </>
  )
}
