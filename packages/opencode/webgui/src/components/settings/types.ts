import type { Config } from "@opencode-ai/sdk/client"
import type { V2SettingsConfig } from "../../lib/api/v2/types"

/**
 * Settings form state: the legacy config shape plus the opencode v2 fields
 * (update/snapshots/plugins/...) the settings panel edits.
 */
export type SettingsFormData = Partial<Config> & V2SettingsConfig

export type SetSettingsFormData = (data: SettingsFormData) => void
