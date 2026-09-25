import { t } from "../../../lib/i18n"
interface ManualCodeInputProps {
  value: string
  onValueChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
}

export function ManualCodeInput({ value, onValueChange, onSubmit, onCancel }: ManualCodeInputProps) {
  return (
    <div className="flex gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-100 dark:border-gray-800">
      <input
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={t("粘贴授权码")}
        className="flex-1 px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
      />
      <button
        onClick={onSubmit}
        disabled={!value}
        className="px-2 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Submit
      </button>
      <button
        onClick={onCancel}
        className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
      >
        Cancel
      </button>
    </div>
  )
}
