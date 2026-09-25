/**
 * OpenCode SDK facade used by the web UI.
 *
 * Server communication goes through the opencode v2 REST API (see `./v2`).
 * User preferences (recent/favorite models, UI state) are persisted by the IDE
 * plugin through the ideBridge channel, exactly like before.
 */

import { ideBridge } from "../ideBridge"
import { apiBase, setRequestDirectory } from "./v2/client"
import { v2Api } from "./v2/facade"
import type { ModelVisibility } from "../model-visibility"
import { applyEdits, modify, parse as parseJsonc } from "jsonc-parser"
import type { Config } from "@opencode-ai/sdk/client"

/** Absolute base URL of the opencode server (injected by the IDE plugin). */
export const serverBase: string = apiBase

/** Sets the project directory sent with every API request. */
export function setServerDirectory(directory: string | null | undefined) {
  setRequestDirectory(directory)
}

interface ModelEntry {
  providerID: string
  modelID: string
}

interface ModelPreferences {
  recent: ModelEntry[]
  favorite: ModelEntry[]
  variant?: Record<string, string>
  /** Explicit hide/show overrides for the model picker. */
  user?: ModelVisibility[]
}

const emptyPreferences: ModelPreferences = { recent: [], favorite: [], variant: {}, user: [] }

type AnyRecord = Record<string, any>

export const sdk = {
  ...v2Api,
  config: {
    ...v2Api.config,
    /**
     * opencode v2 has no config write endpoint, so the patch is merged into the global
     * opencode.json(c) by the IDE plugin. Only the keys handed in are touched and
     * jsonc-parser keeps the comments/formatting of the rest of the file intact.
     */
    update: async (options?: { body?: Record<string, unknown> }) => {
      if (!ideBridge.isInstalled())
        return {
          data: null as Config | null,
          error: { message: "Saving settings requires the IDE plugin" },
        }
      try {
        const patch = options?.body ?? {}
        const file = await ideBridge.request("config.read")
        const current = typeof file?.payload?.text === "string" ? file.payload.text : ""
        let text = current.trim() ? current : "{}"

        for (const [key, value] of Object.entries(patch)) {
          text = applyEdits(text, modify(text, [key], value, { formattingOptions: { tabSize: 2, insertSpaces: true } }))
        }

        await ideBridge.request("config.write", { text })
        return { data: (parseJsonc(text) ?? {}) as Config, error: null as { message: string } | null }
      } catch (error) {
        return {
          data: null as Config | null,
          error: { message: error instanceof Error ? error.message : "Unknown error" },
        }
      }
    },
  },
  model: {
    get: async () => {
      if (!ideBridge.isInstalled()) return { data: emptyPreferences, error: null as { message: string } | null }
      try {
        const res = await ideBridge.request("model.get")
        return { data: (res.payload ?? emptyPreferences) as ModelPreferences, error: null as { message: string } | null }
      } catch (error) {
        return {
          error: { message: error instanceof Error ? error.message : "Unknown error" },
          data: null as ModelPreferences | null,
        }
      }
    },
    update: async (options: { body: Partial<ModelPreferences> }) => {
      if (!ideBridge.isInstalled())
        return { data: null as ModelPreferences | null, error: { message: "IdeBridge not available" } }
      try {
        const res = await ideBridge.request("model.update", options.body)
        return { data: (res.payload ?? emptyPreferences) as ModelPreferences, error: null as { message: string } | null }
      } catch (error) {
        return {
          error: { message: error instanceof Error ? error.message : "Unknown error" },
          data: null as ModelPreferences | null,
        }
      }
    },
  },
  kv: {
    get: async () => {
      if (!ideBridge.isInstalled()) return { data: {} as AnyRecord, error: null as { message: string } | null }
      try {
        const res = await ideBridge.request("kv.get")
        return { data: (res.payload ?? {}) as AnyRecord, error: null as { message: string } | null }
      } catch (error) {
        return {
          error: { message: error instanceof Error ? error.message : "Unknown error" },
          data: null as AnyRecord | null,
        }
      }
    },
    update: async (options: { body: AnyRecord }) => {
      if (!ideBridge.isInstalled())
        return { data: null as AnyRecord | null, error: { message: "IdeBridge not available" } }
      try {
        const res = await ideBridge.request("kv.update", options.body)
        return { data: (res.payload ?? {}) as AnyRecord, error: null as { message: string } | null }
      } catch (error) {
        return {
          error: { message: error instanceof Error ? error.message : "Unknown error" },
          data: null as AnyRecord | null,
        }
      }
    },
  },
}
