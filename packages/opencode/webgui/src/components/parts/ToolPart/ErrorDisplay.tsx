interface ErrorDisplayProps {
  error: string
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  return (
    <div className="px-3 py-1.5 bg-red-50 dark:bg-red-900/10">
      <div className="text-[10px] uppercase font-semibold text-red-600 dark:text-red-400 mb-1">错误</div>
      <div className="text-xs text-red-700 dark:text-red-300 font-mono">{error}</div>
    </div>
  )
}
