import { describe, expect, it } from "vitest"
import type { Provider } from "@opencode-ai/sdk/client"
import { isModelVisible, modelKey, visibleProviders, visibilityMap } from "./model-visibility"

function provider(id: string, models: Array<{ id: string; name?: string }>): Provider {
  const owned: Record<string, unknown> = {}
  for (const model of models) {
    owned[model.id] = { id: model.id, name: model.name ?? model.id, providerID: id }
  }
  return { id, name: id, source: "config", env: [], options: {}, models: owned } as unknown as Provider
}

describe("model visibility", () => {
  it("shows every model by default", () => {
    const providers = [provider("p", [{ id: "a" }, { id: "b" }])]
    const visibility = visibilityMap()

    expect(isModelVisible(providers[0].models.a, "p", visibility)).toBe(true)
    expect(isModelVisible(providers[0].models.b, "p", visibility)).toBe(true)
    expect(Object.keys(visibleProviders(providers, visibility)[0].models)).toEqual(["a", "b"])
  })

  it("hides explicitly hidden models only", () => {
    const providers = [provider("p", [{ id: "a" }, { id: "b" }])]
    const visibility = visibilityMap([{ providerID: "p", modelID: "b", visibility: "hide" }])

    expect(isModelVisible(providers[0].models.a, "p", visibility)).toBe(true)
    expect(isModelVisible(providers[0].models.b, "p", visibility)).toBe(false)
    expect(Object.keys(visibleProviders(providers, visibility)[0].models)).toEqual(["a"])
  })

  it("keys overrides by provider and model", () => {
    const providers = [provider("p", [{ id: "a" }]), provider("q", [{ id: "a" }])]
    const visibility = visibilityMap([{ providerID: "q", modelID: "a", visibility: "hide" }])

    expect(isModelVisible(providers[0].models.a, "p", visibility)).toBe(true)
    expect(isModelVisible(providers[1].models.a, "q", visibility)).toBe(false)
    expect(visibleProviders(providers, visibility).map((item) => item.id)).toEqual(["p"])
    expect(modelKey({ providerID: "q", modelID: "a" })).toBe("q:a")
  })

  it("drops providers whose models are all hidden", () => {
    const providers = [provider("p", [{ id: "a" }]), provider("q", [{ id: "b" }])]
    const visibility = visibilityMap([{ providerID: "p", modelID: "a", visibility: "hide" }])

    expect(visibleProviders(providers, visibility).map((item) => item.id)).toEqual(["q"])
  })
})
