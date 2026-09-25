/**
 * Helpers for the provider enable/disable state that opencode keeps in its config.
 *
 * The v2 server accepts the legacy `disabled_providers` array and normalizes it to
 * `experimental.policies` (`provider.use` + `deny`) in `/api/config`, so both shapes
 * have to be understood when reading the effective configuration.
 */

export function disabledProviderIds(config: Record<string, unknown>) {
  const denied = new Set<string>()

  const disabled = config.disabled_providers
  if (Array.isArray(disabled)) {
    for (const id of disabled) if (typeof id === "string") denied.add(id)
  }

  const experimental = config.experimental
  const policies =
    experimental && typeof experimental === "object" ? (experimental as Record<string, unknown>).policies : undefined
  if (Array.isArray(policies)) {
    for (const item of policies) {
      if (!item || typeof item !== "object") continue
      const policy = item as Record<string, unknown>
      if (policy.action === "provider.use" && policy.effect === "deny" && typeof policy.resource === "string") {
        denied.add(policy.resource)
      }
    }
  }

  return [...denied]
}
