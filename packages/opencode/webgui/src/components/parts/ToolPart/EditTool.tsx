interface EditToolProps {
  diff: string
}

export function EditTool({ diff }: EditToolProps) {
  return (
    <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-800">
      <div className="text-[10px] uppercase font-semibold text-gray-500 dark:text-gray-400 mb-1">改动</div>
      <div className="text-xs bg-white dark:bg-gray-900 rounded p-1.5 overflow-x-auto max-h-60 overflow-y-auto">
        <pre className="font-mono text-[11px] whitespace-pre">
          {diff.split("\n").map((line, i) => {
            let className = "text-gray-700 dark:text-gray-300"
            if (line.startsWith("+") && !line.startsWith("+++")) {
              className = "text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800"
            }
            if (line.startsWith("-") && !line.startsWith("---")) {
              className = "text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-900"
            }
            if (line.startsWith("@@")) {
              className = "text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800"
            }
            return (
              <div key={i} className={className}>
                {line || " "}
              </div>
            )
          })}
        </pre>
      </div>
    </div>
  )
}
