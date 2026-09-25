import { useEffect, useMemo, useState } from "react"
import type { Provider } from "@opencode-ai/sdk/client"
import { isModelVisible, type ModelVisibility } from "../lib/model-visibility"
import { Modal, ModalBody, ModalHeader } from "./common"

interface ManageModelsProps {
  isOpen: boolean
  providers: Provider[]
  visibility: Map<string, ModelVisibility["visibility"]>
  onToggle: (providerID: string, modelID: string, visible: boolean) => void
  onToggleProvider: (provider: Provider, visible: boolean) => void
  onClose: () => void
}

const checkboxClass = "rounded border-gray-300 dark:border-gray-700"

function allVisible(provider: Provider, visibility: Map<string, ModelVisibility["visibility"]>) {
  return Object.values(provider.models).every((model) => isModelVisible(model, provider.id, visibility))
}

export function ManageModels({
  isOpen,
  providers,
  visibility,
  onToggle,
  onToggleProvider,
  onClose,
}: ManageModelsProps) {
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (isOpen) setSearchTerm("")
  }, [isOpen])

  const groups = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return providers
      .map((provider) => ({
        provider,
        models: Object.values(provider.models).filter(
          (model) => !query || model.name.toLowerCase().includes(query) || provider.name.toLowerCase().includes(query),
        ),
      }))
      .filter((group) => group.models.length > 0)
  }, [providers, searchTerm])

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalHeader onClose={onClose}>
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Manage models</h3>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          All models are shown by default; uncheck one to hide it from the picker.
        </p>
      </ModalHeader>
      <ModalBody>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search models..."
          className="w-full px-2 py-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
        />

        <div className="mt-2 max-h-[55vh] overflow-y-auto border border-gray-100 dark:border-gray-800 rounded">
          {groups.length === 0 ? (
            <div className="p-4 text-xs text-gray-500 dark:text-gray-400 text-center">No models found</div>
          ) : (
            groups.map(({ provider, models }) => (
              <div key={provider.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                <label className="px-3 py-1.5 flex items-center gap-2 bg-gray-50 dark:bg-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allVisible(provider, visibility)}
                    onChange={(e) => onToggleProvider(provider, e.target.checked)}
                    className={checkboxClass}
                  />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{provider.name}</span>
                </label>
                {models.map((model) => (
                  <label
                    key={model.id}
                    className="px-3 py-1.5 pl-8 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isModelVisible(model, provider.id, visibility)}
                      onChange={(e) => onToggle(provider.id, model.id, e.target.checked)}
                      className={checkboxClass}
                    />
                    <span className="text-xs text-gray-900 dark:text-gray-100 truncate">{model.name}</span>
                  </label>
                ))}
              </div>
            ))
          )}
        </div>
      </ModalBody>
    </Modal>
  )
}
