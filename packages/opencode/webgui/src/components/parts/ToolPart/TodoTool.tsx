import type { Todo } from "./utils"

interface TodoToolProps {
  output: string
}

export function TodoTool({ output }: TodoToolProps) {
  try {
    const todos = JSON.parse(output)
    if (!Array.isArray(todos)) {
      return (
        <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-800">
          <div className="text-[10px] uppercase font-semibold text-gray-500 dark:text-gray-400 mb-1">输出</div>
          <div className="text-xs bg-white dark:bg-gray-900 rounded p-1.5 overflow-x-auto max-h-60 overflow-y-auto">
            <pre className="font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{output}</pre>
          </div>
        </div>
      )
    }

    return (
      <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-800">
        <div className="text-[10px] uppercase font-semibold text-gray-500 dark:text-gray-400 mb-1">输出</div>
        <div className="text-xs bg-white dark:bg-gray-900 rounded p-1.5 overflow-x-auto max-h-60 overflow-y-auto">
          <div className="space-y-1.5">
            {todos.map((todo: Todo, index: number) => (
              <div
                key={todo.id || index}
                className="flex items-center gap-2 px-2 py-1.5 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex-shrink-0">{getStatusIcon(todo.status)}</div>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <p
                    className={`text-xs flex-1 truncate ${todo.status === "completed" ? "line-through text-gray-500 dark:text-gray-500" : "text-gray-700 dark:text-gray-300"}`}
                  >
                    {todo.content}
                  </p>
                  {todo.id && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-600 font-mono flex-shrink-0">
                      {todo.id}
                    </span>
                  )}
                  {todo.priority && <div className="flex-shrink-0">{getPriorityBadge(todo.priority)}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  } catch {
    return (
      <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-800">
        <div className="text-[10px] uppercase font-semibold text-gray-500 dark:text-gray-400 mb-1">输出</div>
        <div className="text-xs bg-white dark:bg-gray-900 rounded p-1.5 overflow-x-auto max-h-60 overflow-y-auto">
          <pre className="font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{output}</pre>
        </div>
      </div>
    )
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "completed":
      return (
        <svg
          className="w-4 h-4 text-green-600 dark:text-green-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )
    case "in_progress":
      return (
        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )
    case "cancelled":
      return (
        <svg className="w-4 h-4 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )
    default: // pending
      return (
        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12a9 9 0 1118 0 9 9 0 01-18 0z" />
        </svg>
      )
  }
}

function getPriorityBadge(priority: string) {
  const colors = {
    high: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    medium: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
    low: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  }
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colors[priority as keyof typeof colors] || colors.low}`}
    >
      {priority}
    </span>
  )
}
