import { useState, useEffect } from "react"
import { sdk } from "../lib/api/sdkClient"
import { eventEmitter } from "../lib/api/events"
import type { Agent } from "@opencode-ai/sdk/client"
import { useDropdown } from "../hooks/useDropdown"

interface AgentSelectorProps {
  selectedAgent?: string
  onSelect: (agentName: string) => void | Promise<void>
  disabled?: boolean
}

export function AgentSelector({ selectedAgent, onSelect, disabled }: AgentSelectorProps) {
  const { isOpen, searchTerm, setSearchTerm, dropdownRef, close, toggle } = useDropdown()
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load agents on mount
  useEffect(() => {
    let active = true

    async function loadAgents() {
      setIsLoading(true)
      try {
        const response = await sdk.app.agents()

        if (!active) return

        if (response.error) {
          console.error("[AgentSelector] Failed to load agents:", response.error)
          setIsLoading(false)
          return
        }

        if (response.data) {
          // Filter agents to only show 'primary' and 'all' modes (not 'subagent') and hide 'hidden' agents
          const filteredAgents = response.data.filter((agent: any) => agent.mode !== "subagent" && !agent.hidden)
          setAgents(filteredAgents)
        }
      } catch (err) {
        if (active) {
          console.error("[AgentSelector] Failed to load agents:", err)
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadAgents()
    const unsubscribe = eventEmitter.on("server.connected", () => {
      if (!active) return
      void loadAgents()
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  // Get current selection display
  const getCurrentDisplay = () => {
    if (!selectedAgent) {
      // Use first available agent or fallback to 'build'
      return agents.length > 0 ? agents[0].name : "build"
    }

    const agent = agents.find((a) => a.name === selectedAgent)
    return agent ? agent.name : selectedAgent
  }

  const handleSelect = async (agentName: string) => {
    await onSelect(agentName)
    close()
  }

  // Filter agents based on search term
  const filteredAgents = agents.filter((agent) => {
    if (!searchTerm) return true
    const lowerSearch = searchTerm.toLowerCase()
    return (
      agent.name.toLowerCase().includes(lowerSearch) ||
      (agent.description && agent.description.toLowerCase().includes(lowerSearch))
    )
  })

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggle}
        disabled={disabled || isLoading}
        className="h-6 px-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        title="选择 Agent"
        data-tip="选择 Agent"
      >
        {getCurrentDisplay()}
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-1 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden flex flex-col">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索 Agent..."
              className="w-full px-2 py-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Agents list */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-4 text-xs text-gray-500 dark:text-gray-400 text-center">加载 Agent...</div>
            ) : filteredAgents.length === 0 ? (
              <div className="p-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                {searchTerm ? "未找到 Agent" : "没有可用的 Agent"}
              </div>
            ) : (
              filteredAgents.map((agent) => {
                const isSelected = selectedAgent === agent.name

                return (
                  <button
                    key={agent.name}
                    onClick={() => handleSelect(agent.name)}
                    className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 last:border-0 ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                        : "text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium truncate">{agent.name}</span>
                        {agent.builtIn && (
                          <span className="px-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] rounded">
                            built-in
                          </span>
                        )}
                      </div>
                      {agent.description && (
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2">
                          {agent.description}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <svg className="w-4 h-4 ml-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
