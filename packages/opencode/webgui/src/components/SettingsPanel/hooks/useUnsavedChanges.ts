import { useCallback, useState } from "react"
import type { SettingsFormData } from "../../settings/types"

export function useUnsavedChanges(
  formData: SettingsFormData,
  originalFormData: SettingsFormData,
  apiKeys: Record<string, string>,
) {
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  const hasUnsavedChanges = useCallback(() => {
    // Check if form data changed
    const formChanged = JSON.stringify(formData) !== JSON.stringify(originalFormData)

    // Check if any API keys were entered
    const apiKeysEntered = Object.values(apiKeys).some((key) => key.trim() !== "")

    return formChanged || apiKeysEntered
  }, [formData, originalFormData, apiKeys])

  return {
    hasUnsavedChanges,
    showCloseConfirm,
    setShowCloseConfirm,
  }
}
