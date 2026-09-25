import type { Model, Provider } from "@opencode-ai/sdk/client"

/**
 * The plugin maintains its own model visibility: every model of an enabled
 * provider is listed by default and can be hidden individually in the picker.
 */

export type ModelKey = { providerID: string; modelID: string }
export type ModelVisibility = ModelKey & { visibility: "show" | "hide" }

export function modelKey(input: ModelKey) {
  return `${input.providerID}:${input.modelID}`
}

/** Explicit hide/show overrides, keyed by `providerID:modelID`. */
export function visibilityMap(entries: readonly ModelVisibility[] = []) {
  const map = new Map<string, ModelVisibility["visibility"]>()
  for (const entry of entries) map.set(modelKey(entry), entry.visibility)
  return map
}

/** Every model is visible unless it has been hidden explicitly. */
export function isModelVisible(
  model: Model,
  providerID: string,
  visibility: Map<string, ModelVisibility["visibility"]>,
) {
  return visibility.get(modelKey({ providerID, modelID: model.id })) !== "hide"
}

/** Providers with only their visible models; providers without visible models are dropped. */
export function visibleProviders(
  providers: readonly Provider[],
  visibility: Map<string, ModelVisibility["visibility"]>,
) {
  return providers.flatMap((provider) => {
    const models = Object.fromEntries(
      Object.entries(provider.models).filter(([, model]) => isModelVisible(model, provider.id, visibility)),
    )
    if (Object.keys(models).length === 0) return []
    return [{ ...provider, models }]
  })
}
