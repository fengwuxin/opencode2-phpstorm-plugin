import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { sdk } from "../lib/api/sdkClient"
import { eventEmitter } from "../lib/api/events"
import { visibleProviders, visibilityMap, type ModelVisibility } from "../lib/model-visibility"
import type { Provider } from "@opencode-ai/sdk/client"
import { useDropdown } from "../hooks/useDropdown"
import { ManageModels } from "./ManageModels"

interface ModelSelectorProps {
  selectedProviderId?: string
  selectedModelId?: string
  onSelect: (providerId: string, modelId: string) => void | Promise<void>
  disabled?: boolean
}

interface ModelEntry {
  providerID: string
  modelID: string
}

const MAX_RECENT = 10

function isModelAvailable(providers: Provider[], providerID: string, modelID: string) {
  return providers.some((provider) => provider.id === providerID && provider.models[modelID] !== undefined)
}

function StarIcon({ filled, onClick }: { filled: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 p-0.5 hover:scale-110 transition-transform"
      title={filled ? "取消收藏" : "添加收藏"}
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill={filled ? "#eab308" : "none"} stroke={filled ? "#eab308" : "currentColor"} strokeWidth={1.5}>
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    </button>
  )
}

export function ModelSelector({ selectedProviderId, selectedModelId, onSelect, disabled }: ModelSelectorProps) {
  const { isOpen, searchTerm, setSearchTerm, dropdownRef, close, toggle } = useDropdown()
  const [providers, setProviders] = useState<Provider[]>([])
  const [defaultIds, setDefaultIds] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(true)
  const [recent, setRecent] = useState<ModelEntry[]>([])
  const [favorite, setFavorite] = useState<ModelEntry[]>([])
  const [visibility, setVisibility] = useState<ModelVisibility[]>([])
  const [isManageOpen, setIsManageOpen] = useState(false)
  const retryAttempts = useRef(0)

  const visibilityByKey = useMemo(() => visibilityMap(visibility), [visibility])
  const visible = useMemo(() => visibleProviders(providers, visibilityByKey), [providers, visibilityByKey])

  const isFavorite = useCallback(
    (providerID: string, modelID: string) => favorite.some((f) => f.providerID === providerID && f.modelID === modelID),
    [favorite],
  )

  const reload = useCallback(async () => {
    // Provider data comes over HTTP and preferences over the IDE bridge; load them
    // independently so a slow bridge request cannot block the model list.
    const providersPromise = sdk.config.providers()
    const prefsPromise = sdk.model.get()

    const provRes = await providersPromise
    if (provRes.error) {
      console.error("[ModelSelector] Failed to load providers:", provRes.error)
    } else if (provRes.data) {
      setProviders(provRes.data.providers)
      setDefaultIds(provRes.data.default)
    }

    const modelRes = await prefsPromise
    if (modelRes.data) {
      setRecent(modelRes.data.recent.slice(0, MAX_RECENT))
      setFavorite(modelRes.data.favorite)
      setVisibility(Array.isArray(modelRes.data.user) ? modelRes.data.user : [])
    }
  }, [])

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      await reload()
    } catch (err) {
      console.error("[ModelSelector] Failed to load:", err)
    } finally {
      setIsLoading(false)
    }
  }, [reload])

  useEffect(() => {
    let active = true

    const run = async () => {
      await load()
      if (!active) return
    }

    void run()
    const unsubscribe = eventEmitter.on("server.connected", () => {
      if (!active) return
      void load()
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [load])

  // The backend can be warming up when the panel opens and briefly report no
  // providers; retry a few times instead of leaving the picker empty.
  useEffect(() => {
    if (isLoading || providers.length > 0) {
      retryAttempts.current = 0
      return
    }
    if (retryAttempts.current >= 15) return
    retryAttempts.current += 1
    const timer = window.setTimeout(() => void load(), 2000)
    return () => window.clearTimeout(timer)
  }, [isLoading, providers.length, load])

  // Refresh providers and visibility whenever the picker opens so settings changes
  // (enabled providers) apply without reloading the panel.
  useEffect(() => {
    if (!isOpen) return
    void reload()
  }, [isOpen, reload])

  const persistVisibility = useCallback((next: ModelVisibility[]) => {
    setVisibility(next)
    sdk.model.update({ body: { user: next } }).catch((err) =>
      console.error("[ModelSelector] Failed to update model visibility:", err),
    )
  }, [])

  const toggleModel = useCallback(
    (providerID: string, modelID: string, show: boolean) => {
      // Visible is the default, so only hidden models need an entry.
      const next = visibility.filter((item) => item.providerID !== providerID || item.modelID !== modelID)
      if (!show) next.push({ providerID, modelID, visibility: "hide" })
      persistVisibility(next)
    },
    [visibility, persistVisibility],
  )

  const toggleProvider = useCallback(
    (provider: Provider, show: boolean) => {
      const modelIDs = new Set(Object.keys(provider.models))
      const next = visibility.filter((item) => item.providerID !== provider.id || !modelIDs.has(item.modelID))
      if (!show) {
        for (const modelID of modelIDs) {
          next.push({ providerID: provider.id, modelID, visibility: "hide" })
        }
      }
      persistVisibility(next)
    },
    [visibility, persistVisibility],
  )

  const getCurrentDisplay = () => {
    const pid = selectedProviderId || defaultIds.provider
    const mid = selectedModelId || defaultIds.model
    if (!pid || !mid) return "选择模型"
    const provider = providers.find((p) => p.id === pid)
    if (!provider) return "选择模型"
    return provider.models[mid]?.name || "选择模型"
  }

  const handleSelect = async (providerID: string, modelID: string) => {
    await onSelect(providerID, modelID)

    const entry = { providerID, modelID }
    const deduped = [entry, ...recent.filter((r) => r.providerID !== providerID || r.modelID !== modelID)]
    if (deduped.length > MAX_RECENT) deduped.length = MAX_RECENT
    setRecent(deduped)

    sdk.model.update({ body: { recent: deduped } }).catch((err) =>
      console.error("[ModelSelector] Failed to update recent:", err),
    )

    close()
  }

  const toggleFavorite = async (providerID: string, modelID: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const exists = isFavorite(providerID, modelID)
    const next = exists
      ? favorite.filter((f) => f.providerID !== providerID || f.modelID !== modelID)
      : [{ providerID, modelID }, ...favorite]
    setFavorite(next)

    sdk.model.update({ body: { favorite: next } }).catch((err) =>
      console.error("[ModelSelector] Failed to update favorites:", err),
    )
  }

  const filterModels = (provider: Provider) => {
    if (!searchTerm) return Object.entries(provider.models)
    const q = searchTerm.toLowerCase()
    return Object.entries(provider.models).filter(
      ([, model]) => model.name.toLowerCase().includes(q) || provider.name.toLowerCase().includes(q),
    )
  }

  const filteredFavorites = () => {
    // Entries from providers that are disabled or no longer available are dropped,
    // matching the desktop client which only renders known provider/model pairs.
    const list = favorite.filter((f) => isModelAvailable(providers, f.providerID, f.modelID))
    if (!searchTerm) return list
    const q = searchTerm.toLowerCase()
    return list.filter((f) => {
      const provider = providers.find((p) => p.id === f.providerID)
      const name = provider?.models[f.modelID]?.name || f.modelID
      return name.toLowerCase().includes(q) || f.providerID.toLowerCase().includes(q)
    })
  }

  const filteredRecent = () => {
    const list = recent.filter(
      (r) => !isFavorite(r.providerID, r.modelID) && isModelAvailable(providers, r.providerID, r.modelID),
    )
    if (!searchTerm) return list
    const q = searchTerm.toLowerCase()
    return list.filter((r) => {
      const provider = providers.find((p) => p.id === r.providerID)
      const name = provider?.models[r.modelID]?.name || r.modelID
      return name.toLowerCase().includes(q) || r.providerID.toLowerCase().includes(q)
    })
  }

  const renderModelRow = (providerID: string, modelID: string, extraLabel?: React.ReactNode) => {
    const isSelected = selectedProviderId === providerID && selectedModelId === modelID
    const provider = providers.find((p) => p.id === providerID)
    const model = provider?.models[modelID]
    const name = model?.name || modelID
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return
      if (event.key !== "Enter" && event.key !== " ") return
      event.preventDefault()
      void handleSelect(providerID, modelID)
    }

    return (
      <div
        key={`${providerID}:${modelID}`}
        onClick={() => handleSelect(providerID, modelID)}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 flex items-center justify-between cursor-pointer ${
          isSelected
            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
            : "text-gray-900 dark:text-gray-100"
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="font-medium truncate">{name}</span>
          {extraLabel}
          <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[6rem]">
            {provider?.name || providerID}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <StarIcon filled={isFavorite(providerID, modelID)} onClick={(e) => toggleFavorite(providerID, modelID, e)} />
          {isSelected && (
            <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggle}
        disabled={disabled || isLoading}
        className="h-6 px-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        title="选择模型"
        data-tip="选择模型"
      >
        {getCurrentDisplay()}
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-1 min-w-[300px] w-max max-w-[500px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索模型..."
              className="w-full px-2 py-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-4 text-xs text-gray-500 dark:text-gray-400 text-center">加载模型...</div>
            ) : providers.length === 0 ? (
              <div className="p-4 text-xs text-gray-500 dark:text-gray-400 text-center">未配置 Provider</div>
            ) : (
              <>
                {/* Favorites group */}
                {filteredFavorites().length > 0 && (
                  <div className="border-b border-gray-100 dark:border-gray-800">
                    <div className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                      Favorites
                    </div>
                    {filteredFavorites().map((item) => renderModelRow(item.providerID, item.modelID))}
                  </div>
                )}

                {/* Recent group (excluding favorites) */}
                {filteredRecent().length > 0 && (
                  <div className="border-b border-gray-100 dark:border-gray-800">
                    <div className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                      Recent
                    </div>
                    {filteredRecent().map((item) => renderModelRow(item.providerID, item.modelID))}
                  </div>
                )}

                {/* Provider groups */}
                {visible.map((provider) => {
                  const filtered = filterModels(provider)
                  if (filtered.length === 0) return null

                  return (
                    <div key={provider.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <div className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                        {provider.name}
                      </div>
                      {filtered.map(([modelId, model]) => {
                        const isDefault = defaultIds.provider === provider.id && defaultIds.model === modelId

                        return renderModelRow(
                          provider.id,
                          modelId,
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                            {model.capabilities.reasoning && (
                              <span className="px-1 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-[9px] leading-none">
                                reasoning
                              </span>
                            )}
                            {isDefault && (
                              <span className="px-1 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-[9px] leading-none">
                                default
                              </span>
                            )}
                          </div>,
                        )
                      })}
                    </div>
                  )
                })}

                {visible.length === 0 && (
                  <div className="p-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                    没有显示的模型，可在「管理模型」中开启。
                  </div>
                )}
              </>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                close()
                setIsManageOpen(true)
              }}
              className="w-full px-3 py-1.5 text-xs text-left text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              管理模型...
            </button>
          </div>
        </div>
      )}

      <ManageModels
        isOpen={isManageOpen}
        providers={providers}
        visibility={visibilityByKey}
        onToggle={toggleModel}
        onToggleProvider={toggleProvider}
        onClose={() => setIsManageOpen(false)}
      />
    </div>
  )
}
