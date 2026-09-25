import type { Provider } from "@opencode-ai/sdk/client"
import type { RefObject } from "react"

interface ProviderDropdownProps {
  isOpen: boolean
  searchTerm: string
  filteredProviders: Provider[]
  dropdownRef: RefObject<HTMLDivElement | null>
  onToggle: () => void
  onSearchChange: (term: string) => void
  onSelectProvider: (providerId: string) => void
}

export function ProviderDropdown({
  isOpen,
  searchTerm,
  filteredProviders,
  dropdownRef,
  onToggle,
  onSearchChange,
  onSelectProvider,
}: ProviderDropdownProps) {
  return (
    <div className="relative mb-4" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:border-gray-400 dark:hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm shadow-sm"
      >
        <span className="font-medium">添加 Provider...</span>
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-60 overflow-hidden flex flex-col ring-1 ring-black/5">
          <div className="p-2 border-b border-gray-100 dark:border-gray-800">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜索 Provider..."
              className="w-full px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {filteredProviders.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">未找到 Provider</div>
            ) : (
              filteredProviders.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelectProvider(p.id)}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md transition-colors"
                >
                  {p.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
