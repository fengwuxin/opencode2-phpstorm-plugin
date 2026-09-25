import { Button } from "../common"

interface SettingsFooterProps {
  isSaving: boolean
  isLoading: boolean
  hasUnsavedChanges: boolean
  successMessage: string | null
  onSave: () => void
  onCancel: () => void
}

export function SettingsFooter({
  isSaving,
  isLoading,
  hasUnsavedChanges,
  successMessage,
  onSave,
  onCancel,
}: SettingsFooterProps) {
  return (
    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
      <div>
        {successMessage && <span className="text-sm text-green-600 dark:text-green-400">{successMessage}</span>}
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
          取消
        </Button>
        <Button
          variant="primary"
          onClick={onSave}
          disabled={isSaving || isLoading || !hasUnsavedChanges}
          loading={isSaving}
        >
          保存修改
        </Button>
      </div>
    </div>
  )
}
