interface BashToolProps {
  output: string
}

export function BashTool({ output }: BashToolProps) {
  return (
    <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-800">
      <div className="text-[10px] uppercase font-semibold text-gray-500 dark:text-gray-400 mb-1">输出</div>
      <div className="text-xs bg-white dark:bg-gray-900 rounded p-1.5 overflow-x-auto max-h-60 overflow-y-auto">
        <pre className="font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{output}</pre>
      </div>
    </div>
  )
}
